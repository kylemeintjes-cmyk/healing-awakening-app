import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCapitalAnalytics } from "@/lib/capital-analytics";

export async function GET(request: Request) {
  const user = await requireUser(request as any);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const analytics = await getCapitalAnalytics(user.uid);
  return NextResponse.json({ ok: true, analytics });
}
