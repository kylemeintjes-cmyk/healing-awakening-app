import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildHumanWeeklyPlan, normalizeHumanPlanProfile, type HumanPlanProfile } from "@/lib/human-engine";
import { appendHumanPlan, getLatestHumanPlanForUser } from "@/lib/human-storage";

type Body = Partial<HumanPlanProfile>;

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latestPlan = await getLatestHumanPlanForUser(user.uid);
  return NextResponse.json({ ok: true, latestPlan });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Body;
  const profile = normalizeHumanPlanProfile(body);
  const plan = buildHumanWeeklyPlan(profile);
  await appendHumanPlan(user.uid, plan);

  return NextResponse.json({ ok: true, plan });
}
