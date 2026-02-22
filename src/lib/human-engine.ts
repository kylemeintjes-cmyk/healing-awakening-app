export type HumanFocusArea = "clarity" | "execution" | "stability" | "income" | "relationships" | "balance";
export type HumanRhythm = "steady" | "sprint";

export type HumanCheckinInput = {
  clarity: number;
  focus: number;
  emotionalRegulation: number;
  stressLoad: number;
  sleepQuality: number;
  executionReadiness: number;
  commitmentConfidence: number;
  financialConfidence: number;
  biggestBlocker: string;
  priority: string;
  note: string;
};

export type HumanCheckinRecord = HumanCheckinInput & {
  id: string;
  userId: string;
  createdAt: string;
  clarityScore: number;
  executionScore: number;
  stabilityScore: number;
  incomeScore: number;
  operatingScore: number;
};

export type HumanGuidance = {
  diagnosis: string;
  todayProtocol: string[];
  winCondition: string;
};

export type HumanPlanProfile = {
  northStar: string;
  focusArea: HumanFocusArea;
  availableHours: number;
  incomeTarget: number;
  rhythm: HumanRhythm;
  accountabilityPartner: string;
};

export type HumanDailyMap = {
  day: string;
  stabilizationAction: string;
  cognitionAction: string;
  executionAction: string;
  moneyAction: string;
};

export type HumanWeeklyPlan = {
  planId: string;
  generatedAt: string;
  profile: HumanPlanProfile;
  theme: string;
  primaryOutcome: string;
  scoreboard: Array<{
    metric: string;
    target: string;
  }>;
  dailyMap: HumanDailyMap[];
  weeklyReviewQuestions: string[];
};

export type HumanDiagnosticInput = {
  satisfaction: number;
  stuckArea: "career" | "money" | "relationships" | "health" | "purpose" | "focus";
  recurringPattern: string;
  avoidancePattern: string;
  weeklyCost: string;
  desiredChange: string;
  confidenceToChange: number;
};

export type HumanProblemMap = {
  createdAt: string;
  satisfactionGap: number;
  primaryProblem: string;
  whyUnsatisfied: string[];
  topConstraints: Array<{
    id: string;
    title: string;
    impact: "high" | "medium" | "low";
    evidence: string;
    firstFix: string;
  }>;
  leverageMoves: string[];
};

export type HumanDecisionOptionInput = {
  id?: string;
  label: string;
  expectedUpside: number;
  expectedRisk: number;
  executionEase: number;
  identityAlignment: number;
};

export type HumanDecisionInput = {
  title: string;
  context: string;
  successMetric: string;
  confidenceBefore: number;
  reversible: boolean;
  timeHorizonDays: number;
  options: HumanDecisionOptionInput[];
  chosenOptionId?: string;
};

export type HumanDecisionRecord = {
  id: string;
  userId: string;
  createdAt: string;
  title: string;
  context: string;
  successMetric: string;
  confidenceBefore: number;
  reversible: boolean;
  timeHorizonDays: number;
  options: Array<{
    id: string;
    label: string;
    score: number;
    expectedUpside: number;
    expectedRisk: number;
    executionEase: number;
    identityAlignment: number;
  }>;
  recommendedOptionId: string;
  chosenOptionId: string;
  recommendationFollowed: boolean;
  decisionQualityScore: number;
  nextAction: string;
};

export type HumanAnalytics = {
  current: {
    operatingScore: number;
    clarityScore: number;
    executionScore: number;
    stabilityScore: number;
    financialConfidence: number;
  };
  deltas: Array<{
    period: "2w" | "4w" | "8w";
    operatingDelta: number;
    clarityDelta: number;
    executionDelta: number;
    stabilityDelta: number;
    confidenceDelta: number;
  }>;
  decision: {
    totalDecisions: number;
    avgDecisionQuality: number;
    recommendationAdoptionRate: number;
  };
  streakDays: number;
  totalCheckins: number;
  latestTheme: string;
  problemSnapshot: {
    satisfactionGap: number;
    primaryProblem: string;
  };
  insights: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageCheckinScores(records: HumanCheckinRecord[]) {
  return {
    operating: average(records.map((item) => item.operatingScore)),
    clarity: average(records.map((item) => item.clarityScore)),
    execution: average(records.map((item) => item.executionScore)),
    stability: average(records.map((item) => item.stabilityScore)),
    confidence: average(records.map((item) => item.financialConfidence)),
  };
}

function parseTimestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function defaultScore(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 5;
}

function invert(value: number) {
  return 11 - value;
}

function computeCheckinScores(input: HumanCheckinInput) {
  const clarityScore = round2(average([input.clarity, input.focus, invert(input.stressLoad)]));
  const executionScore = round2(average([input.executionReadiness, input.commitmentConfidence, input.focus]));
  const stabilityScore = round2(average([input.emotionalRegulation, input.sleepQuality, invert(input.stressLoad)]));
  const incomeScore = round2(input.financialConfidence);
  const operatingScore = round2(clarityScore * 0.27 + executionScore * 0.28 + stabilityScore * 0.27 + incomeScore * 0.18);
  return { clarityScore, executionScore, stabilityScore, incomeScore, operatingScore };
}

function dayKeyFromTimestamp(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function dayKeyFromIso(value: string) {
  const parsed = parseTimestamp(value);
  if (!parsed) return "";
  return dayKeyFromTimestamp(parsed);
}

function computeStreakDays(records: HumanCheckinRecord[]) {
  if (records.length === 0) return 0;
  const daySet = new Set(records.map((item) => dayKeyFromIso(item.createdAt)).filter(Boolean));
  const sortedDays = [...daySet].sort((a, b) => (a < b ? 1 : -1));
  if (sortedDays.length === 0) return 0;

  let streak = 1;
  let cursor = Date.parse(sortedDays[0]);
  for (let i = 1; i < sortedDays.length; i++) {
    cursor -= 24 * 60 * 60 * 1000;
    if (dayKeyFromTimestamp(cursor) === sortedDays[i]) {
      streak += 1;
      continue;
    }
    break;
  }
  return streak;
}

function computeDelta(records: HumanCheckinRecord[], windowDays: number) {
  if (records.length === 0) {
    return {
      operatingDelta: 0,
      clarityDelta: 0,
      executionDelta: 0,
      stabilityDelta: 0,
      confidenceDelta: 0,
    };
  }

  const latestTs = Math.max(...records.map((item) => parseTimestamp(item.createdAt)));
  const dayMs = 24 * 60 * 60 * 1000;
  const recentStart = latestTs - windowDays * dayMs;
  const priorStart = latestTs - windowDays * 2 * dayMs;

  const recent = records.filter((item) => {
    const ts = parseTimestamp(item.createdAt);
    return ts >= recentStart && ts <= latestTs;
  });

  const prior = records.filter((item) => {
    const ts = parseTimestamp(item.createdAt);
    return ts >= priorStart && ts < recentStart;
  });

  const recentAvg = averageCheckinScores(recent);
  const priorAvg = averageCheckinScores(prior.length > 0 ? prior : records.slice(0, Math.max(1, Math.floor(records.length / 2))));

  return {
    operatingDelta: round2(recentAvg.operating - priorAvg.operating),
    clarityDelta: round2(recentAvg.clarity - priorAvg.clarity),
    executionDelta: round2(recentAvg.execution - priorAvg.execution),
    stabilityDelta: round2(recentAvg.stability - priorAvg.stability),
    confidenceDelta: round2(recentAvg.confidence - priorAvg.confidence),
  };
}

function constraintFix(id: string) {
  if (id === "clarity") return "Define one measurable weekly outcome and remove all side quests.";
  if (id === "execution") return "Commit to one non-negotiable 60-minute execution block daily.";
  if (id === "stability") return "Install a morning and evening regulation protocol (10 min each).";
  if (id === "income") return "Run one revenue action before noon each weekday.";
  if (id === "avoidance") return "Turn the avoided task into a 15-minute starter action scheduled today.";
  return "Reduce scope and make the next step executable in under 20 minutes.";
}

export function normalizeHumanCheckinInput(input: Partial<HumanCheckinInput>): HumanCheckinInput {
  return {
    clarity: clamp(Math.round(defaultScore(input.clarity)), 1, 10),
    focus: clamp(Math.round(defaultScore(input.focus)), 1, 10),
    emotionalRegulation: clamp(Math.round(defaultScore(input.emotionalRegulation)), 1, 10),
    stressLoad: clamp(Math.round(defaultScore(input.stressLoad)), 1, 10),
    sleepQuality: clamp(Math.round(defaultScore(input.sleepQuality)), 1, 10),
    executionReadiness: clamp(Math.round(defaultScore(input.executionReadiness)), 1, 10),
    commitmentConfidence: clamp(Math.round(defaultScore(input.commitmentConfidence)), 1, 10),
    financialConfidence: clamp(Math.round(defaultScore(input.financialConfidence)), 1, 10),
    biggestBlocker: String(input.biggestBlocker ?? "").trim(),
    priority: String(input.priority ?? "").trim(),
    note: String(input.note ?? "").trim(),
  };
}

export function makeHumanCheckinRecord(userId: string, input: HumanCheckinInput): HumanCheckinRecord {
  const scores = computeCheckinScores(input);
  return {
    id: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    ...input,
    ...scores,
  };
}

export function buildHumanGuidance(latest: HumanCheckinRecord, previous: HumanCheckinRecord | null): HumanGuidance {
  const delta = previous ? round2(latest.operatingScore - previous.operatingScore) : 0;
  const bottlenecks: string[] = [];
  if (latest.clarityScore < 6) bottlenecks.push("clarity");
  if (latest.executionScore < 6) bottlenecks.push("execution");
  if (latest.stabilityScore < 6) bottlenecks.push("stability");
  if (latest.incomeScore < 6) bottlenecks.push("income");
  if (latest.biggestBlocker.length > 0) bottlenecks.push("avoidance");

  const todayProtocol =
    bottlenecks.length > 0
      ? bottlenecks.slice(0, 3).map((item) => constraintFix(item))
      : [
          "Keep the same protocol from yesterday and increase difficulty by 10%.",
          "Protect your first deep-work block from interruptions.",
          "Log one concrete outcome before ending the day.",
        ];

  const diagnosis =
    delta >= 0.5
      ? "Trajectory is improving. Protect consistency and avoid strategy switching."
      : delta <= -0.5
      ? "System drift detected. Cut scope and execute the simplest high-leverage actions today."
      : "State is stable but flat. Gains come from execution intensity, not new ideas.";

  const winCondition =
    latest.priority.length > 0
      ? `Win condition: complete one irreversible step for "${latest.priority}" today.`
      : "Win condition: complete one measurable task that increases income, clarity, or stability today.";

  return { diagnosis, todayProtocol, winCondition };
}

function focusTheme(profile: HumanPlanProfile) {
  const base =
    profile.focusArea === "clarity"
      ? "Clarity under pressure"
      : profile.focusArea === "execution"
      ? "Execution consistency sprint"
      : profile.focusArea === "stability"
      ? "Regulation-first performance"
      : profile.focusArea === "income"
      ? "Income acceleration loop"
      : profile.focusArea === "relationships"
      ? "Relational energy optimization"
      : "Balanced operating rhythm";
  return profile.rhythm === "sprint" ? `${base}: 7-day sprint` : `${base}: 7-day steady cycle`;
}

function focusOutcome(profile: HumanPlanProfile) {
  if (profile.focusArea === "clarity") return "Cut decision noise and lock one strategic direction for the week.";
  if (profile.focusArea === "execution") return "Raise execution completion rate and reduce procrastination cycles.";
  if (profile.focusArea === "stability") return "Reduce emotional volatility and increase recovery speed.";
  if (profile.focusArea === "income") return `Move toward weekly income target of ${profile.incomeTarget}.`;
  if (profile.focusArea === "relationships") return "Increase high-quality connection while reducing social drain.";
  return "Improve whole-system performance with measurable consistency.";
}

function buildDailyMap(profile: HumanPlanProfile): HumanDailyMap[] {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return days.map((day, index) => ({
    day,
    stabilizationAction:
      index % 2 === 0
        ? "10-minute breath + mobility reset before work."
        : "20-minute low-stimulus walk with reflection.",
    cognitionAction:
      profile.focusArea === "clarity"
        ? "Write one-page decision memo: what matters, what does not."
        : "Define top 3 priorities and kill one low-leverage task.",
    executionAction:
      profile.focusArea === "execution"
        ? "Run one protected 75-minute build block."
        : "Run one protected 50-minute high-impact action block.",
    moneyAction:
      profile.focusArea === "income"
        ? "Do one pipeline action that can produce revenue this week."
        : "Track one money decision and ensure it aligns with your goals.",
  }));
}

export function normalizeHumanPlanProfile(input: Partial<HumanPlanProfile>): HumanPlanProfile {
  const focusAreas: HumanFocusArea[] = ["clarity", "execution", "stability", "income", "relationships", "balance"];
  const rhythms: HumanRhythm[] = ["steady", "sprint"];
  const focusArea = focusAreas.includes(input.focusArea as HumanFocusArea) ? (input.focusArea as HumanFocusArea) : "balance";
  const rhythm = rhythms.includes(input.rhythm as HumanRhythm) ? (input.rhythm as HumanRhythm) : "steady";
  return {
    northStar: String(input.northStar ?? "Build a life with high clarity, consistent execution, and emotional stability.").trim(),
    focusArea,
    availableHours: clamp(Math.round(defaultScore(input.availableHours)), 2, 80),
    incomeTarget: clamp(Math.round(Number(input.incomeTarget ?? 0)), 0, 100000),
    rhythm,
    accountabilityPartner: String(input.accountabilityPartner ?? "").trim(),
  };
}

export function buildHumanWeeklyPlan(profile: HumanPlanProfile): HumanWeeklyPlan {
  return {
    planId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    profile,
    theme: focusTheme(profile),
    primaryOutcome: focusOutcome(profile),
    scoreboard: [
      { metric: "Daily check-ins", target: "7/7" },
      { metric: "Deep work blocks", target: profile.rhythm === "sprint" ? "6 blocks" : "4 blocks" },
      { metric: "Revenue-producing actions", target: profile.focusArea === "income" ? "5 actions" : "3 actions" },
      { metric: "Regulation sessions", target: "7 sessions" },
    ],
    dailyMap: buildDailyMap(profile),
    weeklyReviewQuestions: [
      "What produced measurable progress this week?",
      "What drained capacity without producing value?",
      "What one change will most improve next week?",
    ],
  };
}

function computeConstraintIds(record: HumanCheckinRecord | null, diagnostic: HumanProblemMap | null) {
  const constraints = new Set<string>();
  if (diagnostic) {
    diagnostic.topConstraints.slice(0, 3).forEach((item) => constraints.add(item.id));
  }
  if (record) {
    if (record.clarityScore < 6) constraints.add("clarity");
    if (record.executionScore < 6) constraints.add("execution");
    if (record.stabilityScore < 6) constraints.add("stability");
    if (record.incomeScore < 6) constraints.add("income");
  }
  return [...constraints];
}

export function normalizeHumanDiagnosticInput(input: Partial<HumanDiagnosticInput>): HumanDiagnosticInput {
  const stuckAreas: HumanDiagnosticInput["stuckArea"][] = ["career", "money", "relationships", "health", "purpose", "focus"];
  return {
    satisfaction: clamp(Math.round(defaultScore(input.satisfaction)), 1, 10),
    stuckArea: stuckAreas.includes(input.stuckArea as HumanDiagnosticInput["stuckArea"]) ? (input.stuckArea as HumanDiagnosticInput["stuckArea"]) : "focus",
    recurringPattern: String(input.recurringPattern ?? "").trim(),
    avoidancePattern: String(input.avoidancePattern ?? "").trim(),
    weeklyCost: String(input.weeklyCost ?? "").trim(),
    desiredChange: String(input.desiredChange ?? "").trim(),
    confidenceToChange: clamp(Math.round(defaultScore(input.confidenceToChange)), 1, 10),
  };
}

export function buildHumanProblemMap(input: HumanDiagnosticInput): HumanProblemMap {
  const satisfactionGap = 10 - input.satisfaction;
  const constraints: HumanProblemMap["topConstraints"] = [];

  if (input.confidenceToChange <= 5) {
    constraints.push({
      id: "execution",
      title: "Low confidence to execute",
      impact: "high",
      evidence: `Confidence score is ${input.confidenceToChange}/10.`,
      firstFix: "Shrink goals into one 20-minute daily action and track completion publicly.",
    });
  }
  if (input.avoidancePattern.length > 0) {
    constraints.push({
      id: "avoidance",
      title: "Avoidance loop",
      impact: "high",
      evidence: input.avoidancePattern,
      firstFix: "Convert avoidance into a same-day starter task under 15 minutes.",
    });
  }
  if (input.recurringPattern.length > 0) {
    constraints.push({
      id: "clarity",
      title: "Recurring unclosed loop",
      impact: "medium",
      evidence: input.recurringPattern,
      firstFix: "Define one clear success metric for the current week and review daily.",
    });
  }
  if (input.stuckArea === "money") {
    constraints.push({
      id: "income",
      title: "Income volatility pressure",
      impact: "high",
      evidence: input.weeklyCost || "Money uncertainty is reducing cognitive bandwidth.",
      firstFix: "Run one revenue-generating action before noon each weekday.",
    });
  }
  if (constraints.length === 0) {
    constraints.push({
      id: "clarity",
      title: "Diffused focus",
      impact: "medium",
      evidence: "No sharp bottleneck identified yet.",
      firstFix: "Choose one weekly target and measure progress daily.",
    });
  }

  const whyUnsatisfied = [
    `Current satisfaction is ${input.satisfaction}/10, leaving a gap of ${satisfactionGap}.`,
    input.weeklyCost.length > 0 ? `Current pattern cost: ${input.weeklyCost}` : "Current behavior is not producing the desired outcome fast enough.",
    input.desiredChange.length > 0 ? `Desired shift: ${input.desiredChange}` : "Desired change has not yet been translated into measurable daily actions.",
  ];

  const leverageMoves = [
    "Pick one measurable weekly objective and remove competing priorities.",
    "Set a fixed daily execution block and protect it like a meeting.",
    "Track one stability metric and one income metric every day.",
    "Review outcomes every 7 days and adjust only with data.",
  ];

  return {
    createdAt: new Date().toISOString(),
    satisfactionGap,
    primaryProblem: `Primary bottleneck in ${input.stuckArea}: recurring pattern is not translating into consistent execution.`,
    whyUnsatisfied,
    topConstraints: constraints.slice(0, 4),
    leverageMoves,
  };
}

export function normalizeHumanDecisionInput(input: Partial<HumanDecisionInput>): HumanDecisionInput {
  const options = (input.options ?? [])
    .map((option, index) => ({
      id: option.id?.trim() || `opt_${index + 1}`,
      label: String(option.label ?? "").trim(),
      expectedUpside: clamp(Math.round(defaultScore(option.expectedUpside)), 1, 10),
      expectedRisk: clamp(Math.round(defaultScore(option.expectedRisk)), 1, 10),
      executionEase: clamp(Math.round(defaultScore(option.executionEase)), 1, 10),
      identityAlignment: clamp(Math.round(defaultScore(option.identityAlignment)), 1, 10),
    }))
    .filter((option) => option.label.length > 0)
    .slice(0, 4);

  return {
    title: String(input.title ?? "").trim(),
    context: String(input.context ?? "").trim(),
    successMetric: String(input.successMetric ?? "").trim(),
    confidenceBefore: clamp(Math.round(defaultScore(input.confidenceBefore)), 1, 10),
    reversible: Boolean(input.reversible),
    timeHorizonDays: clamp(Math.round(Number(input.timeHorizonDays ?? 14)), 1, 365),
    options,
    chosenOptionId: String(input.chosenOptionId ?? "").trim() || undefined,
  };
}

export function buildHumanDecisionRecord(userId: string, input: HumanDecisionInput): HumanDecisionRecord | null {
  if (!input.title || input.options.length < 2) return null;

  const scoredOptions = input.options.map((option, index) => {
    const score = round2(
      option.expectedUpside * 0.34 +
        invert(option.expectedRisk) * 0.26 +
        option.executionEase * 0.18 +
        option.identityAlignment * 0.22,
    );
    return {
      id: option.id || `opt_${index + 1}`,
      label: option.label,
      expectedUpside: option.expectedUpside,
      expectedRisk: option.expectedRisk,
      executionEase: option.executionEase,
      identityAlignment: option.identityAlignment,
      score,
    };
  });

  const sorted = [...scoredOptions].sort((a, b) => b.score - a.score);
  const recommended = sorted[0];
  const chosenOptionId = input.chosenOptionId && scoredOptions.some((option) => option.id === input.chosenOptionId)
    ? input.chosenOptionId
    : recommended.id;
  const recommendationFollowed = chosenOptionId === recommended.id;
  const qualityFromConfidence = input.confidenceBefore * 0.25;
  const qualityFromOptions = recommended.score * 0.75;
  const decisionQualityScore = round2(qualityFromConfidence + qualityFromOptions);

  const nextAction = recommendationFollowed
    ? `Commit to "${recommended.label}" and schedule first action within 24 hours.`
    : `Run a 48-hour test comparing chosen option "${chosenOptionId}" against recommended option "${recommended.id}".`;

  return {
    id: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    title: input.title,
    context: input.context,
    successMetric: input.successMetric || "Define one measurable success metric before execution.",
    confidenceBefore: input.confidenceBefore,
    reversible: input.reversible,
    timeHorizonDays: input.timeHorizonDays,
    options: scoredOptions,
    recommendedOptionId: recommended.id,
    chosenOptionId,
    recommendationFollowed,
    decisionQualityScore,
    nextAction,
  };
}

export function buildHumanAnalytics(args: {
  checkins: HumanCheckinRecord[];
  latestPlan: HumanWeeklyPlan | null;
  latestDiagnostic: HumanProblemMap | null;
  decisions: HumanDecisionRecord[];
}): HumanAnalytics {
  const orderedCheckins = [...args.checkins].sort((a, b) => parseTimestamp(a.createdAt) - parseTimestamp(b.createdAt));
  const latest = orderedCheckins[orderedCheckins.length - 1] ?? null;
  const deltas: HumanAnalytics["deltas"] = [
    { period: "2w", ...computeDelta(orderedCheckins, 14) },
    { period: "4w", ...computeDelta(orderedCheckins, 28) },
    { period: "8w", ...computeDelta(orderedCheckins, 56) },
  ];

  const avgDecisionQuality = round2(average(args.decisions.map((item) => item.decisionQualityScore)));
  const adoptionRate = round2(average(args.decisions.map((item) => (item.recommendationFollowed ? 100 : 0))));

  const insights: string[] = [];
  if (!latest) {
    insights.push("Start daily check-ins to establish your baseline operating score.");
  } else {
    if (latest.executionScore < 6) insights.push("Execution is bottlenecking progress. Reduce scope and run one non-negotiable block daily.");
    if (latest.clarityScore < 6) insights.push("Clarity is weak. Write one weekly outcome and one metric before starting work.");
    if (latest.stabilityScore < 6) insights.push("Regulation load is high. Add a morning and evening reset protocol.");
    if (latest.incomeScore < 6) insights.push("Income confidence is low. Prioritize one measurable money action each day.");
  }
  if (args.decisions.length > 0 && adoptionRate < 50) {
    insights.push("Decision follow-through is low. Use 48-hour micro-experiments before major pivots.");
  }
  if (deltas[0].operatingDelta > 0.4) {
    insights.push("Operating trajectory is improving over 2 weeks. Maintain current protocol and avoid unnecessary changes.");
  }
  if (insights.length === 0) {
    insights.push("System is stable. Increase challenge by 10% while preserving recovery and execution rhythm.");
  }

  const latestConstraintIds = computeConstraintIds(latest, args.latestDiagnostic);
  if (latestConstraintIds.length > 0) {
    insights.push(`Primary active constraints: ${latestConstraintIds.join(", ")}.`);
  }

  return {
    current: {
      operatingScore: latest?.operatingScore ?? 0,
      clarityScore: latest?.clarityScore ?? 0,
      executionScore: latest?.executionScore ?? 0,
      stabilityScore: latest?.stabilityScore ?? 0,
      financialConfidence: latest?.financialConfidence ?? 0,
    },
    deltas,
    decision: {
      totalDecisions: args.decisions.length,
      avgDecisionQuality,
      recommendationAdoptionRate: adoptionRate,
    },
    streakDays: computeStreakDays(orderedCheckins),
    totalCheckins: orderedCheckins.length,
    latestTheme: args.latestPlan?.theme ?? "No weekly plan yet.",
    problemSnapshot: {
      satisfactionGap: args.latestDiagnostic?.satisfactionGap ?? 0,
      primaryProblem: args.latestDiagnostic?.primaryProblem ?? "No diagnostic captured yet.",
    },
    insights: insights.slice(0, 8),
  };
}
