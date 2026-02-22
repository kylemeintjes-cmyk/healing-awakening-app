import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { getLatestCapitalPlanForUser } from "@/lib/capital-storage";

export async function GET(request: Request) {
  const user = await requireUser(request as NextRequest);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latestPlan = await getLatestCapitalPlanForUser(user.uid);
  return NextResponse.json({ ok: true, latestPlan });
}
