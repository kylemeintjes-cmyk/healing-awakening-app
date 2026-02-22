import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

const root = process.cwd();
const benchmarkFile = join(root, "training", "benchmarks", "oracle-benchmark.json");
const outDir = join(root, "training", "benchmarks", "results");

const baseUrl = process.env.LOCAL_LLM_BASE_URL ?? "http://127.0.0.1:1234/v1";
const model = process.env.LOCAL_LLM_MODEL ?? "kyle_oracle_merged.Q8_0.gguf";
const compareModel = process.env.ORACLE_COMPARE_MODEL ?? "";

function loadBenchmarks() {
  if (!existsSync(benchmarkFile)) {
    throw new Error(`Benchmark file not found: ${benchmarkFile}`);
  }
  return JSON.parse(readFileSync(benchmarkFile, "utf8"));
}

function countAny(text, terms) {
  const t = (text ?? "").toLowerCase();
  return terms.some((term) => t.includes(String(term).toLowerCase()));
}

function scoreResponse(item, content) {
  const text = (content ?? "").toLowerCase();
  let score = 0;
  const checks = [];

  if (countAny(text, item.required_terms_any ?? [])) {
    score += 1;
    checks.push("required_terms");
  }

  const hasPractice = text.includes("practice:");
  if (hasPractice) {
    score += 1;
    checks.push("practice_block");
  }

  const hasQuestion = text.includes("question:");
  if (hasQuestion) {
    score += 1;
    checks.push("question_block");
  }

  const asksAstro =
    text.includes("birth date") || text.includes("birth time") || text.includes("birth place");
  if (item.should_ask_when_missing_astro) {
    if (asksAstro) {
      score += 1;
      checks.push("asks_for_astro_data");
    }
  } else {
    score += 1;
    checks.push("astro_not_required");
  }

  const safe =
    !text.includes("i guarantee") &&
    !text.includes("you definitely") &&
    !text.includes("certainly");
  if (safe) {
    score += 1;
    checks.push("safe_language");
  }

  return { score, checks };
}

async function runOne(modelName, item) {
  const system = [
    "You are a mystical but grounded oracle.",
    "Return concise text with this exact structure:",
    "Mirror, three bullet insights, Practice:, Question:.",
    "Use safe non-deterministic language.",
  ].join(" ");

  const user = [
    `Prompt: ${item.prompt}`,
    "Birth date: missing",
    "Birth time: missing",
    "Birth place: missing",
  ].join("\n");

  const started = performance.now();
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: modelName,
      temperature: 0.4,
      max_tokens: 140,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const ended = performance.now();
  if (!response.ok) {
    return {
      id: item.id,
      ok: false,
      error: `HTTP ${response.status}`,
      latencyMs: Math.round(ended - started),
    };
  }
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content ?? "";
  const evalResult = scoreResponse(item, content);
  return {
    id: item.id,
    category: item.category,
    ok: true,
    latencyMs: Math.round(ended - started),
    output: content,
    score: evalResult.score,
    checks: evalResult.checks,
    usage: payload?.usage ?? {},
    timings: payload?.timings ?? {},
  };
}

async function runSuite(modelName, benchmarks) {
  const results = [];
  for (const item of benchmarks) {
    // Sequential on purpose to keep benchmark stable on one local server.
    // eslint-disable-next-line no-await-in-loop
    results.push(await runOne(modelName, item));
  }
  const okRows = results.filter((r) => r.ok);
  const avgLatencyMs =
    okRows.length > 0
      ? Math.round(okRows.reduce((sum, r) => sum + (r.latencyMs ?? 0), 0) / okRows.length)
      : null;
  const avgScore =
    okRows.length > 0
      ? Number((okRows.reduce((sum, r) => sum + (r.score ?? 0), 0) / okRows.length).toFixed(2))
      : null;

  return {
    model: modelName,
    count: results.length,
    avgLatencyMs,
    avgScore,
    results,
  };
}

async function main() {
  const benchmarks = loadBenchmarks();
  mkdirSync(outDir, { recursive: true });

  const primary = await runSuite(model, benchmarks);
  const compare = compareModel ? await runSuite(compareModel, benchmarks) : null;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = join(outDir, `oracle-benchmark-${stamp}.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    primary,
    compare,
  };

  writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Benchmark written to ${outputPath}`);
  console.log(`Primary avg score: ${primary.avgScore}, avg latency ms: ${primary.avgLatencyMs}`);
  if (compare) {
    console.log(`Compare avg score: ${compare.avgScore}, avg latency ms: ${compare.avgLatencyMs}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
