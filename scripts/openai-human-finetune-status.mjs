import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const statePath = join(root, "training", "human_os", "last-finetune-job.json");

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY.");
  process.exit(1);
}

let jobId = getArg("--job-id");
if (!jobId && existsSync(statePath)) {
  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8"));
    jobId = parsed?.job?.id ?? null;
  } catch {
    jobId = null;
  }
}

if (!jobId) {
  console.error("Missing job id. Pass --job-id <id> or run human:ft:start first.");
  process.exit(1);
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const job = await getJson(`https://api.openai.com/v1/fine_tuning/jobs/${jobId}`);
  const events = await getJson(
    `https://api.openai.com/v1/fine_tuning/jobs/${jobId}/events?limit=20`,
  );

  console.log(`Job: ${job.id}`);
  console.log(`Status: ${job.status}`);
  console.log(`Base model: ${job.model}`);
  console.log(`Fine-tuned model: ${job.fine_tuned_model ?? "pending"}`);
  console.log(`Created at: ${job.created_at}`);

  console.log("\nRecent events:");
  const items = Array.isArray(events?.data) ? events.data : [];
  for (const event of items) {
    const ts = event?.created_at ? new Date(event.created_at * 1000).toISOString() : "n/a";
    console.log(`- [${ts}] ${event?.message ?? "no message"}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
