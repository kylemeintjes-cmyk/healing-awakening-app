export type RiskTolerance = "low" | "medium" | "high";

export type CapitalProfile = {
  goal: string;
  topSkills: string[];
  market: string;
  hoursPerWeek: number;
  monthlyExpenses: number;
  cashReserve: number;
  currentMonthlyRevenue: number;
  riskTolerance: RiskTolerance;
  narrative?: string;
};

export type Blocker = {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  evidence: string;
  fix: string;
};

export type Opportunity = {
  id: string;
  title: string;
  model: string;
  targetBuyer: string;
  pricePoint: string;
  score: {
    demand: number;
    speedToCash: number;
    defensibility: number;
    capitalEfficiency: number;
    fit: number;
    total: number;
  };
  first14Days: string[];
};

export type AllocationPolicy = {
  runwayPct: number;
  reinvestPct: number;
  longTermPct: number;
  optionalityPct: number;
  weeklyTransfers: {
    runway: number;
    reinvest: number;
    longTerm: number;
    optionality: number;
  };
};

export type CapitalPlan = {
  planId: string;
  generatedAt: string;
  profile: CapitalProfile;
  blockers: Blocker[];
  opportunities: Opportunity[];
  recommendedOpportunityId: string;
  antiFailureProtocol: string[];
  executionCadence: {
    daily: string[];
    weekly: string[];
  };
  allocation: AllocationPolicy;
};

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function containsAvoidance(text: string) {
  const signals = ["later", "someday", "stuck", "not ready", "overthinking", "confused", "waiting"];
  const normalized = text.toLowerCase();
  return signals.some((s) => normalized.includes(s));
}

function makeBlockers(profile: CapitalProfile): Blocker[] {
  const blockers: Blocker[] = [];
  if (profile.hoursPerWeek < 10) {
    blockers.push({
      id: "time_budget",
      title: "Low execution bandwidth",
      severity: "high",
      evidence: `Only ${profile.hoursPerWeek} hours/week available.`,
      fix: "Protect 2 non-negotiable 90-minute deep-work blocks before adding complexity.",
    });
  }
  const runwayMonths = profile.monthlyExpenses > 0 ? profile.cashReserve / profile.monthlyExpenses : 0;
  if (runwayMonths < 3) {
    blockers.push({
      id: "runway",
      title: "Short financial runway",
      severity: "high",
      evidence: `${round2(runwayMonths)} months runway at current burn.`,
      fix: "Prioritize speed-to-cash offers for 8 weeks and freeze non-essential spend.",
    });
  }
  if (profile.currentMonthlyRevenue < profile.monthlyExpenses) {
    blockers.push({
      id: "income_gap",
      title: "Revenue below burn",
      severity: "high",
      evidence: `Revenue ${profile.currentMonthlyRevenue} < expenses ${profile.monthlyExpenses}.`,
      fix: "Run daily pipeline targets: outreach, calls, proposals until break-even is crossed.",
    });
  }
  if (containsAvoidance(profile.narrative ?? "")) {
    blockers.push({
      id: "avoidance_language",
      title: "Avoidance pattern detected",
      severity: "medium",
      evidence: "Narrative includes delay/confusion language.",
      fix: "Replace open-ended planning with daily binary execution scoreboard.",
    });
  }
  if (profile.topSkills.length < 2) {
    blockers.push({
      id: "skill_positioning",
      title: "Weak skill packaging",
      severity: "medium",
      evidence: "Less than two clearly marketable skills declared.",
      fix: "Define one core skill + one multiplier skill and productize them.",
    });
  }
  return blockers;
}

function buildOpportunity(profile: CapitalProfile, title: string, model: string, idx: number): Opportunity {
  const skillFitBoost = clamp(0, 2, profile.topSkills.length - 1);
  const hoursBoost = profile.hoursPerWeek >= 15 ? 1 : 0;
  const riskBoost = profile.riskTolerance === "high" ? 1 : profile.riskTolerance === "medium" ? 0.5 : 0;

  const demand = clamp(1, 10, 6 + skillFitBoost + hoursBoost);
  const speedToCash = clamp(1, 10, idx === 0 ? 9 : idx === 1 ? 7 : 6);
  const defensibility = clamp(1, 10, 5 + skillFitBoost + (idx === 2 ? 2 : 0));
  const capitalEfficiency = clamp(1, 10, idx === 0 ? 9 : 7);
  const fit = clamp(1, 10, 6 + skillFitBoost + riskBoost);
  const total = round2(demand * 0.26 + speedToCash * 0.25 + defensibility * 0.2 + capitalEfficiency * 0.14 + fit * 0.15);

  return {
    id: `opp_${idx + 1}`,
    title,
    model,
    targetBuyer: `${profile.market} buyers with urgent outcomes`,
    pricePoint: idx === 0 ? "$500-$1,500 starter offer" : idx === 1 ? "$2,000-$5,000 system offer" : "$99-$299 recurring product",
    score: {
      demand,
      speedToCash,
      defensibility,
      capitalEfficiency,
      fit,
      total,
    },
    first14Days: [
      "Day 1-2: Define one painful problem and one measurable outcome.",
      "Day 3-4: Build offer page + clear promise + CTA.",
      "Day 5-9: 50 direct outreaches to qualified targets.",
      "Day 10-12: Run 5 sales conversations and close first client.",
      "Day 13-14: Capture testimonials and raise price or tighten niche.",
    ],
  };
}

function makeOpportunities(profile: CapitalProfile) {
  const baseSkill = profile.topSkills[0] ?? "problem-solving";
  const supportSkill = profile.topSkills[1] ?? "execution";
  return [
    buildOpportunity(profile, `${baseSkill} Sprint Offer`, "Done-with-you advisory sprint", 0),
    buildOpportunity(profile, `${baseSkill} + ${supportSkill} Transformation`, "Productized service with clear milestones", 1),
    buildOpportunity(profile, `${baseSkill} Knowledge Asset`, "Template/toolkit subscription", 2),
  ];
}

function makeAllocation(profile: CapitalProfile): AllocationPolicy {
  const runwayMonths = profile.monthlyExpenses > 0 ? profile.cashReserve / profile.monthlyExpenses : 0;
  let runwayPct = 35;
  let reinvestPct = 30;
  let longTermPct = 25;
  let optionalityPct = 10;

  if (runwayMonths < 3) {
    runwayPct = 55;
    reinvestPct = 30;
    longTermPct = 10;
    optionalityPct = 5;
  } else if (runwayMonths >= 6 && profile.riskTolerance !== "low") {
    runwayPct = 25;
    reinvestPct = 35;
    longTermPct = 30;
    optionalityPct = 10;
  }

  const weeklyBase = profile.currentMonthlyRevenue / 4;
  return {
    runwayPct,
    reinvestPct,
    longTermPct,
    optionalityPct,
    weeklyTransfers: {
      runway: round2((weeklyBase * runwayPct) / 100),
      reinvest: round2((weeklyBase * reinvestPct) / 100),
      longTerm: round2((weeklyBase * longTermPct) / 100),
      optionality: round2((weeklyBase * optionalityPct) / 100),
    },
  };
}

export function buildCapitalPlan(profile: CapitalProfile): CapitalPlan {
  const blockers = makeBlockers(profile);
  const opportunities = makeOpportunities(profile).sort((a, b) => b.score.total - a.score.total);
  const recommendedOpportunityId = opportunities[0]?.id ?? "opp_1";
  const allocation = makeAllocation(profile);

  const antiFailureProtocol = [
    "No zero days: complete at least one revenue-producing action daily.",
    "Track pipeline numbers daily: outreach, calls, proposals, closes.",
    "Freeze strategy changes for 14 days; only adjust after data review.",
    "If three consecutive missed days occur, cut scope by 30% and restart cadence.",
  ];

  return {
    planId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    profile,
    blockers,
    opportunities,
    recommendedOpportunityId,
    antiFailureProtocol,
    executionCadence: {
      daily: [
        "90-minute deep work on offer or delivery.",
        "Direct outreach block (minimum 10 messages).",
        "Pipeline update and blocker note.",
      ],
      weekly: [
        "Review conversion metrics and adjust message/offers.",
        "Transfer capital per allocation policy.",
        "Kill one low-leverage task from next week.",
      ],
    },
    allocation,
  };
}
