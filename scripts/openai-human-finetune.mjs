import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const root = process.cwd();
const trainingDir = join(root, "training");
const humanDir = join(trainingDir, "human_os");
const defaultTrainingFile = join(trainingDir, "human-os-sft.jsonl");
const statePath = join(humanDir, "last-finetune-job.json");
const normalizedTrainingPath = join(humanDir, "human-os-sft.openai.jsonl");
const normalizedValidationPath = join(humanDir, "human-os-validation.openai.jsonl");

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

const apiKey = process.env.OPENAI_API_KEY;
const model = getArg("--model") || process.env.HUMAN_FT_BASE_MODEL;
const trainingFilePath = getArg("--training-file") || defaultTrainingFile;
const validationFilePath = getArg("--validation-file") || null;
const suffix = getArg("--suffix") || process.env.HUMAN_FT_SUFFIX || null;

if (!apiKey) {
  console.error("Missing OPENAI_API_KEY.");
  process.exit(1);
}

if (!model) {
  console.error("Missing base model. Use --model <model_id> or set HUMAN_FT_BASE_MODEL.");
  process.exit(1);
}

if (!existsSync(trainingFilePath)) {
  console.error(`Training file not found: ${trainingFilePath}`);
  process.exit(1);
}

function parseJsonl(filePath) {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function normalizeRole(value) {
  if (value === "system" || value === "user" || value === "assistant") return value;
  return null;
}

function normalizeRow(row) {
  const messages = Array.isArray(row?.messages) ? row.messages : null;
  if (!messages || messages.length < 2) return null;
  const normalizedMessages = [];
  for (const message of messages) {
    const role = normalizeRole(message?.role);
    const content = typeof message?.content === "string" ? message.content.trim() : "";
    if (!role || !content) continue;
    normalizedMessages.push({ role, content });
  }
  if (normalizedMessages.length < 2) return null;
  return { messages: normalizedMessages };
}

function buildOpenAiFile(inputPath, outputPath) {
  const rows = parseJsonl(inputPath);
  const normalized = [];
  for (const row of rows) {
    const value = normalizeRow(row);
    if (value) normalized.push(value);
  }
  if (normalized.length === 0) {
    throw new Error(`No valid rows after normalization from ${inputPath}`);
  }
  mkdirSync(humanDir, { recursive: true });
  writeFileSync(outputPath, normalized.map((row) => JSON.stringify(row)).join("\n"), "utf8");
  return { rowsIn: rows.length, rowsOut: normalized.length, outputPath };
}

async function uploadFile(filePath) {
  const form = new FormData();
  form.set("purpose", "fine-tune");
  form.set(
    "file",
    new Blob([readFileSync(filePath)], { type: "application/jsonl" }),
    basename(filePath),
  );

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`File upload failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function createFineTuneJob(trainingFileId, validationFileId) {
  const payload = {
    model,
    training_file: trainingFileId,
  };
  if (validationFileId) payload.validation_file = validationFileId;
  if (suffix) payload.suffix = suffix;

  const response = await fetch("https://api.openai.com/v1/fine_tuning/jobs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Fine-tune job creation failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const trainingNormalized = buildOpenAiFile(trainingFilePath, normalizedTrainingPath);
  console.log(`Normalized training rows: ${trainingNormalized.rowsOut}/${trainingNormalized.rowsIn}`);
  console.log(`Uploading training file: ${trainingNormalized.outputPath}`);
  const trainingFile = await uploadFile(trainingNormalized.outputPath);
  let validationFile = null;
  let validationNormalized = null;

  if (validationFilePath) {
    if (!existsSync(validationFilePath)) {
      throw new Error(`Validation file not found: ${validationFilePath}`);
    }
    validationNormalized = buildOpenAiFile(validationFilePath, normalizedValidationPath);
    console.log(`Normalized validation rows: ${validationNormalized.rowsOut}/${validationNormalized.rowsIn}`);
    console.log(`Uploading validation file: ${validationNormalized.outputPath}`);
    validationFile = await uploadFile(validationNormalized.outputPath);
  }

  console.log(`Creating fine-tune job on model: ${model}`);
  const job = await createFineTuneJob(trainingFile.id, validationFile?.id ?? null);

  mkdirSync(humanDir, { recursive: true });
  writeFileSync(
    statePath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        model,
        trainingFile,
        validationFile,
        trainingNormalized,
        validationNormalized,
        job,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("Fine-tune job created.");
  console.log(`Job ID: ${job.id}`);
  console.log(`Status: ${job.status}`);
  console.log(`Saved: ${statePath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
