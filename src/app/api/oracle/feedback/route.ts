import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { appendOracleJsonLine } from "@/lib/oracle-logs";

type FeedbackBody = {
  traceId?: string;
  message?: string;
  reply?: string;
  rating?: "helpful" | "not_helpful";
  notes?: string;
  surface?: string;
  action?: string;
  lifeArea?: string;
};

export async function POST(request: Request) {
  const user = await requireUser(request as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as FeedbackBody;

  if (!body.rating || (body.rating !== "helpful" && body.rating !== "not_helpful")) {
    return NextResponse.json({ error: "Invalid rating." }, { status: 400 });
  }

  try {
    await appendOracleJsonLine("oracle-feedback.jsonl", {
      createdAt: new Date().toISOString(),
      userId: user.uid,
      traceId: body.traceId ?? null,
      rating: body.rating,
      notes: body.notes ?? "",
      surface: body.surface ?? "unknown",
      action: body.action ?? null,
      lifeArea: body.lifeArea ?? "general",
      message: body.message ?? "",
      reply: body.reply ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Unable to record feedback." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
