import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildJoyWeeklyPlan, normalizeJoyPlanProfile, type JoyPlanProfile } from "@/lib/joy-engine";
import { appendJoyPlan, getLatestJoyPlanForUser } from "@/lib/joy-storage";

type Body = Partial<JoyPlanProfile>;

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latestPlan = await getLatestJoyPlanForUser(user.uid);
  return NextResponse.json({ ok: true, latestPlan });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Body;
  const profile = normalizeJoyPlanProfile(body);
  const plan = buildJoyWeeklyPlan(profile);
  await appendJoyPlan(user.uid, plan);

  return NextResponse.json({ ok: true, plan });
}
