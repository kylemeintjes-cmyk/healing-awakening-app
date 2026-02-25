import type { HumanCheckinRecord, HumanGuidance } from "@/lib/human-engine";

export type HumanGuidanceSource = "fine_tuned_model" | "deterministic";

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type HumanGuidanceResult = {
  guidance: HumanGuidance;
  source: HumanGuidanceSource;
  model: string | null;
};

type BuildGuidanceArgs = {
  entry: HumanCheckinRecord;
  previous: HumanCheckinRecord | null;
  fallback: HumanGuidance;
};

function compact(value: string | undefined | null, maxLength: number) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function normalizeGuidance(candidate: unknown, fallback: HumanGuidance): HumanGuidance {
  if (!candidate || typeof candidate !== "object") return fallback;
  const maybe = candidate as Partial<HumanGuidance>;

  const diagnosis = compact(maybe.diagnosis, 180) || fallback.diagnosis;
  const winCondition = compact(maybe.winCondition, 180) || fallback.winCondition;

  const protocol = Array.isArray(maybe.todayProtocol)
    ? maybe.todayProtocol.map((item) => compact(String(item), 160)).filter(Boolean).slice(0, 3)
    : [];

  const todayProtocol =
    protocol.length === 3
      ? protocol
      : [
          protocol[0] || fallback.todayProtocol[0],
          protocol[1] || fallback.todayProtocol[1],
          protocol[2] || fallback.todayProtocol[2],
        ].filter(Boolean);

  return {
    diagnosis,
    todayProtocol,
    winCondition,
  };
}

function getFineTunedModel() {
  const value = process.env.HUMAN_FT_MODEL?.trim();
  return value && value.length > 0 ? value : null;
}

function getApiKey() {
  const value = process.env.OPENAI_API_KEY?.trim();
  return value && value.length > 0 ? value : null;
}

function buildPrompt(entry: HumanCheckinRecord, previous: HumanCheckinRecord | null) {
  const delta = previous ? Math.round((entry.operatingScore - previous.operatingScore) * 100) / 100 : 0;
  return JSON.stringify(
    {
      operatingScore: entry.operatingScore,
      clarityScore: entry.clarityScore,
      executionScore: entry.executionScore,
      stabilityScore: entry.stabilityScore,
      incomeScore: entry.incomeScore,
      stressLoad: entry.stressLoad,
      priority: entry.priority || null,
      biggestBlocker: entry.biggestBlocker || null,
      note: entry.note || null,
      operatingDeltaFromPrevious: delta,
    },
    null,
    2,
  );
}

export async function buildHumanModelGuidance(args: BuildGuidanceArgs): Promise<HumanGuidanceResult> {
  const model = getFineTunedModel();
  const apiKey = getApiKey();
  if (!model || !apiKey) {
    return {
      guidance: args.fallback,
      source: "deterministic",
      model: null,
    };
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.HUMAN_MODEL_TIMEOUT_MS ?? 18000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 280,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are Human OS, a high-performance self-regulation coach. Return strict JSON only with keys diagnosis, todayProtocol, winCondition. todayProtocol must contain exactly 3 short, concrete actions. Keep tone practical, direct, and optimistic. Avoid crisis language and avoid therapy disclaimers.",
          },
          {
            role: "user",
            content: `Daily state:\n${buildPrompt(args.entry, args.previous)}\n\nBuild today's guidance with measurable actions that improve clarity, execution, stability, or income confidence.`,
          },
        ],
      }),
      signal: controller.signal,
    });

    const payload = (await response.json()) as OpenAIChatResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message || `OpenAI request failed (${response.status}).`);
    }

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Model returned empty guidance.");
    }

    const parsed = JSON.parse(content) as unknown;
    return {
      guidance: normalizeGuidance(parsed, args.fallback),
      source: "fine_tuned_model",
      model,
    };
  } catch {
    return {
      guidance: args.fallback,
      source: "deterministic",
      model,
    };
  } finally {
    clearTimeout(timeout);
  }
}
