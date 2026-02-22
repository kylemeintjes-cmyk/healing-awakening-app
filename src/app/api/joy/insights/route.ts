import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildJoyAnalytics } from "@/lib/joy-engine";
import { getJoyCheckinsForUser, getLatestJoyPlanForUser } from "@/lib/joy-storage";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [checkins, latestPlan] = await Promise.all([
    getJoyCheckinsForUser(user.uid, 180),
    getLatestJoyPlanForUser(user.uid),
  ]);

  const analytics = buildJoyAnalytics(checkins, latestPlan);
  return NextResponse.json({ ok: true, analytics });
}
