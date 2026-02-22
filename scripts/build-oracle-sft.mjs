import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const logsDir = join(root, "logs");
const trainingDir = join(root, "training");
const corpusDir = join(trainingDir, "mystical_corpus");
const runsPath = join(logsDir, "oracle-runs.jsonl");
const feedbackPath = join(logsDir, "oracle-feedback.jsonl");
const outPath = join(trainingDir, "oracle-sft.merged.jsonl");
const reportPath = join(trainingDir, "oracle-sft.report.json");

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
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

function hasUsefulAnswer(text) {
  if (typeof text !== "string") return false;
  const t = text.trim().toLowerCase();
  if (t.length < 60) return false;
  const banned = ["i don't know", "as an ai language model"];
  return !banned.some((b) => t.includes(b));
}

const corpusFiles = existsSync(corpusDir)
  ? readdirSync(corpusDir).filter((name) => name.toLowerCase().endsWith(".jsonl"))
  : [];
const corpusRows = corpusFiles.flatMap((fileName) => readJsonl(join(corpusDir, fileName)));
const runs = readJsonl(runsPath);
const feedback = readJsonl(feedbackPath);

const helpfulTraceIds = new Set(
  feedback.filter((row) => row.rating === "helpful" && row.traceId).map((row) => row.traceId),
);

const rowsFromFeedback = runs
  .filter((run) => helpfulTraceIds.has(run.traceId))
  .filter((run) => hasUsefulAnswer(run.reply))
  .map((run) => {
    const system = "You are a mystical but grounded oracle. Use specific, safe, actionable language.";
    const userPrompt = [
      `User message: ${run.message ?? ""}`,
      `Intent: ${run.intent ?? "general"}`,
      `Style: ${run.style ?? "mystic"}`,
      `Context intensity: ${run.preferredIntensity ?? "medium"}`,
    ].join("\n");
    return {
      id: `feedback-${run.traceId}`,
      tradition: "mixed",
      topic: run.intent === "gift_discovery" ? "gifts" : "general",
      tone: run.style ?? "mystic",
      source: "oracle_feedback",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
        { role: "assistant", content: run.reply ?? "" },
      ],
      tags: ["feedback_approved"],
    };
  });

const merged = [...corpusRows, ...rowsFromFeedback];
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
  corpusRows: corpusRows.length,
  corpusFiles,
  helpfulFeedbackRows: rowsFromFeedback.length,
  finalRows: deduped.length,
  output: outPath,
};
writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log(`Built ${deduped.length} rows at ${outPath}`);
console.log(`Report: ${reportPath}`);
