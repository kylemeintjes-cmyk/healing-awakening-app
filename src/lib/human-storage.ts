import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { appendOracleJsonLine } from "@/lib/oracle-logs";
import type {
  HumanCheckinRecord,
  HumanDecisionRecord,
  HumanProblemMap,
  HumanWeeklyPlan,
} from "@/lib/human-engine";

type HumanCheckinRow = {
  userId?: string;
  createdAt?: string;
  entry?: HumanCheckinRecord;
};

type HumanPlanRow = {
  userId?: string;
  createdAt?: string;
  plan?: HumanWeeklyPlan;
};

type HumanDiagnosticRow = {
  userId?: string;
  createdAt?: string;
  problemMap?: HumanProblemMap;
};

type HumanDecisionRow = {
  userId?: string;
  createdAt?: string;
  decision?: HumanDecisionRecord;
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

export async function appendHumanCheckin(userId: string, entry: HumanCheckinRecord) {
  await appendOracleJsonLine("human-checkins.jsonl", {
    userId,
    createdAt: new Date().toISOString(),
    entry,
  });
}

export async function appendHumanPlan(userId: string, plan: HumanWeeklyPlan) {
  await appendOracleJsonLine("human-plans.jsonl", {
    userId,
    createdAt: new Date().toISOString(),
    plan,
  });
}

export async function appendHumanDiagnostic(userId: string, problemMap: HumanProblemMap) {
  await appendOracleJsonLine("human-diagnostics.jsonl", {
    userId,
    createdAt: new Date().toISOString(),
    problemMap,
  });
}

export async function appendHumanDecision(userId: string, decision: HumanDecisionRecord) {
  await appendOracleJsonLine("human-decisions.jsonl", {
    userId,
    createdAt: new Date().toISOString(),
    decision,
  });
}

export async function getHumanCheckinsForUser(userId: string, limit = 120): Promise<HumanCheckinRecord[]> {
  const rows = await readJsonLines<HumanCheckinRow>("human-checkins.jsonl");
  return rows
    .filter((row) => row.userId === userId && row.entry)
    .map((row) => row.entry as HumanCheckinRecord)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, Math.max(1, limit));
}

export async function getLatestHumanPlanForUser(userId: string): Promise<HumanWeeklyPlan | null> {
  const rows = await readJsonLines<HumanPlanRow>("human-plans.jsonl");
  const candidate = rows
    .filter((row) => row.userId === userId && row.plan)
    .sort((a, b) => asTimestamp(b.createdAt) - asTimestamp(a.createdAt))[0];
  return candidate?.plan ?? null;
}

export async function getLatestHumanDiagnosticForUser(userId: string): Promise<HumanProblemMap | null> {
  const rows = await readJsonLines<HumanDiagnosticRow>("human-diagnostics.jsonl");
  const candidate = rows
    .filter((row) => row.userId === userId && row.problemMap)
    .sort((a, b) => asTimestamp(b.createdAt) - asTimestamp(a.createdAt))[0];
  return candidate?.problemMap ?? null;
}

export async function getHumanDecisionsForUser(userId: string, limit = 120): Promise<HumanDecisionRecord[]> {
  const rows = await readJsonLines<HumanDecisionRow>("human-decisions.jsonl");
  return rows
    .filter((row) => row.userId === userId && row.decision)
    .map((row) => row.decision as HumanDecisionRecord)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, Math.max(1, limit));
}
