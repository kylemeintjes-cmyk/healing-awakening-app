import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { appendOracleJsonLine } from "@/lib/oracle-logs";

type Body = {
  planId?: string;
  wins?: string;
  losses?: string;
  lesson?: string;
  nextWeekFocus?: string;
};

export async function POST(request: Request) {
  const user = await requireUser(request as any);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Body;
  if (!body.planId) return NextResponse.json({ error: "planId is required." }, { status: 400 });

  const wins = body.wins?.trim() ?? "";
  const losses = body.losses?.trim() ?? "";
  const lesson = body.lesson?.trim() ?? "";
  const nextWeekFocus = body.nextWeekFocus?.trim() ?? "";

  const nextWeekProtocol = [
    "Pick one offer only; defer secondary ideas.",
    "Set daily outreach floor and track every conversation.",
    "Add one hard stop to prevent attention fragmentation.",
    nextWeekFocus ? `Primary focus: ${nextWeekFocus}` : "Primary focus: improve conversion from conversations to paid commitments.",
  ];

  try {
    await appendOracleJsonLine("capital-reviews.jsonl", {
      createdAt: new Date().toISOString(),
      userId: user.uid,
      planId: body.planId,
      wins,
      losses,
      lesson,
      nextWeekFocus,
      nextWeekProtocol,
    });
  } catch {
    // non-blocking
  }

  return NextResponse.json({ ok: true, nextWeekProtocol });
}
