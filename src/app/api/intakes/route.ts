import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type IntakeBody = {
  stuck: string;
  energy: string;
  conditions: string;
  goal: string;
  meditation: string;
  limits: string;
};

function generatePlan(answers: IntakeBody) {
  const energyNum = Number(answers.energy);
  const energyLevel = Number.isNaN(energyNum) ? 3 : Math.max(1, Math.min(5, energyNum));
  const intensity = energyLevel <= 2 ? "very gentle" : energyLevel <= 4 ? "gentle" : "steady";

  return [
    {
      title: "Daily grounding",
      detail: `Two ${intensity} rests per day. Hand on heart, 6 slow breaths.`,
    },
    {
      title: "Nervous system care",
      detail:
        "Short seated body scan: notice three points of ease, soften around discomfort.",
    },
    {
      title: "Healing focus",
      detail: `Primary focus: ${answers.stuck || "stabilization"}. Pair with pacing and kindness.`,
    },
    {
      title: "Awakening inquiry",
      detail:
        "One question daily: \"What is aware of this experience?\" Sit for 3 minutes.",
    },
    {
      title: "Journal prompt",
      detail: "What part of me is asking for tenderness today? Write for 6 minutes.",
    },
  ];
}

export async function POST(request: Request) {
  const user = await requireUser(request as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as IntakeBody;

  await prisma.user.upsert({
    where: { id: user.uid },
    update: { email: user.email ?? undefined, name: user.name ?? undefined },
    create: { id: user.uid, email: user.email ?? undefined, name: user.name ?? undefined },
  });

  const intake = await prisma.intake.create({
    data: {
      userId: user.uid,
      stuck: body.stuck ?? "",
      energy: body.energy ?? "",
      conditions: body.conditions ?? "",
      goal: body.goal ?? "",
      meditation: body.meditation ?? "",
      limits: body.limits ?? "",
    },
  });

  const items = generatePlan(body);

  const plan = await prisma.plan.create({
    data: {
      userId: user.uid,
      intakeId: intake.id,
      title: "Gentle 30-day action plan",
      status: "DRAFT",
      items,
    },
  });

  return NextResponse.json({ intake, plan });
}
