import { readFile } from "node:fs/promises";
import { join } from "node:path";

type OracleFeedbackRow = {
  userId?: string;
  traceId?: string | null;
  rating?: "helpful" | "not_helpful";
  action?: string;
  lifeArea?: string;
};

type OracleCommitmentRow = {
  userId?: string;
  createdAt?: string;
  optionId?: string;
  optionTitle?: string;
  lifeArea?: string;
};

export type OracleUserMemory = {
  helpfulRate: number | null;
  totalFeedback: number;
  preferredActions: string[];
  preferredLifeAreas: string[];
  recentCommitments: Array<{
    createdAt: string;
    optionId: string;
    optionTitle: string;
    lifeArea: string;
  }>;
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

function topKeys(counts: Record<string, number>, take = 3) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([key]) => key);
}

export async function getUserOracleMemory(userId: string): Promise<OracleUserMemory> {
  const [feedbackRows, commitmentRows] = await Promise.all([
    readJsonLines<OracleFeedbackRow>("oracle-feedback.jsonl"),
    readJsonLines<OracleCommitmentRow>("oracle-commitments.jsonl"),
  ]);

  const userFeedback = feedbackRows.filter((row) => row.userId === userId);
  const helpfulCount = userFeedback.filter((row) => row.rating === "helpful").length;
  const totalFeedback = userFeedback.length;
  const helpfulRate = totalFeedback > 0 ? helpfulCount / totalFeedback : null;

  const helpfulOnly = userFeedback.filter((row) => row.rating === "helpful");
  const actionCounts: Record<string, number> = {};
  const areaCounts: Record<string, number> = {};
  for (const row of helpfulOnly) {
    const action = row.action?.trim();
    const area = row.lifeArea?.trim();
    if (action) actionCounts[action] = (actionCounts[action] ?? 0) + 1;
    if (area) areaCounts[area] = (areaCounts[area] ?? 0) + 1;
  }

  const recentCommitments = commitmentRows
    .filter((row) => row.userId === userId)
    .filter((row) => row.createdAt && row.optionId && row.optionTitle)
    .slice(-5)
    .reverse()
    .map((row) => ({
      createdAt: row.createdAt!,
      optionId: row.optionId!,
      optionTitle: row.optionTitle!,
      lifeArea: row.lifeArea ?? "general",
    }));

  return {
    helpfulRate,
    totalFeedback,
    preferredActions: topKeys(actionCounts, 3),
    preferredLifeAreas: topKeys(areaCounts, 3),
    recentCommitments,
  };
}
