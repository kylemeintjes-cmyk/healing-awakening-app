import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  buildHumanDecisionRecord,
  normalizeHumanDecisionInput,
  type HumanDecisionInput,
} from "@/lib/human-engine";
import { appendHumanDecision, getHumanDecisionsForUser } from "@/lib/human-storage";

type Body = Partial<HumanDecisionInput>;

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decisions = await getHumanDecisionsForUser(user.uid, 200);
  return NextResponse.json({ ok: true, decisions });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Body;
  const input = normalizeHumanDecisionInput(body);
  const decision = buildHumanDecisionRecord(user.uid, input);
  if (!decision) {
    return NextResponse.json(
      { error: "Decision requires a title and at least 2 options." },
      { status: 400 },
    );
  }
  await appendHumanDecision(user.uid, decision);

  return NextResponse.json({ ok: true, decision });
}
