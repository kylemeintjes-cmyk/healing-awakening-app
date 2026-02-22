import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { appendOracleJsonLine } from "@/lib/oracle-logs";

type Body = {
  planId?: string;
  completedActions?: number;
  outreachCount?: number;
  proposalCount?: number;
  closedDeals?: number;
  revenueGenerated?: number;
  blockerNote?: string;
};

export async function POST(request: Request) {
  const user = await requireUser(request as any);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Body;
  if (!body.planId) return NextResponse.json({ error: "planId is required." }, { status: 400 });

  const completedActions = Math.max(0, Number(body.completedActions ?? 0));
  const outreachCount = Math.max(0, Number(body.outreachCount ?? 0));
  const proposalCount = Math.max(0, Number(body.proposalCount ?? 0));
  const closedDeals = Math.max(0, Number(body.closedDeals ?? 0));
  const revenueGenerated = Math.max(0, Number(body.revenueGenerated ?? 0));

  const executionScore = Math.min(100, completedActions * 12 + outreachCount * 2 + proposalCount * 4 + closedDeals * 10);
  const adjustment =
    executionScore < 35
      ? "Cut scope by 30%, run one micro-offer, and target 10 outreach/day for 5 days."
      : executionScore < 65
      ? "Keep current offer, improve message quality, and add one follow-up cycle."
      : "Increase price test by 10-15% and protect delivery quality.";

  try {
    await appendOracleJsonLine("capital-checkins.jsonl", {
      createdAt: new Date().toISOString(),
      userId: user.uid,
      planId: body.planId,
      completedActions,
      outreachCount,
      proposalCount,
      closedDeals,
      revenueGenerated,
      blockerNote: body.blockerNote ?? "",
      executionScore,
      adjustment,
    });
  } catch {
    // non-blocking
  }

  return NextResponse.json({
    ok: true,
    executionScore,
    adjustment,
  });
}
