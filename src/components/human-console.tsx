"use client";

import React from "react";
import { useAuthUser } from "@/lib/useAuth";
import { HumanTrendChart } from "@/components/human-trend-chart";
import type {
  HumanAnalytics,
  HumanCheckinRecord,
  HumanDiagnosticInput,
  HumanGuidance,
  HumanProblemMap,
  HumanWeeklyPlan,
} from "@/lib/human-engine";

type Stage = "diagnose" | "daily" | "results";
type StuckArea = HumanDiagnosticInput["stuckArea"];

type DiagnosticState = {
  satisfaction: string;
  confidenceToChange: string;
  stuckArea: StuckArea;
  desiredChange: string;
};

type DailyState = {
  clarity: string;
  executionReadiness: string;
  stressLoad: string;
  financialConfidence: string;
  priority: string;
};

type GuidanceSource = "fine_tuned_model" | "deterministic";

const initialDiagnostic: DiagnosticState = {
  satisfaction: "5",
  confidenceToChange: "5",
  stuckArea: "focus",
  desiredChange: "",
};

const initialDaily: DailyState = {
  clarity: "6",
  executionReadiness: "6",
  stressLoad: "5",
  financialConfidence: "5",
  priority: "",
};

function toNumber(value: string, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function mapStuckAreaToFocusArea(stuckArea: StuckArea) {
  if (stuckArea === "money") return "income" as const;
  if (stuckArea === "focus" || stuckArea === "purpose") return "clarity" as const;
  if (stuckArea === "health") return "stability" as const;
  if (stuckArea === "career") return "execution" as const;
  if (stuckArea === "relationships") return "relationships" as const;
  return "balance" as const;
}

export function HumanConsole() {
  const { user, loading } = useAuthUser();
  const [stage, setStage] = React.useState<Stage>("diagnose");
  const [diagnostic, setDiagnostic] = React.useState<DiagnosticState>(initialDiagnostic);
  const [daily, setDaily] = React.useState<DailyState>(initialDaily);

  const [problemMap, setProblemMap] = React.useState<HumanProblemMap | null>(null);
  const [guidance, setGuidance] = React.useState<HumanGuidance | null>(null);
  const [guidanceSource, setGuidanceSource] = React.useState<GuidanceSource>("deterministic");
  const [guidanceModel, setGuidanceModel] = React.useState<string | null>(null);
  const [entries, setEntries] = React.useState<HumanCheckinRecord[]>([]);
  const [analytics, setAnalytics] = React.useState<HumanAnalytics | null>(null);
  const [plan, setPlan] = React.useState<HumanWeeklyPlan | null>(null);

  const [loadingData, setLoadingData] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");

  const loadResults = React.useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const [checkinsRes, insightsRes, planRes, diagnosticRes] = await Promise.all([
        fetch("/api/human/checkin", { headers: { authorization: `Bearer ${token}` } }),
        fetch("/api/human/insights", { headers: { authorization: `Bearer ${token}` } }),
        fetch("/api/human/plan", { headers: { authorization: `Bearer ${token}` } }),
        fetch("/api/human/diagnostic", { headers: { authorization: `Bearer ${token}` } }),
      ]);

      if (checkinsRes.ok) {
        const data = (await checkinsRes.json()) as { entries: HumanCheckinRecord[] };
        setEntries(data.entries ?? []);
      }
      if (insightsRes.ok) {
        const data = (await insightsRes.json()) as { analytics: HumanAnalytics };
        setAnalytics(data.analytics);
      }
      if (planRes.ok) {
        const data = (await planRes.json()) as { latestPlan: HumanWeeklyPlan | null };
        setPlan(data.latestPlan ?? null);
      }
      if (diagnosticRes.ok) {
        const data = (await diagnosticRes.json()) as { latestDiagnostic: HumanProblemMap | null };
        setProblemMap(data.latestDiagnostic ?? null);
      }
    } catch {
      setError("Unable to load Human OS results.");
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (!user) {
      setProblemMap(null);
      setGuidance(null);
      setGuidanceSource("deterministic");
      setGuidanceModel(null);
      setEntries([]);
      setAnalytics(null);
      setPlan(null);
      setStage("diagnose");
      return;
    }
    void loadResults();
  }, [user, loadResults]);

  async function runDiagnostic() {
    if (!user) return;
    setSending(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/human/diagnostic", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          satisfaction: toNumber(diagnostic.satisfaction, 5),
          confidenceToChange: toNumber(diagnostic.confidenceToChange, 5),
          stuckArea: diagnostic.stuckArea,
          recurringPattern: "",
          avoidancePattern: "",
          weeklyCost: "",
          desiredChange: diagnostic.desiredChange,
        }),
      });
      if (!response.ok) {
        setError("Unable to run diagnostic.");
        setSending(false);
        return;
      }
      const data = (await response.json()) as { problemMap: HumanProblemMap };
      setProblemMap(data.problemMap);
      setStage("daily");
    } catch {
      setError("Unable to run diagnostic.");
    } finally {
      setSending(false);
    }
  }

  async function runDailyLoop() {
    if (!user) return;
    setSending(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const clarity = toNumber(daily.clarity, 6);
      const executionReadiness = toNumber(daily.executionReadiness, 6);
      const stressLoad = toNumber(daily.stressLoad, 5);
      const financialConfidence = toNumber(daily.financialConfidence, 5);
      const response = await fetch("/api/human/checkin", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clarity,
          focus: clarity,
          emotionalRegulation: Math.max(1, Math.min(10, 11 - stressLoad)),
          stressLoad,
          sleepQuality: 6,
          executionReadiness,
          commitmentConfidence: executionReadiness,
          financialConfidence,
          biggestBlocker: "",
          priority: daily.priority,
          note: "",
        }),
      });
      if (!response.ok) {
        setError("Unable to run daily loop.");
        setSending(false);
        return;
      }
      const data = (await response.json()) as {
        guidance: HumanGuidance;
        guidanceSource?: GuidanceSource;
        guidanceModel?: string | null;
      };
      setGuidance(data.guidance);
      setGuidanceSource(data.guidanceSource ?? "deterministic");
      setGuidanceModel(data.guidanceModel ?? null);
      await loadResults();
      setStage("results");
    } catch {
      setError("Unable to run daily loop.");
    } finally {
      setSending(false);
    }
  }

  async function generateWeeklyPlan() {
    if (!user) return;
    setSending(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/human/plan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          northStar:
            diagnostic.desiredChange.trim() ||
            "Improve clarity, execution, income confidence, and emotional stability.",
          focusArea: mapStuckAreaToFocusArea(diagnostic.stuckArea),
          availableHours: 12,
          incomeTarget: diagnostic.stuckArea === "money" ? 1500 : 500,
          rhythm: "steady",
          accountabilityPartner: "",
        }),
      });
      if (!response.ok) {
        setError("Unable to generate weekly plan.");
        setSending(false);
        return;
      }
      const data = (await response.json()) as { plan: HumanWeeklyPlan };
      setPlan(data.plan);
    } catch {
      setError("Unable to generate weekly plan.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card stack">
      <div className="oracle-head">
        <p className="pill">Human OS</p>
      </div>
      <p className="subtle">
        Simplified flow: identify your main bottleneck, run one daily protocol, and track measurable results.
      </p>

      {!loading && !user && (
        <a className="text-sm font-semibold" href="/login">
          Sign in to use Human OS {"->"}
        </a>
      )}
      {loadingData && <p className="subtle text-sm">Loading results...</p>}
      {error && <p className="subtle text-sm">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button className={stage === "diagnose" ? "cta" : "ghost"} type="button" onClick={() => setStage("diagnose")}>
          1. Diagnose
        </button>
        <button className={stage === "daily" ? "cta" : "ghost"} type="button" onClick={() => setStage("daily")}>
          2. Daily loop
        </button>
        <button className={stage === "results" ? "cta" : "ghost"} type="button" onClick={() => setStage("results")}>
          3. Results
        </button>
      </div>

      {stage === "diagnose" && (
        <div className="stack oracle-reply">
          <h3 className="text-lg">Quick Diagnostic</h3>
          <p className="subtle text-sm">Answer four questions. We use this to identify your highest-leverage problem.</p>
          <div className="human-grid-2">
            <label className="stack">
              <span className="text-sm">Current life satisfaction (1-10)</span>
              <input
                className="input"
                value={diagnostic.satisfaction}
                onChange={(e) => setDiagnostic((p) => ({ ...p, satisfaction: e.target.value }))}
                placeholder="Example: 5"
              />
              <span className="subtle text-xs">Used to compute your baseline gap ({10 - toNumber(diagnostic.satisfaction, 5)}).</span>
            </label>
            <label className="stack">
              <span className="text-sm">Confidence to change (1-10)</span>
              <input
                className="input"
                value={diagnostic.confidenceToChange}
                onChange={(e) => setDiagnostic((p) => ({ ...p, confidenceToChange: e.target.value }))}
                placeholder="Example: 6"
              />
              <span className="subtle text-xs">Lower confidence means smaller, easier first-step protocol.</span>
            </label>
          </div>
          <select
            className="input"
            value={diagnostic.stuckArea}
            onChange={(e) => setDiagnostic((p) => ({ ...p, stuckArea: e.target.value as StuckArea }))}
          >
            <option value="focus">Most stuck in focus/attention</option>
            <option value="career">Most stuck in career</option>
            <option value="money">Most stuck in money</option>
            <option value="relationships">Most stuck in relationships</option>
            <option value="health">Most stuck in health</option>
            <option value="purpose">Most stuck in purpose</option>
          </select>
          <input
            className="input"
            value={diagnostic.desiredChange}
            onChange={(e) => setDiagnostic((p) => ({ ...p, desiredChange: e.target.value }))}
            placeholder="What change would make this week clearly better?"
          />
          <button className="cta" type="button" onClick={runDiagnostic} disabled={!user || sending}>
            {sending ? "Analyzing..." : "Run diagnostic"}
          </button>
        </div>
      )}

      {stage === "daily" && (
        <div className="stack oracle-reply">
          <h3 className="text-lg">Daily Loop</h3>
          <p className="subtle text-sm">Track five signals. You get a focused protocol for today.</p>
          <div className="list-item">
            <p className="text-sm"><strong>What each number controls</strong></p>
            <ul className="oracle-bullets">
              <li><strong>Clarity:</strong> how sharp your priorities are.</li>
              <li><strong>Execution readiness:</strong> how likely you are to follow through today.</li>
              <li><strong>Stress load:</strong> how much pressure your nervous system is carrying.</li>
              <li><strong>Money confidence:</strong> how secure and in-control you feel financially.</li>
            </ul>
          </div>
          <div className="human-grid-4">
            <label className="stack">
              <span className="text-sm">Clarity (1-10)</span>
              <input
                className="input"
                value={daily.clarity}
                onChange={(e) => setDaily((p) => ({ ...p, clarity: e.target.value }))}
                placeholder="Example: 6"
              />
              <span className="subtle text-xs">Higher = easier prioritization and fewer conflicting tasks.</span>
            </label>
            <label className="stack">
              <span className="text-sm">Execution readiness (1-10)</span>
              <input
                className="input"
                value={daily.executionReadiness}
                onChange={(e) => setDaily((p) => ({ ...p, executionReadiness: e.target.value }))}
                placeholder="Example: 7"
              />
              <span className="subtle text-xs">Higher = stronger action protocol; lower = simpler first steps.</span>
            </label>
            <label className="stack">
              <span className="text-sm">Stress load (1-10)</span>
              <input
                className="input"
                value={daily.stressLoad}
                onChange={(e) => setDaily((p) => ({ ...p, stressLoad: e.target.value }))}
                placeholder="Example: 5"
              />
              <span className="subtle text-xs">Higher = more stabilization and regulation actions.</span>
            </label>
            <label className="stack">
              <span className="text-sm">Money confidence (1-10)</span>
              <input
                className="input"
                value={daily.financialConfidence}
                onChange={(e) => setDaily((p) => ({ ...p, financialConfidence: e.target.value }))}
                placeholder="Example: 5"
              />
              <span className="subtle text-xs">Lower = stronger focus on concrete revenue-producing actions.</span>
            </label>
          </div>
          <label className="stack">
            <span className="text-sm">Top priority for today</span>
            <input
              className="input"
              value={daily.priority}
              onChange={(e) => setDaily((p) => ({ ...p, priority: e.target.value }))}
              placeholder="One concrete outcome you want by end of day"
            />
            <span className="subtle text-xs">This becomes your daily win condition in the protocol output.</span>
          </label>
          <button className="cta" type="button" onClick={runDailyLoop} disabled={!user || sending}>
            {sending ? "Running..." : "Run daily loop"}
          </button>
        </div>
      )}

      {stage === "results" && (
        <div className="stack oracle-reply">
          <h3 className="text-lg">Results</h3>
          {!analytics ? (
            <p className="subtle text-sm">No results yet. Run the diagnostic and daily loop first.</p>
          ) : (
            <>
              <div className="list-item">
                <p className="text-sm"><strong>Current scores</strong></p>
                <p className="subtle text-sm">
                  Operating {analytics.current.operatingScore} | Clarity {analytics.current.clarityScore} | Execution {analytics.current.executionScore} |
                  Stability {analytics.current.stabilityScore}
                </p>
                <p className="subtle text-sm">
                  Streak {analytics.streakDays} days | Check-ins {analytics.totalCheckins}
                </p>
              </div>

              {guidance && (
                <div className="list-item">
                  <p className="text-sm"><strong>{guidance.diagnosis}</strong></p>
                  <p className="subtle text-xs">
                    Source: {guidanceSource === "fine_tuned_model" ? "Fine-tuned model" : "Deterministic fallback"}
                    {guidanceModel ? ` (${guidanceModel})` : ""}
                  </p>
                  <ul className="oracle-bullets">
                    {guidance.todayProtocol.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="subtle text-sm">{guidance.winCondition}</p>
                </div>
              )}

              {problemMap && (
                <div className="list-item">
                  <p className="text-sm"><strong>Primary problem</strong></p>
                  <p className="subtle text-sm">{problemMap.primaryProblem}</p>
                  <p className="subtle text-sm">Satisfaction gap: {problemMap.satisfactionGap}</p>
                </div>
              )}

              <div className="list-item">
                <p className="text-sm"><strong>Top insights</strong></p>
                <ul className="oracle-bullets">
                  {analytics.insights.slice(0, 4).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <HumanTrendChart entries={entries} analytics={analytics} />

              <div className="list-item">
                <p className="text-sm"><strong>Weekly plan</strong></p>
                {!plan ? (
                  <button className="cta" type="button" onClick={generateWeeklyPlan} disabled={!user || sending}>
                    {sending ? "Generating..." : "Generate weekly plan"}
                  </button>
                ) : (
                  <>
                    <p className="subtle text-sm">{plan.theme}</p>
                    <p className="subtle text-sm">{plan.primaryOutcome}</p>
                    <ul className="oracle-bullets">
                      {plan.dailyMap.slice(0, 3).map((item) => (
                        <li key={item.day}>
                          <strong>{item.day}:</strong> {item.executionAction}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
