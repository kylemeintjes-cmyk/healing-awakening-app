import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { appendOracleJsonLine } from "@/lib/oracle-logs";

type CommitBody = {
  traceId?: string;
  optionId?: string;
  optionTitle?: string;
  lifeArea?: string;
  notes?: string;
};

export async function POST(request: Request) {
  const user = await requireUser(request as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CommitBody;
  if (!body.optionId || !body.optionTitle) {
    return NextResponse.json({ error: "optionId and optionTitle are required." }, { status: 400 });
  }

  try {
    await appendOracleJsonLine("oracle-commitments.jsonl", {
      createdAt: new Date().toISOString(),
      userId: user.uid,
      traceId: body.traceId ?? null,
      optionId: body.optionId,
      optionTitle: body.optionTitle,
      lifeArea: body.lifeArea ?? "general",
      notes: body.notes ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Unable to save commitment." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
