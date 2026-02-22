import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type OnboardingBody = {
  onboarding: {
    intent: string;
    experience: string;
    styles: string[];
    contraindications: string[];
    consent: boolean;
  };
};

export async function GET(request: Request) {
  const user = await requireUser(request as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: user.uid },
    select: { onboarding: true, preferences: true },
  });

  return NextResponse.json({
    onboarding: existing?.onboarding ?? null,
    preferences: existing?.preferences ?? null,
  });
}

export async function POST(request: Request) {
  const user = await requireUser(request as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as OnboardingBody;

  const updated = await prisma.user.upsert({
    where: { id: user.uid },
    update: {
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      onboarding: body.onboarding ?? {},
    },
    create: {
      id: user.uid,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      onboarding: body.onboarding ?? {},
    },
  });

  return NextResponse.json({ onboarding: updated.onboarding });
}
