import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  buildHumanGuidance,
  makeHumanCheckinRecord,
  normalizeHumanCheckinInput,
  type HumanCheckinInput,
} from "@/lib/human-engine";
import { appendHumanCheckin, getHumanCheckinsForUser } from "@/lib/human-storage";

type Body = Partial<HumanCheckinInput>;

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await getHumanCheckinsForUser(user.uid, 180);
  return NextResponse.json({ ok: true, entries });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Body;
  const input = normalizeHumanCheckinInput(body);
  const previousEntries = await getHumanCheckinsForUser(user.uid, 1);
  const previous = previousEntries[0] ?? null;

  const entry = makeHumanCheckinRecord(user.uid, input);
  const guidance = buildHumanGuidance(entry, previous);
  await appendHumanCheckin(user.uid, entry);

  return NextResponse.json({ ok: true, entry, guidance });
}
