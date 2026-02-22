import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { appendOracleJsonLine } from "@/lib/oracle-logs";
import type { JoyCheckinRecord, JoyWeeklyPlan } from "@/lib/joy-engine";

type JoyCheckinRow = {
  userId?: string;
  createdAt?: string;
  entry?: JoyCheckinRecord;
};

type JoyPlanRow = {
  userId?: string;
  createdAt?: string;
  plan?: JoyWeeklyPlan;
};

async function readJsonLines<T>(fileName: string): Promise<T[]> {
  try {
    const fullPath = join(process.cwd(), "logs", fileName);
    const raw = await readFile(fullPath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

function asTimestamp(value: string | undefined) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function appendJoyCheckin(userId: string, entry: JoyCheckinRecord) {
  await appendOracleJsonLine("joy-checkins.jsonl", {
    userId,
    createdAt: new Date().toISOString(),
    entry,
  });
}

export async function appendJoyPlan(userId: string, plan: JoyWeeklyPlan) {
  await appendOracleJsonLine("joy-plans.jsonl", {
    userId,
    createdAt: new Date().toISOString(),
    plan,
  });
}

export async function getJoyCheckinsForUser(userId: string, limit = 120): Promise<JoyCheckinRecord[]> {
  const rows = await readJsonLines<JoyCheckinRow>("joy-checkins.jsonl");
  return rows
    .filter((row) => row.userId === userId && row.entry)
    .map((row) => row.entry as JoyCheckinRecord)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, Math.max(1, limit));
}

export async function getLatestJoyPlanForUser(userId: string): Promise<JoyWeeklyPlan | null> {
  const rows = await readJsonLines<JoyPlanRow>("joy-plans.jsonl");
  const candidate = rows
    .filter((row) => row.userId === userId && row.plan)
    .sort((a, b) => asTimestamp(b.createdAt) - asTimestamp(a.createdAt))[0];
  return candidate?.plan ?? null;
}
