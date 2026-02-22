import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { appendOracleJsonLine } from "@/lib/oracle-logs";
import { buildCapitalPlan, type CapitalProfile, type RiskTolerance } from "@/lib/capital-engine";

type Body = {
  goal?: string;
  topSkills?: string[];
  market?: string;
  hoursPerWeek?: number;
  monthlyExpenses?: number;
  cashReserve?: number;
  currentMonthlyRevenue?: number;
  riskTolerance?: RiskTolerance;
  narrative?: string;
};

function sanitize(body: Body): CapitalProfile | null {
  if (!body.goal?.trim()) return null;
  const hoursPerWeek = Number(body.hoursPerWeek ?? 0);
  const monthlyExpenses = Number(body.monthlyExpenses ?? 0);
  const cashReserve = Number(body.cashReserve ?? 0);
  const currentMonthlyRevenue = Number(body.currentMonthlyRevenue ?? 0);
  if (!Number.isFinite(hoursPerWeek) || !Number.isFinite(monthlyExpenses) || !Number.isFinite(cashReserve) || !Number.isFinite(currentMonthlyRevenue)) {
    return null;
  }
  const riskTolerance: RiskTolerance =
    body.riskTolerance === "low" || body.riskTolerance === "medium" || body.riskTolerance === "high"
      ? body.riskTolerance
      : "medium";

  return {
    goal: body.goal.trim(),
    topSkills: (body.topSkills ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 6),
    market: body.market?.trim() || "general",
    hoursPerWeek: Math.max(1, Math.round(hoursPerWeek)),
    monthlyExpenses: Math.max(0, monthlyExpenses),
    cashReserve: Math.max(0, cashReserve),
    currentMonthlyRevenue: Math.max(0, currentMonthlyRevenue),
    riskTolerance,
    narrative: body.narrative?.trim() ?? "",
  };
}

export async function POST(request: Request) {
  const user = await requireUser(request as any);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Body;
  const profile = sanitize(body);
  if (!profile) return NextResponse.json({ error: "Invalid capital profile." }, { status: 400 });

  const plan = buildCapitalPlan(profile);

  try {
    await appendOracleJsonLine("capital-plans.jsonl", {
      userId: user.uid,
      createdAt: new Date().toISOString(),
      plan,
    });
  } catch {
    // non-blocking
  }

  return NextResponse.json({ ok: true, plan });
}
