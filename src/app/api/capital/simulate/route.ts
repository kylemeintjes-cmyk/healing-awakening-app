import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { runCapitalSimulation, type CapitalSimulationInput } from "@/lib/capital-analytics";

type Body = Partial<CapitalSimulationInput>;

export async function POST(request: Request) {
  const user = await requireUser(request as any);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Body;
  const input: CapitalSimulationInput = {
    startingCapital: Number(body.startingCapital ?? 0),
    monthlyContribution: Number(body.monthlyContribution ?? 0),
    annualReturnBase: Number(body.annualReturnBase ?? 8),
    annualReturnUpside: Number(body.annualReturnUpside ?? 14),
    annualReturnDownside: Number(body.annualReturnDownside ?? 3),
    months: Number(body.months ?? 24),
  };

  const simulation = runCapitalSimulation(input);
  return NextResponse.json({ ok: true, simulation });
}
