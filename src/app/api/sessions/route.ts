import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type SessionBody = {
  title: string;
  type: string;
  url: string;
  durationMinutes: number;
  description: string;
  tags: string[];
  intensity: string;
  contraindications: string[];
};

export async function GET(request: Request) {
  const user = await requireUser(request as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.sessionContent.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const user = await requireUser(request as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SessionBody;

  if (!body.title || !body.type) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const session = await prisma.sessionContent.create({
    data: {
      title: body.title,
      type: body.type,
      url: body.url ?? "",
      durationMinutes: Number(body.durationMinutes) || 0,
      description: body.description ?? "",
      tags: body.tags ?? [],
      intensity: body.intensity ?? "gentle",
      contraindications: body.contraindications ?? [],
    },
  });

  return NextResponse.json({ session });
}
