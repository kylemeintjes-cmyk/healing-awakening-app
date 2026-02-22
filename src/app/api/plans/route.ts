import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = await prisma.plan.findMany({
    where: { userId: user.uid },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ plans });
}
