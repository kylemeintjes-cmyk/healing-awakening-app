import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { localChat } from "@/lib/local-llm";
import { appendOracleJsonLine } from "@/lib/oracle-logs";
import { getSignProfile, type SignProfile } from "@/lib/astrology";
import { computeCurrentTransits, computeNatalChart, type NatalChartSummary, type TransitSummary } from "@/lib/birth-chart";
import { getUserOracleMemory } from "@/lib/oracle-memory";
import { getMysticKnowledgePack } from "@/lib/mystic-knowledge";

type OracleStyle = "gentle" | "direct" | "mystic" | "pragmatic";
type OracleAction = "ask" | "more_practical" | "go_deeper" | "coherence_audit" | "options_map";
type OracleIntent = "gift_discovery" | "wellbeing" | "general";
type OracleLifeArea = "general" | "work" | "relationships" | "health" | "money" | "spiritual";
type Confidence = "low" | "medium" | "high";

type MysticalProfile = {
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  birthLatitude?: number | null;
  birthLongitude?: number | null;
};

type OracleRequestBody = {
  message?: string;
  surface?: string;
  style?: OracleStyle;
  action?: OracleAction;
  lifeArea?: OracleLifeArea;
  previousReply?: string;
  mysticalProfile?: MysticalProfile;
};

type DecisionOption = {
  id: string;
  title: string;
  summary: string;
  firstStep: string;
  scores: {
    alignment: number;
    feasibility: number;
    energyCost: number;
    risk: number;
    upside: number;
  };
  total: number;
};

type DecisionEngine = {
  truth: string;
  misalignment: string[];
  options: DecisionOption[];
  recommendedOptionId: string;
  recommendedWhy: string;
  next7Days: string[];
  checkpointQuestion: string;
};

type OracleReading = {
  mirror: string;
  insights: string[];
  practice: string;
  question: string;
  followUpQuestions: string[];
  mysticalArtsUsed: string[];
  purposePath: {
    vocation: string;
    service: string;
    spiritual: string;
  };
  transitFocus: Array<{
    influence: string;
    action: string;
  }>;
  coherenceAudit: {
    outOfAlignment: string[];
    inAlignment: string[];
    nextBestMoves: string[];
  };
  optionsMap: Array<{
    option: string;
    whyNow: string;
    risk: string;
    firstStep: string;
  }>;
  decisionEngine: DecisionEngine;
  confidence: Confidence;
};

function zodiacSignFromDate(dateText?: string) {
  if (!dateText) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText.trim());
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
  return "Pisces";
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function jaccardSimilarity(a: string, b: string) {
  const setA = new Set(normalizeText(a).split(" ").filter(Boolean));
  const setB = new Set(normalizeText(b).split(" ").filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function clampScore(value: number) {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function normalizeLifeArea(value?: string): OracleLifeArea {
  if (!value) return "general";
  const v = value.toLowerCase().trim();
  if (v === "work" || v === "relationships" || v === "health" || v === "money" || v === "spiritual") return v;
  return "general";
}

function buildAreaOptions(lifeArea: OracleLifeArea) {
  switch (lifeArea) {
    case "work":
      return [
        { option: "Stabilize role and sharpen core craft", whyNow: "Improves leverage quickly without chaos.", risk: "Can feel conservative.", firstStep: "Define one measurable skill KPI and train 30 minutes daily." },
        { option: "Bridge into purpose work gradually", whyNow: "Builds aligned direction without income shock.", risk: "Progress can feel slow.", firstStep: "Reserve two weekly blocks for your aligned offer build." },
        { option: "Bold pivot sprint", whyNow: "High momentum path if misalignment is severe.", risk: "Short-term uncertainty and pressure.", firstStep: "Design a 30-day pivot plan with one public output deadline." },
      ];
    case "relationships":
      return [
        { option: "Boundary reset", whyNow: "Restores self-respect and clarity quickly.", risk: "May trigger conflict.", firstStep: "Name one non-negotiable and communicate it directly this week." },
        { option: "Repair and rebuild", whyNow: "Preserves connection while correcting patterns.", risk: "Requires sustained vulnerability.", firstStep: "Schedule one honest conversation with a clear desired outcome." },
        { option: "Conscious distance", whyNow: "Creates space when dynamics are repeatedly harmful.", risk: "Loneliness in transition.", firstStep: "Pause one draining relationship loop for 14 days." },
      ];
    case "health":
      return [
        { option: "Recovery baseline", whyNow: "Stabilizes body and focus first.", risk: "Feels less dramatic.", firstStep: "Lock sleep/wake window for 7 days." },
        { option: "Balanced progression", whyNow: "Adds sustainable momentum after stabilization.", risk: "Requires consistency.", firstStep: "Add one 20-minute daily movement block." },
        { option: "Performance push", whyNow: "Useful when baseline is strong.", risk: "Overreach risk.", firstStep: "Run a 14-day structured training cycle with recovery guardrails." },
      ];
    case "money":
      return [
        { option: "Clarity and control", whyNow: "Reduces anxiety through visibility.", risk: "Can feel restrictive.", firstStep: "Track every expense for 14 days." },
        { option: "Income expansion", whyNow: "Raises capacity while maintaining baseline.", risk: "Time pressure.", firstStep: "Launch one additional revenue experiment this month." },
        { option: "Long-horizon wealth lane", whyNow: "Compounds over years.", risk: "Requires patience.", firstStep: "Automate a fixed weekly investment transfer." },
      ];
    case "spiritual":
      return [
        { option: "Devotional structure", whyNow: "Builds coherence through rhythm.", risk: "May feel strict at first.", firstStep: "Set one daily 15-minute practice at a fixed time." },
        { option: "Integrative path", whyNow: "Connects mysticism to practical life.", risk: "Needs disciplined reflection.", firstStep: "After each practice, write one concrete life action." },
        { option: "Initiatory deep dive", whyNow: "Accelerates transformation if capacity is strong.", risk: "Can destabilize if unsupported.", firstStep: "Commit to a 40-day guided practice with weekly integration." },
      ];
    case "general":
    default:
      return [
        { option: "Alignment-first reset", whyNow: "Fastest way to reduce internal conflict.", risk: "Requires hard boundaries.", firstStep: "Remove one low-alignment task today." },
        { option: "Bridge strategy", whyNow: "Balances stability and evolution.", risk: "Can feel gradual.", firstStep: "Protect two weekly blocks for aligned work." },
        { option: "Bold expansion", whyNow: "Useful when clarity is high and action is overdue.", risk: "Higher short-term uncertainty.", firstStep: "Publish one concrete commitment and delivery date." },
      ];
  }
}

function buildDecisionEngine(args: {
  lifeArea: OracleLifeArea;
  message: string;
  mirror: string;
  coherenceAudit: { outOfAlignment: string[]; inAlignment: string[]; nextBestMoves: string[] };
  optionsMap: Array<{ option: string; whyNow: string; risk: string; firstStep: string }>;
  memory: { helpfulRate: number | null; totalFeedback: number; preferredActions: string[] };
}): DecisionEngine {
  const baseOptions = args.optionsMap.length > 0 ? args.optionsMap : buildAreaOptions(args.lifeArea);

  const scored: DecisionOption[] = baseOptions.slice(0, 3).map((item, index) => {
    const optionText = `${item.option} ${item.whyNow}`.toLowerCase();
    const riskText = item.risk.toLowerCase();
    const alignment = clampScore(6 + (optionText.includes("alignment") ? 2 : 0) + (optionText.includes("purpose") ? 1 : 0));
    const feasibility = clampScore(6 + (optionText.includes("bridge") || optionText.includes("stabilize") || optionText.includes("balanced") ? 2 : 0));
    const energyCost = clampScore(4 + (optionText.includes("bold") || optionText.includes("pivot") || optionText.includes("deep dive") ? 3 : 0));
    const risk = clampScore(4 + (riskText.includes("uncertainty") || riskText.includes("conflict") || riskText.includes("pressure") ? 3 : 0));
    const upside = clampScore(6 + (optionText.includes("expand") || optionText.includes("wealth") || optionText.includes("transform") ? 2 : 0));
    const totalRaw = alignment * 0.35 + feasibility * 0.25 + (10 - energyCost) * 0.15 + (10 - risk) * 0.1 + upside * 0.15;

    return {
      id: `option_${index + 1}`,
      title: item.option,
      summary: item.whyNow,
      firstStep: item.firstStep,
      scores: { alignment, feasibility, energyCost, risk, upside },
      total: Number(totalRaw.toFixed(2)),
    };
  });

  const recommended = scored.sort((a, b) => b.total - a.total)[0] ?? {
    id: "option_1",
    title: "Alignment-first reset",
    summary: "Best available path from current information.",
    firstStep: "Take one aligned action today.",
    scores: { alignment: 7, feasibility: 7, energyCost: 4, risk: 4, upside: 7 },
    total: 7,
  };

  const next7Days = [
    `Day 1: ${recommended.firstStep}`,
    `Day 2: Remove one behavior that feeds ${args.coherenceAudit.outOfAlignment[0] ?? "misalignment"}.`,
    `Day 3-4: Repeat one alignment ritual from your practice at the same time daily.`,
    `Day 5: Measure progress with one concrete metric tied to ${args.lifeArea}.`,
    `Day 6: Refine boundaries based on what drained or strengthened you.`,
    `Day 7: Review results and either recommit or switch to your second-best option.`,
  ];

  return {
    truth: args.mirror,
    misalignment: args.coherenceAudit.outOfAlignment.slice(0, 3),
    options: scored,
    recommendedOptionId: recommended.id,
    recommendedWhy:
      args.memory.helpfulRate != null && args.memory.helpfulRate < 0.5
        ? `${recommended.title} is recommended for stronger execution clarity and lower ambiguity.`
        : `${recommended.title} has the strongest balance of alignment, feasibility, and sustainable momentum.`,
    next7Days,
    checkpointQuestion: "After 7 days, what changed in your energy, clarity, and real-world traction?",
  };
}

function classifyIntent(message: string): OracleIntent {
  const m = normalize(message);
  const giftKeywords = [
    "gift",
    "gifts",
    "purpose",
    "calling",
    "mission",
    "soul path",
    "destiny",
    "north node",
    "what am i here to do",
    "what am i meant",
    "who am i",
    "who i am",
    "true self",
    "identity",
    "soul",
    "higher self",
  ];
  const wellbeingKeywords = ["energy", "stress", "fatigue", "symptom", "pain", "anxiety", "sleep", "burnout", "check-in", "healing plan"];

  if (giftKeywords.some((k) => m.includes(k))) return "gift_discovery";
  if (wellbeingKeywords.some((k) => m.includes(k))) return "wellbeing";
  return "general";
}

function parseReading(raw: string): OracleReading | null {
  function parseJson(text: string): OracleReading | null {
    try {
      const parsed = JSON.parse(text) as Partial<OracleReading>;
      if (
        typeof parsed.mirror !== "string" ||
        !Array.isArray(parsed.insights) ||
        typeof parsed.practice !== "string" ||
        typeof parsed.question !== "string" ||
        !Array.isArray(parsed.followUpQuestions) ||
        !Array.isArray(parsed.mysticalArtsUsed) ||
        typeof parsed.purposePath !== "object" ||
        typeof parsed.purposePath?.vocation !== "string" ||
        typeof parsed.purposePath?.service !== "string" ||
        typeof parsed.purposePath?.spiritual !== "string" ||
        !Array.isArray(parsed.transitFocus) ||
        typeof parsed.coherenceAudit !== "object" ||
        !Array.isArray(parsed.coherenceAudit?.outOfAlignment) ||
        !Array.isArray(parsed.coherenceAudit?.inAlignment) ||
        !Array.isArray(parsed.coherenceAudit?.nextBestMoves) ||
        !Array.isArray(parsed.optionsMap) ||
        typeof parsed.decisionEngine !== "object" ||
        typeof parsed.decisionEngine?.truth !== "string" ||
        !Array.isArray(parsed.decisionEngine?.misalignment) ||
        !Array.isArray(parsed.decisionEngine?.options) ||
        typeof parsed.decisionEngine?.recommendedOptionId !== "string" ||
        typeof parsed.decisionEngine?.recommendedWhy !== "string" ||
        !Array.isArray(parsed.decisionEngine?.next7Days) ||
        typeof parsed.decisionEngine?.checkpointQuestion !== "string" ||
        (parsed.confidence !== "low" && parsed.confidence !== "medium" && parsed.confidence !== "high")
      ) {
        return null;
      }

      const insights = parsed.insights.filter((i): i is string => typeof i === "string").slice(0, 3);
      if (insights.length < 3) return null;

      const followUpQuestions = parsed.followUpQuestions
        .filter((i): i is string => typeof i === "string")
        .slice(0, 4)
        .map((i) => i.trim());

      const mysticalArtsUsed = parsed.mysticalArtsUsed
        .filter((i): i is string => typeof i === "string")
        .slice(0, 6)
        .map((i) => i.trim());

      const transitFocus = parsed.transitFocus
        .filter(
          (i): i is { influence: string; action: string } =>
            typeof i === "object" &&
            typeof (i as any).influence === "string" &&
            typeof (i as any).action === "string",
        )
        .slice(0, 4)
        .map((i) => ({ influence: i.influence.trim(), action: i.action.trim() }));

      const coherenceAudit = {
        outOfAlignment: parsed.coherenceAudit.outOfAlignment
          .filter((i): i is string => typeof i === "string")
          .slice(0, 4)
          .map((i) => i.trim()),
        inAlignment: parsed.coherenceAudit.inAlignment
          .filter((i): i is string => typeof i === "string")
          .slice(0, 4)
          .map((i) => i.trim()),
        nextBestMoves: parsed.coherenceAudit.nextBestMoves
          .filter((i): i is string => typeof i === "string")
          .slice(0, 4)
          .map((i) => i.trim()),
      };

      const optionsMap = parsed.optionsMap
        .filter(
          (i): i is { option: string; whyNow: string; risk: string; firstStep: string } =>
            typeof i === "object" &&
            typeof (i as any).option === "string" &&
            typeof (i as any).whyNow === "string" &&
            typeof (i as any).risk === "string" &&
            typeof (i as any).firstStep === "string",
        )
        .slice(0, 3)
        .map((i) => ({
          option: i.option.trim(),
          whyNow: i.whyNow.trim(),
          risk: i.risk.trim(),
          firstStep: i.firstStep.trim(),
        }));

      const decisionOptions = parsed.decisionEngine.options
        .filter(
          (i): i is DecisionOption =>
            typeof i === "object" &&
            typeof (i as any).id === "string" &&
            typeof (i as any).title === "string" &&
            typeof (i as any).summary === "string" &&
            typeof (i as any).firstStep === "string" &&
            typeof (i as any).scores === "object" &&
            typeof (i as any).scores.alignment === "number" &&
            typeof (i as any).scores.feasibility === "number" &&
            typeof (i as any).scores.energyCost === "number" &&
            typeof (i as any).scores.risk === "number" &&
            typeof (i as any).scores.upside === "number" &&
            typeof (i as any).total === "number",
        )
        .slice(0, 3)
        .map((i) => ({
          id: i.id.trim(),
          title: i.title.trim(),
          summary: i.summary.trim(),
          firstStep: i.firstStep.trim(),
          scores: {
            alignment: clampScore(i.scores.alignment),
            feasibility: clampScore(i.scores.feasibility),
            energyCost: clampScore(i.scores.energyCost),
            risk: clampScore(i.scores.risk),
            upside: clampScore(i.scores.upside),
          },
          total: Number(i.total.toFixed(2)),
        }));
      if (decisionOptions.length < 2) return null;

      return {
        mirror: parsed.mirror.trim(),
        insights: insights.map((i) => i.trim()),
        practice: parsed.practice.trim(),
        question: parsed.question.trim(),
        followUpQuestions,
        mysticalArtsUsed,
        purposePath: {
          vocation: parsed.purposePath.vocation.trim(),
          service: parsed.purposePath.service.trim(),
          spiritual: parsed.purposePath.spiritual.trim(),
        },
        transitFocus,
        coherenceAudit,
        optionsMap,
        decisionEngine: {
          truth: parsed.decisionEngine.truth.trim(),
          misalignment: parsed.decisionEngine.misalignment
            .filter((i): i is string => typeof i === "string")
            .slice(0, 4)
            .map((i) => i.trim()),
          options: decisionOptions,
          recommendedOptionId: parsed.decisionEngine.recommendedOptionId.trim(),
          recommendedWhy: parsed.decisionEngine.recommendedWhy.trim(),
          next7Days: parsed.decisionEngine.next7Days
            .filter((i): i is string => typeof i === "string")
            .slice(0, 7)
            .map((i) => i.trim()),
          checkpointQuestion: parsed.decisionEngine.checkpointQuestion.trim(),
        },
        confidence: parsed.confidence,
      };
    } catch {
      return null;
    }
  }

  const direct = parseJson(raw);
  if (direct) return direct;

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return parseJson(raw.slice(firstBrace, lastBrace + 1));
  }

  return null;
}

function buildStyleInstruction(style: OracleStyle) {
  switch (style) {
    case "direct":
      return "Tone: direct, clear, concise.";
    case "mystic":
      return "Tone: symbolic and mystical, but still specific.";
    case "pragmatic":
      return "Tone: practical coach, concrete steps first.";
    case "gentle":
    default:
      return "Tone: gentle, compassionate, stabilizing.";
  }
}

function fallbackGiftReading(
  profile: MysticalProfile | undefined,
  action: OracleAction,
  signProfile: SignProfile | null,
  chart: NatalChartSummary | null,
  transits: TransitSummary | null,
  lifeArea: OracleLifeArea,
  message: string,
  memory: { helpfulRate: number | null; totalFeedback: number; preferredActions: string[] },
): OracleReading {
  const missing: string[] = [];
  if (!profile?.birthDate) missing.push("birth date");
  if (!profile?.birthTime) missing.push("birth time");
  if (!profile?.birthPlace && (profile?.birthLatitude == null || profile?.birthLongitude == null)) missing.push("birth place or coordinates");

  const sign = signProfile?.sign ?? chart?.sunSign ?? zodiacSignFromDate(profile?.birthDate);
  const hasAstroInputs = missing.length === 0;
  const deepMode = action === "go_deeper";
  const practicalMode = action === "more_practical";
  const coherenceMode = action === "coherence_audit";
  const optionsMode = action === "options_map";

  const gift = signProfile?.gifts[0] ?? "intuitive communication";
  const purposePath = signProfile?.purposePaths[0] ?? "service";
  const shadow = signProfile?.shadows[0] ?? "overextension";
  const prompt = signProfile?.prompts[0] ?? "Where do you feel naturally useful and alive?";
  const moon = chart?.moonSign ?? "unknown";
  const asc = chart?.ascendantSign ?? "unknown";
  const dominantElement = chart?.dominantElement ?? "Water";
  const topAspect = chart?.aspects?.[0];
  const topTransit = transits?.influences?.[0];

  const optionsMap = optionsMode
    ? [
        {
          option: "Best alignment path",
          whyNow: `Build around ${gift} with a clear weekly offering.`,
          risk: "Fear of being visible or inconsistent momentum.",
          firstStep: "Design a 4-week micro-offer and deliver week 1 now.",
        },
        {
          option: "Safest stabilizing path",
          whyNow: "Keep financial/energy stability while testing purpose in small blocks.",
          risk: "Over-stability can delay meaningful direction changes.",
          firstStep: "Reserve two weekly blocks dedicated to purpose experiments.",
        },
        {
          option: "Bold expansion path",
          whyNow: "Use current transit momentum to commit publicly to your work.",
          risk: "Overcommitment without boundaries.",
          firstStep: "Publish one clear promise and one first deliverable date.",
        },
      ]
    : [];

  const coherenceAudit = {
    outOfAlignment: coherenceMode
      ? [
          `Over-adapting to external expectations can suppress your ${gift}.`,
          `Scattered commitments may dilute your ${purposePath} lane.`,
        ]
      : [`Watch for ${shadow} when you say yes to roles that do not fit your core gifts.`],
    inAlignment: [
      `You are aligned when your ${sign ?? "core"} sensitivity is used in service to others.`,
      `Consistency and meaningful contribution increase your coherence.`,
    ],
    nextBestMoves: coherenceMode
      ? [
          "Stop one draining commitment this week.",
          "Protect one non-negotiable daily alignment ritual (10-15 min).",
          "Choose one service lane and commit to it for 30 days.",
        ]
      : ["Track where you feel most alive after helping others this week."],
  };

  return {
    mirror: hasAstroInputs
      ? deepMode
        ? `Your ${sign ?? "core"} pattern points to soul-level work: turning sensitivity into service with boundaries.`
        : `Your ${sign ?? "core"} signature suggests purpose through service and expression.`
      : "Your question points to a real desire to understand your deeper path, not just get quick reassurance.",
    insights: [
      hasAstroInputs ? `Astrology lens (${sign ?? "unknown sign"}): primary gift is ${gift}.` : "Your gifts are likely strongest where intuition and communication intersect.",
      hasAstroInputs ? `Chart synthesis: Moon in ${moon}, Ascendant in ${asc}, dominant ${dominantElement.toLowerCase()} element.` : "When you guide others through uncertainty, your energy becomes more coherent.",
      optionsMode
        ? "You need option architecture: compare choices by alignment, energy cost, and long-term compounding."
        : practicalMode
        ? `Growth edge: reduce ${shadow} by turning insight into one repeatable weekly contribution.`
        : `Growth edge: watch for ${shadow} while building ${purposePath} through consistent practice.`,
    ],
    practice: practicalMode
      ? "This week: offer one 20-minute clarity session to someone and ask what shifted for them in one sentence."
      : "For 10 minutes, journal three moments where people felt calmer or clearer after speaking with you.",
    question: hasAstroInputs
      ? topAspect
        ? `${prompt} How does your ${topAspect.type.toLowerCase()} between ${topAspect.point1} and ${topAspect.point2} show up in your life decisions?`
        : prompt
      : "Which of those moments felt most effortless and alive?",
    followUpQuestions:
      missing.length > 0
      ? [
            `To include astrology accurately, share your ${missing.join(", ")}.`,
            "Do you want a tarot 3-card gifts spread while we wait for full birth data?",
          ]
        : [
            "Do you want this translated into a concrete 90-day purpose experiment with weekly milestones?",
            "Should I run a coherence audit next (where you are in/out of alignment)?",
            "Do you want options mapping next (best, safest, and boldest path)?",
          ],
    mysticalArtsUsed: hasAstroInputs
      ? ["natal chart", "house analysis", "current transits", "astrology inference", "oracle inquiry"]
      : ["archetypal reflection", "oracle inquiry"],
    purposePath: {
      vocation: chart?.purposePath.vocationLane ?? `Build vocation around ${purposePath}.`,
      service: chart?.purposePath.serviceLane ?? "Serve by helping people move from confusion to clarity.",
      spiritual: chart?.purposePath.spiritualLane ?? "Protect your sensitivity with ritual boundaries.",
    },
    transitFocus: topTransit
      ? [{ influence: topTransit.interpretation, action: topTransit.action }]
      : [
          {
            influence: "No strong transit lock detected right now; focus on stable long-term cultivation.",
            action: "Commit to one weekly gifts practice and track results for 6 weeks.",
          },
        ],
    coherenceAudit,
    optionsMap,
    decisionEngine: buildDecisionEngine({ lifeArea, message, mirror: hasAstroInputs ? `Your ${sign ?? "core"} signature suggests purpose through service and expression.` : "Your question points to a real desire to understand your deeper path.", coherenceAudit, optionsMap, memory }),
    confidence: missing.length > 0 ? "low" : "medium",
  };
}

function fallbackWellbeingReading(
  intensity: string,
  action: OracleAction,
  lifeArea: OracleLifeArea,
  message: string,
  memory: { helpfulRate: number | null; totalFeedback: number; preferredActions: string[] },
): OracleReading {
  const deepMode = action === "go_deeper";
  const practicalMode = action === "more_practical";
  const optionsMode = action === "options_map";
  const optionsMap = optionsMode
    ? [
        {
          option: "Recovery-first path",
          whyNow: `Current ${intensity} load suggests regulation before expansion.`,
          risk: "Can feel slow if you expect immediate transformation.",
          firstStep: "Block a 7-day recovery rhythm with fixed sleep + nervous-system practice.",
        },
        {
          option: "Balanced rebuild path",
          whyNow: "Improves stability while rebuilding momentum in small, reliable steps.",
          risk: "May require saying no to non-essential commitments.",
          firstStep: "Choose one priority and cap all other goals for the next 14 days.",
        },
        {
          option: "Momentum push path",
          whyNow: "Useful if your baseline is stable and you need decisive progress.",
          risk: "Risk of relapse into burnout if signs of overload are ignored.",
          firstStep: "Run a 7-day focused sprint with one output and one recovery protocol.",
        },
      ]
    : [];

  const coherenceAudit = {
    outOfAlignment: ["Overriding body signals for productivity can reduce clarity."],
    inAlignment: ["Steady daily regulation improves emotional and spiritual coherence."],
    nextBestMoves: ["Keep one repeatable ritual at the same time for 7 days."],
  };

  return {
    mirror: deepMode
      ? "Your nervous system is asking for ritual coherence: less force, more faithful repetition."
      : "Your system is asking for consistency over intensity right now.",
    insights: [
      `Your recent pattern suggests ${intensity} pacing is the safest lever.`,
      deepMode ? "When your body feels safe, your intuition gets clearer." : "Nervous-system steadiness will unlock better clarity than pushing harder.",
      practicalMode ? "Choose one ritual and do it at the same hour for 7 days." : "Small repeated rituals are your highest-return move this week.",
    ],
    practice: practicalMode
      ? "For 7 days: 5 minutes daily, exhale-focused breathing, then log stress from 1-10."
      : "For 6 minutes today: hand on chest, long exhale breathing, and one sentence of self-permission.",
    question: "Do you want a 5-minute, 10-minute, or 15-minute ritual plan?",
    followUpQuestions: [],
    mysticalArtsUsed: ["somatic grounding"],
    purposePath: {
      vocation: "Stabilize your baseline before major vocation decisions.",
      service: "Offer support in small sustainable doses.",
      spiritual: "Prioritize nervous-system safety as spiritual discipline.",
    },
    transitFocus: [],
    coherenceAudit,
    optionsMap,
    decisionEngine: buildDecisionEngine({ lifeArea, message, mirror: deepMode ? "Your nervous system is asking for ritual coherence." : "Your system is asking for consistency over intensity right now.", coherenceAudit, optionsMap, memory }),
    confidence: "medium",
  };
}

function fallbackGeneralReading(
  action: OracleAction,
  signProfile: SignProfile | null,
  chart: NatalChartSummary | null,
  transits: TransitSummary | null,
  lifeArea: OracleLifeArea,
  message: string,
  memory: { helpfulRate: number | null; totalFeedback: number; preferredActions: string[] },
): OracleReading {
  const deepMode = action === "go_deeper";
  const coherenceMode = action === "coherence_audit";
  const optionsMode = action === "options_map";
  const sign = signProfile?.sign ?? chart?.sunSign ?? "your core signature";
  const moon = chart?.moonSign ?? "unknown";
  const asc = chart?.ascendantSign ?? "unknown";
  const topTransit = transits?.influences?.[0];

  const optionsMap = optionsMode
    ? [
        {
          option: "Alignment-first reset",
          whyNow: "Quickly restores coherence and identity clarity.",
          risk: "Requires uncomfortable boundary conversations.",
          firstStep: "Write a clear 'stop doing' list and remove one item today.",
        },
        {
          option: "Bridge strategy",
          whyNow: "Keeps stability while building your true direction.",
          risk: "Progress may feel slower.",
          firstStep: "Time-block two focused sessions weekly for aligned work.",
        },
        {
          option: "Leap strategy",
          whyNow: "Accelerates identity integration through decisive commitment.",
          risk: "Higher short-term uncertainty.",
          firstStep: "Define a 30-day sprint with measurable output and accountability.",
        },
      ]
    : [];

  const coherenceAudit = {
    outOfAlignment: coherenceMode
      ? [
          "Living by external approval instead of inner truth.",
          "Saying yes to roles that drain energy but signal status.",
        ]
      : ["Watch where you keep performing an identity that no longer fits."],
    inAlignment: [
      "Aligned choices feel both calming and energizing over time.",
      "Your strongest coherence comes from honest boundaries plus meaningful contribution.",
    ],
    nextBestMoves: coherenceMode
      ? [
          "Name one non-negotiable value and enforce it this week.",
          "Remove one low-alignment task from your calendar.",
          "Add one high-alignment action before noon each day.",
        ]
      : ["Notice one moment today where your action matched your deepest values."],
  };

  return {
    mirror: deepMode
      ? `Your question asks for essence-level truth: ${sign} seeks meaning through lived integrity, not labels.`
      : `You are not one fixed label; your ${sign} pattern unfolds through how you choose to live and serve.`,
    insights: [
      chart
        ? `Chart lens: Sun ${chart.sunSign}, Moon ${moon}, Ascendant ${asc} suggests identity through both intuition and grounded action.`
        : "Identity clarifies when you track what consistently gives you energy, meaning, and impact.",
      signProfile
        ? `${signProfile.sign} medicine: ${signProfile.gifts[0] ?? "intuitive insight"} in service of ${signProfile.purposePaths[0] ?? "purposeful contribution"}.`
        : "Your gifts become visible where your natural sensitivity meets responsibility.",
      optionsMode
        ? "Decision quality improves when you compare options by alignment, feasibility, and compounding impact."
        : deepMode
        ? "Growth edge: release borrowed identities and commit to one life-direction experiment for 90 days."
        : "Growth edge: stop seeking one final answer and build identity through repeatable aligned choices.",
    ],
    practice:
      "Write three columns: What drains me, what steadies me, what makes me feel unmistakably alive. Choose one action from column three today.",
    question: "Where in your current life are you betraying what you already know is true about yourself?",
    followUpQuestions: chart
      ? [
          "Do you want me to map this into a 90-day purpose path using your houses 2/6/10?",
          "Should I run a coherence audit (misalignment vs alignment) on your current life?",
          "Do you want three practical options ranked by alignment and risk?",
        ]
      : ["Share full birth date, time, and place if you want a precise identity reading from your natal chart."],
    mysticalArtsUsed: chart ? ["natal chart", "astrology inference", "oracle inquiry"] : ["oracle inquiry", "archetypal reflection"],
    purposePath: {
      vocation: chart?.purposePath.vocationLane ?? "Choose work where your natural pattern creates measurable value.",
      service: chart?.purposePath.serviceLane ?? "Serve through one domain where people repeatedly seek your help.",
      spiritual: chart?.purposePath.spiritualLane ?? "Practice alignment daily: truth, boundaries, and devotion to what matters.",
    },
    transitFocus: topTransit
      ? [{ influence: topTransit.interpretation, action: topTransit.action }]
      : [],
    coherenceAudit,
    optionsMap,
    decisionEngine: buildDecisionEngine({ lifeArea, message, mirror: deepMode ? `Your question asks for essence-level truth: ${sign} seeks meaning through lived integrity, not labels.` : `You are not one fixed label; your ${sign} pattern unfolds through how you choose to live and serve.`, coherenceAudit, optionsMap, memory }),
    confidence: chart ? "medium" : "low",
  };
}

function readingToReply(reading: OracleReading) {
  return [
    reading.mirror,
    "",
    `- ${reading.insights[0]}`,
    `- ${reading.insights[1]}`,
    `- ${reading.insights[2]}`,
    "",
    `Purpose Path:`,
    `- Vocation: ${reading.purposePath.vocation}`,
    `- Service: ${reading.purposePath.service}`,
    `- Spiritual: ${reading.purposePath.spiritual}`,
    "",
    `Coherence Audit:`,
    ...reading.coherenceAudit.outOfAlignment.map((i) => `- Out of alignment: ${i}`),
    ...reading.coherenceAudit.inAlignment.map((i) => `- In alignment: ${i}`),
    ...reading.coherenceAudit.nextBestMoves.map((i) => `- Next move: ${i}`),
    ...(reading.optionsMap.length
      ? [
          "",
          "Options Map:",
          ...reading.optionsMap.flatMap((o) => [
            `- Option: ${o.option}`,
            `  Why now: ${o.whyNow}`,
            `  Risk: ${o.risk}`,
            `  First step: ${o.firstStep}`,
          ]),
        ]
      : []),
    "",
    `Decision Engine:`,
    `- Truth: ${reading.decisionEngine.truth}`,
    ...reading.decisionEngine.misalignment.map((m) => `- Misalignment: ${m}`),
    ...reading.decisionEngine.options.map((o) => `- ${o.id} ${o.title} [total ${o.total}]`),
    `- Recommended: ${reading.decisionEngine.recommendedOptionId}`,
    `- Why: ${reading.decisionEngine.recommendedWhy}`,
    ...reading.decisionEngine.next7Days.map((d) => `- ${d}`),
    `- Checkpoint: ${reading.decisionEngine.checkpointQuestion}`,
    ...(reading.transitFocus.length
      ? ["", "Current Transits:", ...reading.transitFocus.map((t) => `- ${t.influence} Action: ${t.action}`)]
      : []),
    "",
    `Practice: ${reading.practice}`,
    `Question: ${reading.question}`,
  ].join("\n");
}

function buildRetryHint(action: OracleAction) {
  if (action === "more_practical") return "Revision target: less abstract, more concrete and measurable actions.";
  if (action === "go_deeper") return "Revision target: deeper mystical symbolism without losing specificity.";
  if (action === "coherence_audit") return "Revision target: explicitly identify misalignment, alignment, and 3 concrete next moves.";
  if (action === "options_map") return "Revision target: provide 3 distinct life-path options with risks and first steps.";
  return "";
}

export async function POST(request: Request) {
  const user = await requireUser(request as any);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as OracleRequestBody;
  const traceId = crypto.randomUUID();
  const style: OracleStyle = body.style ?? "gentle";
  const action: OracleAction = body.action ?? "ask";
  const lifeArea = normalizeLifeArea(body.lifeArea);
  const message = body.message?.trim() ?? "";
  const baseIntent = classifyIntent(message);

  const [profile, checkins, sessions, userMemory] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.uid }, select: { onboarding: true } }),
    prisma.checkin.findMany({ where: { userId: user.uid }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.sessionContent.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    getUserOracleMemory(user.uid),
  ]);

  const onboarding = (profile?.onboarding ?? {}) as { intent?: string; styles?: string[] };
  const intentTokens = onboarding.intent ? normalize(onboarding.intent).split(/[,.;]/).map((item) => item.trim()) : [];
  const styleTokens = (onboarding.styles ?? []).map((item) => normalize(item));

  const avgEnergy = avg(checkins.map((item: { energy: number }) => item.energy)) || 3;
  const avgStress = avg(checkins.map((item: { stress: number }) => item.stress)) || 3;
  const avgTension = avg(checkins.map((item: { tension: number }) => item.tension)) || 3;
  const preferredIntensity = avgEnergy <= 2 || avgStress >= 4 || avgTension >= 4 ? "gentle" : avgEnergy >= 4 ? "deep" : "medium";

  const scored = sessions.map((session: { tags: unknown; intensity: string }) => {
    const tags = Array.isArray(session.tags) ? (session.tags as string[]).map((tag) => normalize(tag)) : [];
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

  const recommendationLines = recommended.length
    ? recommended.map((session: { title?: string; intensity: string }) => `${session.title ?? "Untitled"} (${session.intensity})`).join("; ")
    : "none";

  const chartResult = computeNatalChart(body.mysticalProfile ?? {});
  const natalChart = chartResult.chart;
  const missingAstroData = chartResult.missing;
  const transitResult = computeCurrentTransits(body.mysticalProfile ?? {}, natalChart);
  const transits = transitResult.transits;
  const hasCompleteAstro = missingAstroData.length === 0;
  const intent: OracleIntent = baseIntent === "general" && hasCompleteAstro ? "gift_discovery" : baseIntent;

  const zodiacSign = natalChart?.sunSign ?? zodiacSignFromDate(body.mysticalProfile?.birthDate);
  const signProfile = getSignProfile(zodiacSign);
  const mysticPack = getMysticKnowledgePack({ lifeArea, sign: zodiacSign });

  let source: "local-llm" | "fallback" = "fallback";
  let reading: OracleReading;
  if (intent === "gift_discovery") {
    reading = fallbackGiftReading(body.mysticalProfile, action, signProfile, natalChart, transits, lifeArea, message, userMemory);
  } else if (intent === "wellbeing") {
    reading = fallbackWellbeingReading(preferredIntensity, action, lifeArea, message, userMemory);
  } else {
    reading = fallbackGeneralReading(action, signProfile, natalChart, transits, lifeArea, message, userMemory);
  }
  let rawModel = "";
  const rejectedReasons: string[] = [];

  const chartContextBlock = natalChart
    ? [
        `Natal chart summary:`,
        `- Sun: ${natalChart.sunSign}`,
        `- Moon: ${natalChart.moonSign}`,
        `- Ascendant: ${natalChart.ascendantSign}`,
        `- Midheaven: ${natalChart.midheavenSign}`,
        `- Dominant element: ${natalChart.dominantElement}`,
        `- Purpose path: ${natalChart.purposePath.vocationLane} | ${natalChart.purposePath.serviceLane} | ${natalChart.purposePath.spiritualLane}`,
        `- Top aspects: ${natalChart.aspects.slice(0, 3).map((a) => `${a.point1}-${a.point2} ${a.type} orb ${a.orb.toFixed(2)}`).join("; ") || "none"}`,
      ].join("\n")
    : `Natal chart unavailable${chartResult.error ? ` (${chartResult.error})` : ""}.`;

  const transitContextBlock = transits
    ? `Current transits: ${transits.influences.map((i) => `${i.transitBody} ${i.aspect} ${i.natalPoint} (orb ${i.orb})`).join("; ") || "none"}`
    : `Current transits unavailable${transitResult.error ? ` (${transitResult.error})` : ""}.`;

  const signContextBlock = signProfile && missingAstroData.length === 0
    ? [
        `Sign profile for ${signProfile.sign}:`,
        `- Element: ${signProfile.element}`,
        `- Modality: ${signProfile.modality}`,
        `- Ruler: ${signProfile.ruler}`,
        `- Core theme: ${signProfile.coreTheme}`,
        `- Gifts: ${signProfile.gifts.join(", ")}`,
        `- Purpose paths: ${signProfile.purposePaths.join(", ")}`,
        `- Shadows: ${signProfile.shadows.join(", ")}`,
      ].join("\n")
    : "No complete sign profile available yet.";

  const systemPrompt = [
    "You are an oracle that blends practical support with mystical systems.",
    buildStyleInstruction(style),
    `Primary intent: ${intent}.`,
    `Primary life area: ${lifeArea}.`,
    "Rules:",
    "- Return ONLY valid JSON with keys: mirror, insights, practice, question, followUpQuestions, mysticalArtsUsed, purposePath, transitFocus, coherenceAudit, optionsMap, decisionEngine, confidence.",
    "- insights must be exactly 3 short bullet-ready strings.",
    "- purposePath must contain vocation/service/spiritual lanes.",
    "- coherenceAudit must contain outOfAlignment/inAlignment/nextBestMoves arrays.",
    "- optionsMap should contain up to 3 options with option/whyNow/risk/firstStep.",
    "- decisionEngine must contain truth, misalignment, options, recommendedOptionId, recommendedWhy, next7Days, checkpointQuestion.",
    "- decisionEngine.options must include scorecards: alignment, feasibility, energyCost, risk, upside, total.",
    "- if Action mode is options_map, optionsMap must contain at least 2 concrete options.",
    "- include at least one transitFocus item when transit data exists.",
    "- followUpQuestions should include at least 1 item when key mystical data is missing.",
    "- For gift_discovery with known chart/sign profile, explicitly ground in natal + sign context.",
    "- Use astrology/tarot/archetypal language only as inference, never certainty.",
    "- Keep response concise for speed."
  ].join("\n");

  const userPrompt = [
    `User message: ${message}`,
    `Action mode: ${action}`,
    `Life area focus: ${lifeArea}`,
    `Previous reply: ${body.previousReply ?? "none"}`,
    `Onboarding intent: ${onboarding.intent ?? "none"}`,
    `Avg energy/stress/tension: ${avgEnergy.toFixed(1)}/${avgStress.toFixed(1)}/${avgTension.toFixed(1)}`,
    `Recommended sessions: ${recommendationLines}`,
    `Mystical profile: birthDate=${body.mysticalProfile?.birthDate ?? "missing"}, birthTime=${body.mysticalProfile?.birthTime ?? "missing"}, birthPlace=${body.mysticalProfile?.birthPlace ?? "missing"}`,
    `Coordinates override: lat=${body.mysticalProfile?.birthLatitude ?? "none"}, lon=${body.mysticalProfile?.birthLongitude ?? "none"}`,
    `User memory helpfulRate: ${userMemory.helpfulRate == null ? "none" : userMemory.helpfulRate.toFixed(2)} (from ${userMemory.totalFeedback} feedback items)`,
    `User preferred actions: ${userMemory.preferredActions.join(", ") || "none"}`,
    `Recent commitments: ${userMemory.recentCommitments.map((c) => `${c.optionTitle} (${c.lifeArea})`).join("; ") || "none"}`,
    `Mystic pack coherence questions: ${mysticPack.coherenceQuestions.join(" | ")}`,
    `Mystic pack tarot archetypes: ${mysticPack.tarotArchetypes.join(", ")}`,
    chartContextBlock,
    transitContextBlock,
    signContextBlock,
    missingAstroData.length ? `Missing astrology inputs: ${missingAstroData.join(", ")}. Ask for them in followUpQuestions.` : "Astrology inputs present: use them for gift-oriented interpretation.",
    buildRetryHint(action),
  ].join("\n");

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      rawModel = await localChat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          temperature: style === "mystic" ? 0.55 : 0.4,
          maxTokens: action === "ask" ? 220 : 260,
        },
      );

      const parsed = parseReading(rawModel);
      if (!parsed) {
        rejectedReasons.push("invalid JSON schema");
        continue;
      }

      const newReply = readingToReply(parsed);
      if (action !== "ask" && body.previousReply?.trim()) {
        const sim = jaccardSimilarity(newReply, body.previousReply);
        if (sim > 0.82) {
          rejectedReasons.push("rewrite too similar to previous reply");
          continue;
        }
      }

      if (intent === "gift_discovery" && parsed.mysticalArtsUsed.length === 0) {
        rejectedReasons.push("missing mystical arts in output");
        continue;
      }
      if (intent === "gift_discovery" && missingAstroData.length > 0 && parsed.followUpQuestions.length === 0) {
        rejectedReasons.push("missing follow-up questions for astrology data");
        continue;
      }
      if (intent === "gift_discovery" && signProfile && missingAstroData.length === 0) {
        const combined = `${parsed.mirror} ${parsed.insights.join(" ")} ${parsed.practice} ${parsed.question}`.toLowerCase();
        const keyHints = [
          signProfile.sign.toLowerCase(),
          signProfile.element.toLowerCase(),
          ...signProfile.gifts.map((g) => g.toLowerCase().split(" ")[0]),
          ...signProfile.purposePaths.map((p) => p.toLowerCase().split(" ")[0]),
        ];
        if (!keyHints.some((hint) => combined.includes(hint))) {
          rejectedReasons.push("missing sign-specific context");
          continue;
        }
      }
      if (intent === "gift_discovery" && natalChart && missingAstroData.length === 0) {
        const combined = `${parsed.mirror} ${parsed.insights.join(" ")} ${parsed.practice} ${parsed.question}`.toLowerCase();
        const chartHints = [
          natalChart.sunSign.toLowerCase(),
          natalChart.moonSign.toLowerCase(),
          natalChart.ascendantSign.toLowerCase(),
          natalChart.dominantElement.toLowerCase(),
        ];
        if (!chartHints.some((hint) => combined.includes(hint))) {
          rejectedReasons.push("missing natal-chart context");
          continue;
        }
      }
      if (intent === "gift_discovery" && transits && transits.influences.length > 0) {
        const combined = `${parsed.mirror} ${parsed.insights.join(" ")} ${parsed.transitFocus.map((t) => `${t.influence} ${t.action}`).join(" ")}`.toLowerCase();
        const transitHint = transits.influences[0].transitBody.toLowerCase();
        if (!combined.includes(transitHint)) {
          rejectedReasons.push("missing current transit context");
          continue;
        }
      }
      if (action === "options_map" && parsed.optionsMap.length < 2) {
        rejectedReasons.push("insufficient options map detail");
        continue;
      }
      if (action === "coherence_audit" && parsed.coherenceAudit.nextBestMoves.length < 2) {
        rejectedReasons.push("insufficient coherence audit detail");
        continue;
      }
      if (parsed.decisionEngine.options.length < 2) {
        rejectedReasons.push("insufficient decision engine options");
        continue;
      }
      if (!parsed.decisionEngine.recommendedOptionId.trim()) {
        rejectedReasons.push("missing recommended option");
        continue;
      }

      reading = parsed;
      source = "local-llm";
      break;
    }
  } catch {
    // keep fallback
  }

  const reply = readingToReply(reading);

  try {
    await appendOracleJsonLine("oracle-runs.jsonl", {
      traceId,
      createdAt: new Date().toISOString(),
      userId: user.uid,
      source,
      model: process.env.LOCAL_LLM_MODEL ?? null,
      surface: body.surface ?? "unknown",
      style,
      action,
      lifeArea,
      intent,
      zodiacSign,
      natalChart,
      transits,
      message,
      mysticalProfile: body.mysticalProfile ?? null,
      reading,
      reply,
      rawModel,
      recommendationCount: recommended.length,
      preferredIntensity,
      userMemory,
      mysticPack,
      rejectedReasons,
    });
  } catch {
    // do not block response
  }

  return NextResponse.json({
    traceId,
    source,
    model: process.env.LOCAL_LLM_MODEL ?? null,
    style,
    action,
    lifeArea,
    intent,
    zodiacSign,
    natalChart,
    transits,
    message,
    reading,
    reply,
    question: reading.question,
    recommendations: recommended,
    rejectedReasons,
  });
}
