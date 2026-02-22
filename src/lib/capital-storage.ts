import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CapitalPlan } from "@/lib/capital-engine";

type CapitalPlanRow = {
  userId?: string;
  plan?: CapitalPlan;
};

function isCapitalPlan(value: unknown): value is CapitalPlan {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CapitalPlan>;
  return typeof candidate.planId === "string" && Array.isArray(candidate.opportunities);
}

export async function getLatestCapitalPlanForUser(userId: string): Promise<CapitalPlan | null> {
  try {
    const fullPath = join(process.cwd(), "logs", "capital-plans.jsonl");
    const raw = await readFile(fullPath, "utf8");
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const row = JSON.parse(lines[i]) as CapitalPlanRow;
        if (row.userId !== userId) continue;
        if (isCapitalPlan(row.plan)) return row.plan;
      } catch {
        // Skip malformed rows and continue scanning older records.
      }
    }
  } catch {
    return null;
  }

  return null;
}
