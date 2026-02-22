import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type CheckinBody = {
  energy: number;
  mood: number;
  stress: number;
  sleep: number;
  tension: number;
  symptom: string;
  tone: string;
  readiness: string;
  note: string;
};

export async function GET(request: Request) {
  const user = await requireUser(request as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.checkin.findMany({
    where: { userId: user.uid },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const user = await requireUser(request as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CheckinBody;

  const entry = await prisma.checkin.create({
    data: {
      userId: user.uid,
      energy: Number(body.energy) || 0,
      mood: Number(body.mood) || 0,
      stress: Number(body.stress) || 0,
      sleep: Number(body.sleep) || 0,
      tension: Number(body.tension) || 0,
      symptom: body.symptom ?? "",
      tone: body.tone ?? "",
      readiness: body.readiness ?? "",
      note: body.note ?? "",
    },
  });

  return NextResponse.json({ entry });
}
