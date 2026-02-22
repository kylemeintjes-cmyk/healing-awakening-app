import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const logsDir = join(process.cwd(), "logs");
const runsPath = join(logsDir, "oracle-runs.jsonl");
const feedbackPath = join(logsDir, "oracle-feedback.jsonl");
const outDir = join(process.cwd(), "training");
const outPath = join(outDir, "oracle-sft.jsonl");

function readJsonl(filePath) {
  if (!existsSync(filePath)) return [];
  const raw = readFileSync(filePath, "utf8");
  return raw
    .split("\n")
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

const runs = readJsonl(runsPath);
const feedback = readJsonl(feedbackPath);

const helpfulTraceIds = new Set(
  feedback.filter((item) => item.rating === "helpful" && item.traceId).map((item) => item.traceId),
);

const dataset = runs
  .filter((run) => helpfulTraceIds.has(run.traceId))
  .map((run) => {
    const prompt = [
      "You are a mystical but grounded oracle for wellbeing support.",
      `User message: ${run.message ?? ""}`,
      `Preferred intensity: ${run.preferredIntensity ?? "medium"}`,
      `Follow-up question: ${run.question ?? ""}`,
    ].join("\n");

    return {
      messages: [
        { role: "system", content: "You are a mystical but grounded oracle for wellbeing support." },
        { role: "user", content: prompt },
        { role: "assistant", content: run.reply ?? "" },
      ],
      meta: {
        traceId: run.traceId,
        createdAt: run.createdAt,
        model: run.model,
      },
    };
  });

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, dataset.map((item) => JSON.stringify(item)).join("\n"), "utf8");

console.log(`Exported ${dataset.length} rows to ${outPath}`);
