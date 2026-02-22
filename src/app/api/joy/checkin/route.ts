import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildJoyGuidance, makeJoyCheckinRecord, normalizeJoyCheckinInput, type JoyCheckinInput } from "@/lib/joy-engine";
import { appendJoyCheckin, getJoyCheckinsForUser } from "@/lib/joy-storage";

type Body = Partial<JoyCheckinInput>;

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await getJoyCheckinsForUser(user.uid, 120);
  return NextResponse.json({ ok: true, entries });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Body;
  const input = normalizeJoyCheckinInput(body);
  const latest = await getJoyCheckinsForUser(user.uid, 1);
  const previous = latest[0] ?? null;

  const entry = makeJoyCheckinRecord(user.uid, input);
  const guidance = buildJoyGuidance(entry, previous);
  await appendJoyCheckin(user.uid, entry);

  return NextResponse.json({ ok: true, entry, guidance });
}
