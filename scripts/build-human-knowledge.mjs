import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, relative, extname, basename } from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const trainingDir = join(root, "training");
const humanDir = join(trainingDir, "human_os");
const sourcesDir = join(humanDir, "sources");
const factorsPath = join(humanDir, "wellbeing_factors.json");
const outPath = join(humanDir, "knowledge.chunks.jsonl");
const reportPath = join(humanDir, "knowledge.report.json");

const MAX_CHARS = Number(process.env.HUMAN_KNOWLEDGE_CHUNK_CHARS ?? 1200);
const OVERLAP_CHARS = Number(process.env.HUMAN_KNOWLEDGE_OVERLAP_CHARS ?? 180);

function walkFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function extractTextFromUnknownJson(value, keyHint = "", out = []) {
  if (value == null) return out;
  if (typeof value === "string") {
    const hint = keyHint.toLowerCase();
    if (hint.includes("text") || hint.includes("content") || hint.includes("body") || hint.includes("transcript") || hint.includes("caption")) {
      out.push(value);
    } else if (value.length > 80) {
      out.push(value);
    }
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) extractTextFromUnknownJson(item, keyHint, out);
    return out;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      extractTextFromUnknownJson(v, k, out);
    }
  }
  return out;
}

function normalizeText(raw) {
  return raw
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function splitIntoChunks(text, maxChars, overlapChars) {
  const cleaned = normalizeText(text);
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) return [cleaned];

  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + maxChars, cleaned.length);
    if (end < cleaned.length) {
      const breakAt = cleaned.lastIndexOf("\n", end);
      if (breakAt > start + Math.floor(maxChars * 0.6)) {
        end = breakAt;
      } else {
        const sentenceBreak = Math.max(
          cleaned.lastIndexOf(". ", end),
          cleaned.lastIndexOf("! ", end),
          cleaned.lastIndexOf("? ", end),
        );
        if (sentenceBreak > start + Math.floor(maxChars * 0.6)) {
          end = sentenceBreak + 1;
        }
      }
    }
    const chunk = cleaned.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= cleaned.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }
  return chunks;
}

function estimateTokens(text) {
  return Math.round(text.length / 4);
}

function loadFactors(path) {
  const fallback = [];
  if (!existsSync(path)) return fallback;
  const parsed = readJsonSafe(path);
  if (!Array.isArray(parsed)) return fallback;
  return parsed.filter((item) => typeof item === "object" && typeof item?.id === "string");
}

function inferTags(text, factors) {
  const lower = text.toLowerCase();
  const tags = new Set();
  for (const factor of factors) {
    const keywords = Array.isArray(factor?.keywords) ? factor.keywords : [];
    if (keywords.some((keyword) => lower.includes(String(keyword).toLowerCase()))) {
      tags.add(factor.id);
    }
  }
  if (lower.includes("goal") || lower.includes("purpose")) tags.add("goal-direction");
  if (lower.includes("execute") || lower.includes("procrastin")) tags.add("execution");
  if (lower.includes("stress") || lower.includes("anxiety")) tags.add("stress-regulation");
  if (lower.includes("income") || lower.includes("money")) tags.add("income");
  return [...tags];
}

function readSourceText(filePath) {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".txt" || extension === ".md" || extension === ".markdown") {
    return readFileSync(filePath, "utf8");
  }
  if (extension === ".json") {
    const parsed = readJsonSafe(filePath);
    return extractTextFromUnknownJson(parsed).join("\n\n");
  }
  if (extension === ".jsonl") {
    const rows = readFileSync(filePath, "utf8")
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
    return rows.map((row) => extractTextFromUnknownJson(row).join("\n")).join("\n\n");
  }
  return "";
}

function detectSourceType(filePath) {
  const rel = relative(sourcesDir, filePath).replace(/\\/g, "/").toLowerCase();
  if (rel.startsWith("books/")) return "book";
  if (rel.startsWith("transcripts/")) return "transcript";
  return "general";
}

const factors = loadFactors(factorsPath);
const files = walkFiles(sourcesDir).filter((filePath) =>
  [".txt", ".md", ".markdown", ".json", ".jsonl"].includes(extname(filePath).toLowerCase()),
);

const rows = [];
const seen = new Set();

for (const filePath of files) {
  const sourceText = readSourceText(filePath);
  if (!sourceText.trim()) continue;
  const chunks = splitIntoChunks(sourceText, MAX_CHARS, OVERLAP_CHARS);
  const sourceType = detectSourceType(filePath);
  const sourceName = basename(filePath);

  chunks.forEach((chunk, index) => {
    const hash = createHash("sha1").update(chunk).digest("hex").slice(0, 12);
    if (seen.has(hash)) return;
    seen.add(hash);
    rows.push({
      id: `${sourceType}-${index}-${hash}`,
      sourceType,
      sourceName,
      sourcePath: relative(root, filePath).replace(/\\/g, "/"),
      chunkIndex: index,
      text: chunk,
      tags: inferTags(chunk, factors),
      tokenEstimate: estimateTokens(chunk),
      createdAt: new Date().toISOString(),
    });
  });
}

mkdirSync(humanDir, { recursive: true });
writeFileSync(outPath, rows.map((row) => JSON.stringify(row)).join("\n"), "utf8");

const report = {
  generatedAt: new Date().toISOString(),
  sourceFiles: files.length,
  chunkRows: rows.length,
  maxChars: MAX_CHARS,
  overlapChars: OVERLAP_CHARS,
  output: outPath,
};
writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log(`Built ${rows.length} knowledge chunks at ${outPath}`);
console.log(`Report: ${reportPath}`);
