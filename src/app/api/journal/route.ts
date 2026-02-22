import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type JournalBody = {
  prompt: string;
  body: string;
};

export async function GET(request: Request) {
  const user = await requireUser(request as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.journalEntry.findMany({
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

  const body = (await request.json()) as JournalBody;

  const entry = await prisma.journalEntry.create({
    data: {
      userId: user.uid,
      prompt: body.prompt ?? "",
      body: body.body ?? "",
    },
  });

  return NextResponse.json({ entry });
}
