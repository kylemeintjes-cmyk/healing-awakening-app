export type JoyFocusArea = "energy" | "purpose" | "relationships" | "creativity" | "wealth" | "balance";
export type JoySocialMode = "solo" | "mixed" | "community";
export type JoyRhythm = "steady" | "sprint";

export type JoyCheckinInput = {
  joy: number;
  meaning: number;
  connection: number;
  play: number;
  calm: number;
  financialConfidence: number;
  gratitude: string;
  win: string;
  intention: string;
};

export type JoyCheckinRecord = JoyCheckinInput & {
  id: string;
  userId: string;
  createdAt: string;
  joyScore: number;
  moneyScore: number;
  lifeStabilityScore: number;
};

export type JoyGuidance = {
  headline: string;
  todayActions: string[];
  celebration: string;
};

export type JoyPlanProfile = {
  vision: string;
  focusArea: JoyFocusArea;
  availableHours: number;
  spendBudget: number;
  socialMode: JoySocialMode;
  rhythm: JoyRhythm;
  accountabilityName: string;
};

export type JoyDailyMap = {
  day: string;
  joyAction: string;
  moneyAction: string;
  reflectionPrompt: string;
};

export type JoyWeeklyPlan = {
  planId: string;
  generatedAt: string;
  profile: JoyPlanProfile;
  weeklyTheme: string;
  priorityOutcome: string;
  joyRituals: string[];
  moneyMoves: string[];
  connectionMoves: string[];
  playExperiments: string[];
  dailyMap: JoyDailyMap[];
  scoreboard: Array<{
    metric: string;
    target: string;
  }>;
  accountability: {
    partner: string;
    checkpointDay: string;
    messageTemplate: string;
  };
};

export type JoyAnalytics = {
  current: {
    joyScore: number;
    financialConfidence: number;
    lifeStabilityScore: number;
  };
  deltas: Array<{
    period: "2w" | "4w" | "8w";
    joyDelta: number;
    stabilityDelta: number;
    confidenceDelta: number;
  }>;
  streakDays: number;
  totalCheckins: number;
  insights: string[];
  latestWeeklyTheme: string;
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

function averageScores(records: JoyCheckinRecord[]) {
  return {
    joy: average(records.map((item) => item.joyScore)),
    stability: average(records.map((item) => item.lifeStabilityScore)),
    confidence: average(records.map((item) => item.financialConfidence)),
  };
}

function toDate(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dayKeyFromTimestamp(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function dayKeyFromIso(value: string) {
  const parsed = toDate(value);
  if (!parsed) return "";
  return dayKeyFromTimestamp(parsed);
}

function computeDelta(records: JoyCheckinRecord[], windowDays: number) {
  if (records.length === 0) {
    return { joyDelta: 0, stabilityDelta: 0, confidenceDelta: 0 };
  }

  const latestTs = Math.max(...records.map((item) => toDate(item.createdAt)));
  const dayMs = 24 * 60 * 60 * 1000;
  const recentStart = latestTs - windowDays * dayMs;
  const priorStart = latestTs - windowDays * 2 * dayMs;

  const recent = records.filter((item) => {
    const ts = toDate(item.createdAt);
    return ts >= recentStart && ts <= latestTs;
  });

  const prior = records.filter((item) => {
    const ts = toDate(item.createdAt);
    return ts >= priorStart && ts < recentStart;
  });

  const recentAvg = averageScores(recent);
  const priorAvg = averageScores(prior.length > 0 ? prior : records.slice(0, Math.max(1, Math.floor(records.length / 2))));

  return {
    joyDelta: round2(recentAvg.joy - priorAvg.joy),
    stabilityDelta: round2(recentAvg.stability - priorAvg.stability),
    confidenceDelta: round2(recentAvg.confidence - priorAvg.confidence),
  };
}

function computeStreakDays(records: JoyCheckinRecord[]) {
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

function defaultForUndefined(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 5;
}

function scoreFromInput(input: JoyCheckinInput) {
  const joyScore = round2(average([input.joy, input.meaning, input.connection, input.play, input.calm]));
  const moneyScore = round2(input.financialConfidence);
  const lifeStabilityScore = round2(joyScore * 0.68 + moneyScore * 0.32);
  return { joyScore, moneyScore, lifeStabilityScore };
}

export function normalizeJoyCheckinInput(input: Partial<JoyCheckinInput>): JoyCheckinInput {
  return {
    joy: clamp(Math.round(defaultForUndefined(input.joy)), 1, 10),
    meaning: clamp(Math.round(defaultForUndefined(input.meaning)), 1, 10),
    connection: clamp(Math.round(defaultForUndefined(input.connection)), 1, 10),
    play: clamp(Math.round(defaultForUndefined(input.play)), 1, 10),
    calm: clamp(Math.round(defaultForUndefined(input.calm)), 1, 10),
    financialConfidence: clamp(Math.round(defaultForUndefined(input.financialConfidence)), 1, 10),
    gratitude: String(input.gratitude ?? "").trim(),
    win: String(input.win ?? "").trim(),
    intention: String(input.intention ?? "").trim(),
  };
}

export function makeJoyCheckinRecord(userId: string, input: JoyCheckinInput): JoyCheckinRecord {
  const scores = scoreFromInput(input);
  return {
    id: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    ...input,
    ...scores,
  };
}

function lowSignalAreas(record: JoyCheckinRecord) {
  const areas: string[] = [];
  if (record.joy <= 5) areas.push("joy");
  if (record.connection <= 5) areas.push("connection");
  if (record.play <= 5) areas.push("play");
  if (record.calm <= 5) areas.push("calm");
  if (record.financialConfidence <= 5) areas.push("money confidence");
  return areas;
}

function guidanceByArea(area: string) {
  if (area === "joy") return "Schedule one 20-minute activity that always lifts your mood.";
  if (area === "connection") return "Send one honest check-in text to someone who energizes you.";
  if (area === "play") return "Do one zero-pressure creative act for 15 minutes.";
  if (area === "calm") return "Take a 10-minute slow walk with no phone and long exhales.";
  return "Do one money-closing action before noon and track the result.";
}

export function buildJoyGuidance(latest: JoyCheckinRecord, previous: JoyCheckinRecord | null): JoyGuidance {
  const changed = previous ? round2(latest.lifeStabilityScore - previous.lifeStabilityScore) : 0;
  const lowAreas = lowSignalAreas(latest);
  const todayActions =
    lowAreas.length > 0
      ? lowAreas.slice(0, 3).map((area) => guidanceByArea(area))
      : [
          "Protect your strongest routine from disruption today.",
          "Compound progress by repeating yesterday's highest-leverage action.",
          "Bank one small joyful moment before work ends.",
        ];

  const headline =
    changed >= 0.5
      ? "Momentum is rising. Keep today's actions simple and repeatable."
      : changed <= -0.5
      ? "Tiny reset day. Reduce pressure and win with one joyful action plus one money action."
      : "Steady state. Your next gains come from consistency, not complexity.";

  const celebration =
    latest.win.length > 0
      ? `Win captured: ${latest.win}`
      : latest.gratitude.length > 0
      ? `Gratitude noted: ${latest.gratitude}`
      : "You showed up. Consistency is the compounding advantage.";

  return { headline, todayActions, celebration };
}

function focusOutcome(profile: JoyPlanProfile) {
  if (profile.focusArea === "energy") return "Finish the week with visibly higher daily energy.";
  if (profile.focusArea === "purpose") return "Feel clear on one meaningful direction and take real steps.";
  if (profile.focusArea === "relationships") return "Increase felt connection and reduce social drain.";
  if (profile.focusArea === "creativity") return "Ship small creative outputs that create delight and confidence.";
  if (profile.focusArea === "wealth") return "Increase financial confidence through concrete cashflow actions.";
  return "Create a week that feels light, focused, and financially grounded.";
}

function focusTheme(profile: JoyPlanProfile) {
  const base =
    profile.focusArea === "energy"
      ? "Energy-first momentum"
      : profile.focusArea === "purpose"
      ? "Purpose in motion"
      : profile.focusArea === "relationships"
      ? "Connection and coherence"
      : profile.focusArea === "creativity"
      ? "Playful creation"
      : profile.focusArea === "wealth"
      ? "Joyful wealth sprint"
      : "Balanced joy system";

  return profile.rhythm === "sprint" ? `${base}: focused 7-day sprint` : `${base}: steady 7-day rhythm`;
}

function buildDailyMap(profile: JoyPlanProfile): JoyDailyMap[] {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return days.map((day, index) => {
    const moneyAction =
      profile.focusArea === "wealth"
        ? index % 2 === 0
          ? "Reach out to 5 potential buyers or collaborators."
          : "Improve one offer sentence to increase clarity and conversions."
        : index % 2 === 0
        ? "Track spending for the day and label one low-value expense."
        : "Run one 30-minute revenue-building block before distractions.";

    const joyAction =
      profile.focusArea === "creativity"
        ? "Do 20 minutes of playful creation with no outcome pressure."
        : profile.focusArea === "relationships"
        ? "Create one meaningful connection moment with full presence."
        : profile.focusArea === "energy"
        ? "Protect a 25-minute energy ritual (walk, breath, stretch, sun)."
        : "Schedule one joy anchor: music, movement, nature, or gratitude.";

    return {
      day,
      joyAction,
      moneyAction,
      reflectionPrompt: "What gave me energy today, and what drained it?",
    };
  });
}

export function normalizeJoyPlanProfile(input: Partial<JoyPlanProfile>): JoyPlanProfile {
  const focusAreas: JoyFocusArea[] = ["energy", "purpose", "relationships", "creativity", "wealth", "balance"];
  const socialModes: JoySocialMode[] = ["solo", "mixed", "community"];
  const rhythms: JoyRhythm[] = ["steady", "sprint"];

  const focusArea = focusAreas.includes(input.focusArea as JoyFocusArea) ? (input.focusArea as JoyFocusArea) : "balance";
  const socialMode = socialModes.includes(input.socialMode as JoySocialMode) ? (input.socialMode as JoySocialMode) : "mixed";
  const rhythm = rhythms.includes(input.rhythm as JoyRhythm) ? (input.rhythm as JoyRhythm) : "steady";

  return {
    vision: String(input.vision ?? "Build a life that feels joyful, calm, and prosperous.").trim(),
    focusArea,
    availableHours: clamp(Math.round(defaultForUndefined(input.availableHours)), 2, 80),
    spendBudget: clamp(Math.round(Number(input.spendBudget ?? 0)), 0, 10000),
    socialMode,
    rhythm,
    accountabilityName: String(input.accountabilityName ?? "").trim(),
  };
}

export function buildJoyWeeklyPlan(profile: JoyPlanProfile): JoyWeeklyPlan {
  const connectionMoves =
    profile.socialMode === "solo"
      ? [
          "Schedule one low-pressure voice note exchange with someone trusted.",
          "Join one live group space for at least 20 minutes this week.",
        ]
      : profile.socialMode === "community"
      ? [
          "Host or join one shared focus session.",
          "Book one joy-focused catch-up with a friend or peer.",
        ]
      : [
          "Do one social energy check before saying yes to plans.",
          "Create one meaningful 1:1 conversation this week.",
        ];

  const moneyMoves =
    profile.focusArea === "wealth"
      ? [
          "Run a 5x5 outreach sprint: 5 days, 5 targeted messages/day.",
          "Refine your offer promise into one measurable result sentence.",
          "Close one micro-win this week, even if small.",
        ]
      : [
          "Keep a daily spending pulse in under 3 minutes.",
          "Protect one uninterrupted 30-minute money-growth block each weekday.",
          "Choose one low-joy expense to cut and redirect into an energizing investment.",
        ];

  const playExperiments = [
    "Try one novelty slot: new route, new playlist, or new creative prompt.",
    profile.spendBudget > 0
      ? `Use up to ${Math.min(profile.spendBudget, 40)} in joy budget for one meaningful experience.`
      : "Use a no-cost joy experiment: nature, movement, or spontaneous creativity.",
  ];

  const accountabilityPartner = profile.accountabilityName || "yourself";
  const checkpointDay = profile.rhythm === "sprint" ? "Thursday" : "Friday";

  return {
    planId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    profile,
    weeklyTheme: focusTheme(profile),
    priorityOutcome: focusOutcome(profile),
    joyRituals: [
      "Start each morning with a 5-minute joy intention.",
      "Do one midday nervous-system reset (breath, walk, stretch).",
      "End each day by recording one win and one gratitude line.",
    ],
    moneyMoves,
    connectionMoves,
    playExperiments,
    dailyMap: buildDailyMap(profile),
    scoreboard: [
      { metric: "Daily joy check-ins completed", target: "7/7" },
      { metric: "Revenue-building blocks", target: profile.rhythm === "sprint" ? "6 blocks" : "4 blocks" },
      { metric: "Meaningful connection moments", target: profile.socialMode === "solo" ? "2 moments" : "4 moments" },
      { metric: "Play experiments completed", target: "2 experiments" },
    ],
    accountability: {
      partner: accountabilityPartner,
      checkpointDay,
      messageTemplate: `Hey ${accountabilityPartner}, quick update: my biggest win this week was ____. My next action by tomorrow is ____.`,
    },
  };
}

export function buildJoyAnalytics(checkins: JoyCheckinRecord[], latestPlan: JoyWeeklyPlan | null): JoyAnalytics {
  const ordered = [...checkins].sort((a, b) => toDate(a.createdAt) - toDate(b.createdAt));
  const latest = ordered[ordered.length - 1] ?? null;

  const deltas: JoyAnalytics["deltas"] = [
    { period: "2w", ...computeDelta(ordered, 14) },
    { period: "4w", ...computeDelta(ordered, 28) },
    { period: "8w", ...computeDelta(ordered, 56) },
  ];

  const insights: string[] = [];
  if (!latest) {
    insights.push("Start with one daily check-in for 7 days to unlock personalized trend insights.");
  } else {
    if (latest.joyScore < 6) insights.push("Joy is currently the constraint. Add one guaranteed joy anchor before noon daily.");
    if (latest.financialConfidence < 6) insights.push("Money confidence is low. Run one measurable income action each day this week.");
    if (latest.connection < 6) insights.push("Connection is under-fueled. Prioritize two meaningful social touchpoints this week.");
    if (deltas[0].joyDelta > 0.4) insights.push("Your last 2 weeks are improving. Keep the current rhythm and avoid over-optimizing.");
    if (insights.length === 0) insights.push("Current pattern is stable and strong. Increase challenge slightly while protecting joy rituals.");
  }

  return {
    current: {
      joyScore: latest?.joyScore ?? 0,
      financialConfidence: latest?.financialConfidence ?? 0,
      lifeStabilityScore: latest?.lifeStabilityScore ?? 0,
    },
    deltas,
    streakDays: computeStreakDays(ordered),
    totalCheckins: ordered.length,
    insights,
    latestWeeklyTheme: latestPlan?.weeklyTheme ?? "No weekly theme set yet.",
  };
}
