import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export async function GET(request: Request) {
  const user = await requireUser(request as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile, lastCheckin, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.uid },
      select: { onboarding: true },
    }),
    prisma.checkin.findFirst({
      where: { userId: user.uid },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sessionContent.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const onboarding = (profile?.onboarding ?? {}) as {
    intent?: string;
    styles?: string[];
  };

  const intentTokens = onboarding.intent
    ? normalize(onboarding.intent).split(/[,.;]/).map((item: string) => item.trim())
    : [];
  const styleTokens = (onboarding.styles ?? []).map((item: string) => normalize(item));

  const energy = lastCheckin?.energy ?? 3;
  const stress = lastCheckin?.stress ?? 3;
  const tension = lastCheckin?.tension ?? 3;

  const preferredIntensity =
    energy <= 2 || stress >= 4 || tension >= 4 ? "gentle" : energy >= 4 ? "deep" : "medium";

  const scored = sessions.map((session: { tags: unknown; intensity: string }) => {
    const tags = Array.isArray(session.tags)
      ? (session.tags as string[]).map((tag: string) => normalize(tag))
      : [];
    let score = 0;
    if (session.intensity === preferredIntensity) score += 2;
    if (tags.some((tag) => styleTokens.includes(tag))) score += 2;
    if (tags.some((tag) => intentTokens.includes(tag))) score += 1;
    return { session, score };
  });

  const recommended = scored
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, 3)
    .map((item: { session: { tags: unknown; intensity: string } }) => item.session);

  const rationale = `Matched ${preferredIntensity} intensity and your onboarding tags.`;

  return NextResponse.json({
    recommended,
    rationale,
    lastCheckin: lastCheckin
      ? {
          energy: lastCheckin.energy,
          mood: lastCheckin.mood,
          stress: lastCheckin.stress,
          sleep: lastCheckin.sleep,
          tension: lastCheckin.tension,
        }
      : null,
  });
}
