import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  buildHumanProblemMap,
  normalizeHumanDiagnosticInput,
  type HumanDiagnosticInput,
} from "@/lib/human-engine";
import { appendHumanDiagnostic, getLatestHumanDiagnosticForUser } from "@/lib/human-storage";

type Body = Partial<HumanDiagnosticInput>;

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latestDiagnostic = await getLatestHumanDiagnosticForUser(user.uid);
  return NextResponse.json({ ok: true, latestDiagnostic });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Body;
  const input = normalizeHumanDiagnosticInput(body);
  const problemMap = buildHumanProblemMap(input);
  await appendHumanDiagnostic(user.uid, problemMap);

  return NextResponse.json({ ok: true, problemMap });
}
