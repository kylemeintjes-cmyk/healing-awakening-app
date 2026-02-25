import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const trainingDir = join(root, "training");
const humanDir = join(trainingDir, "human_os");
const manualExamplesPath = join(humanDir, "examples.manual.jsonl");
const factorsPath = join(humanDir, "wellbeing_factors.json");
const knowledgePath = join(humanDir, "knowledge.chunks.jsonl");
const outPath = join(trainingDir, "human-os-sft.jsonl");
const reportPath = join(trainingDir, "human-os-sft.report.json");

const INCLUDE_SOURCE_TEXT = process.env.HUMAN_SFT_INCLUDE_SOURCE_TEXT === "true";
const MAX_KNOWLEDGE_ROWS = Number(process.env.HUMAN_SFT_MAX_KNOWLEDGE_ROWS ?? 120);

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
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

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function isValidSftRow(row) {
  if (!row || typeof row !== "object") return false;
  if (!Array.isArray(row.messages) || row.messages.length < 3) return false;
  return row.messages.every(
    (message) =>
      message &&
      typeof message === "object" &&
      (message.role === "system" || message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" &&
      message.content.trim().length > 0,
  );
}

function cleanAssistantText(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSystemPrompt() {
  return [
    "You are Human OS: a direct, actionable, evidence-aware performance and wellbeing coach.",
    "Focus on measurable changes in clarity, execution, emotional stability, income confidence, and life satisfaction.",
    "Never give vague inspiration. Always provide concrete next actions and measurement criteria.",
    "Use strong direction, but do not claim certainty where evidence is limited.",
  ].join(" ");
}

function buildFactorRows(factors) {
  if (!Array.isArray(factors)) return [];
  const system = buildSystemPrompt();
  const rows = [];
  for (const factor of factors) {
    if (!factor || typeof factor !== "object") continue;
    const name = String(factor.name ?? factor.id ?? "").trim();
    if (!name) continue;
    const why = String(factor.whyItMatters ?? "").trim();
    const lowSignals = Array.isArray(factor.lowSignals) ? factor.lowSignals.map((item) => String(item)) : [];
    const actions = Array.isArray(factor.actions) ? factor.actions.map((item) => String(item)) : [];

    rows.push({
      id: `factor-${factor.id}-diagnostic`,
      domain: "human_os",
      source: "factor_templates",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `I think my ${name.toLowerCase()} is low. Signals: ${lowSignals.slice(0, 2).join("; ")}. Give me a practical protocol for today.`,
        },
        {
          role: "assistant",
          content: cleanAssistantText(
            [
              `Diagnosis: your current bottleneck appears to be ${name.toLowerCase()}.`,
              why ? `Why this matters: ${why}` : "",
              "Today protocol:",
              ...actions.slice(0, 3).map((item, index) => `${index + 1}. ${item}`),
              "Measurement: log completion of all 3 actions and rate shift in this factor by tonight (1-10).",
            ].filter(Boolean).join("\n"),
          ),
        },
      ],
      tags: ["factor", "actionable", String(factor.id ?? "general")],
    });

    rows.push({
      id: `factor-${factor.id}-weekly`,
      domain: "human_os",
      source: "factor_templates",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Build a 7-day plan to improve ${name.toLowerCase()} while keeping my execution high.`,
        },
        {
          role: "assistant",
          content: cleanAssistantText(
            [
              `7-day focus: ${name}.`,
              "Daily structure:",
              `- Morning: ${actions[0] ?? "run a short regulation and planning reset"}`,
              `- Midday: ${actions[1] ?? "execute one high-leverage work block"}`,
              `- Evening: ${actions[2] ?? "review outcomes and set tomorrow's first action"}`,
              "Weekly checkpoint: compare start vs end score (1-10) for this factor and adjust next week based on data.",
            ].join("\n"),
          ),
        },
      ],
      tags: ["factor", "weekly_plan", String(factor.id ?? "general")],
    });
  }
  return rows;
}

function buildKnowledgeRows(chunks) {
  if (!INCLUDE_SOURCE_TEXT || !Array.isArray(chunks)) return [];
  const system = buildSystemPrompt();
  return chunks.slice(0, MAX_KNOWLEDGE_ROWS).map((chunk, index) => {
    const excerpt = String(chunk.text ?? "").replace(/\s+/g, " ").trim().slice(0, 450);
    return {
      id: `knowledge-${index}`,
      domain: "human_os",
      source: "source_chunks",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Apply this principle to real life right now:\n${excerpt}`,
        },
        {
          role: "assistant",
          content: cleanAssistantText(
            [
              "Core principle: identify one idea from this passage that changes behavior today.",
              "Execution protocol:",
              "1. Convert the principle into one task you can complete in under 30 minutes.",
              "2. Attach that task to a specific time on your calendar today.",
              "3. Measure completion and effect on clarity/execution by end of day.",
              "If the principle does not improve outcomes in 7 days, replace it.",
            ].join("\n"),
          ),
        },
      ],
      tags: ["knowledge_application", ...(Array.isArray(chunk.tags) ? chunk.tags : [])],
    };
  });
}

const manualRows = readJsonl(manualExamplesPath).filter(isValidSftRow);
const factors = readJson(factorsPath);
const factorRows = buildFactorRows(factors);
const knowledgeRows = buildKnowledgeRows(readJsonl(knowledgePath));

const merged = [...manualRows, ...factorRows, ...knowledgeRows];
const deduped = [];
const seen = new Set();
for (const row of merged) {
  const key = JSON.stringify(row.messages);
  if (seen.has(key)) continue;
  seen.add(key);
  deduped.push(row);
}

mkdirSync(trainingDir, { recursive: true });
writeFileSync(outPath, deduped.map((row) => JSON.stringify(row)).join("\n"), "utf8");

const report = {
  generatedAt: new Date().toISOString(),
  includeSourceText: INCLUDE_SOURCE_TEXT,
  manualRows: manualRows.length,
  factorRows: factorRows.length,
  knowledgeRows: knowledgeRows.length,
  finalRows: deduped.length,
  output: outPath,
};
writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log(`Built ${deduped.length} rows at ${outPath}`);
console.log(`Report: ${reportPath}`);
