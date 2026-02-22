import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildHumanAnalytics } from "@/lib/human-engine";
import {
  getHumanCheckinsForUser,
  getHumanDecisionsForUser,
  getLatestHumanDiagnosticForUser,
  getLatestHumanPlanForUser,
} from "@/lib/human-storage";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [checkins, latestPlan, latestDiagnostic, decisions] = await Promise.all([
    getHumanCheckinsForUser(user.uid, 220),
    getLatestHumanPlanForUser(user.uid),
    getLatestHumanDiagnosticForUser(user.uid),
    getHumanDecisionsForUser(user.uid, 220),
  ]);

  const analytics = buildHumanAnalytics({
    checkins,
    latestPlan,
    latestDiagnostic,
    decisions,
  });
  return NextResponse.json({ ok: true, analytics });
}
