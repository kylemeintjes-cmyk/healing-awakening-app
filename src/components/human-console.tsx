"use client";

import React from "react";
import { useAuthUser } from "@/lib/useAuth";
import { HumanTrendChart } from "@/components/human-trend-chart";
import type {
  HumanAnalytics,
  HumanCheckinRecord,
  HumanDecisionOptionInput,
  HumanDecisionRecord,
  HumanDiagnosticInput,
  HumanFocusArea,
  HumanGuidance,
  HumanPlanProfile,
  HumanProblemMap,
  HumanRhythm,
  HumanWeeklyPlan,
} from "@/lib/human-engine";

type HumanCheckinInputState = {
  clarity: string;
  focus: string;
  emotionalRegulation: string;
  stressLoad: string;
  sleepQuality: string;
  executionReadiness: string;
  commitmentConfidence: string;
  financialConfidence: string;
  biggestBlocker: string;
  priority: string;
  note: string;
};

type HumanDecisionState = {
  title: string;
  context: string;
  successMetric: string;
  confidenceBefore: string;
  reversible: boolean;
  timeHorizonDays: string;
  chosenOptionId: string;
  options: HumanDecisionOptionInput[];
};

const initialCheckin: HumanCheckinInputState = {
  clarity: "6",
  focus: "6",
  emotionalRegulation: "6",
  stressLoad: "5",
  sleepQuality: "6",
  executionReadiness: "6",
  commitmentConfidence: "6",
  financialConfidence: "5",
  biggestBlocker: "",
  priority: "",
  note: "",
};

const initialDiagnostic: HumanDiagnosticInput = {
  satisfaction: 5,
  stuckArea: "focus",
  recurringPattern: "",
  avoidancePattern: "",
  weeklyCost: "",
  desiredChange: "",
  confidenceToChange: 5,
};

const initialPlanProfile: HumanPlanProfile = {
  northStar: "Build a clear, stable, and high-execution life.",
  focusArea: "balance",
  availableHours: 14,
  incomeTarget: 1500,
  rhythm: "steady",
  accountabilityPartner: "",
};

const initialDecision: HumanDecisionState = {
  title: "",
  context: "",
  successMetric: "",
  confidenceBefore: "5",
  reversible: true,
  timeHorizonDays: "14",
  chosenOptionId: "opt_1",
  options: [
    { id: "opt_1", label: "", expectedUpside: 7, expectedRisk: 4, executionEase: 6, identityAlignment: 7 },
    { id: "opt_2", label: "", expectedUpside: 7, expectedRisk: 4, executionEase: 6, identityAlignment: 7 },
    { id: "opt_3", label: "", expectedUpside: 6, expectedRisk: 5, executionEase: 5, identityAlignment: 6 },
  ],
};

function toNumber(value: string, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

export function HumanConsole() {
  const { user, loading } = useAuthUser();
  const [tab, setTab] = React.useState<"diagnostic" | "daily" | "decision" | "plan" | "insights">("diagnostic");
  const [checkinInput, setCheckinInput] = React.useState<HumanCheckinInputState>(initialCheckin);
  const [diagnosticInput, setDiagnosticInput] = React.useState<HumanDiagnosticInput>(initialDiagnostic);
  const [planProfile, setPlanProfile] = React.useState<HumanPlanProfile>(initialPlanProfile);
  const [decisionInput, setDecisionInput] = React.useState<HumanDecisionState>(initialDecision);

  const [entries, setEntries] = React.useState<HumanCheckinRecord[]>([]);
  const [guidance, setGuidance] = React.useState<HumanGuidance | null>(null);
  const [problemMap, setProblemMap] = React.useState<HumanProblemMap | null>(null);
  const [plan, setPlan] = React.useState<HumanWeeklyPlan | null>(null);
  const [decisions, setDecisions] = React.useState<HumanDecisionRecord[]>([]);
  const [analytics, setAnalytics] = React.useState<HumanAnalytics | null>(null);

  const [loadingData, setLoadingData] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");

  const loadAll = React.useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const [checkinRes, insightsRes, planRes, diagnosticRes, decisionRes] = await Promise.all([
        fetch("/api/human/checkin", { headers: { authorization: `Bearer ${token}` } }),
        fetch("/api/human/insights", { headers: { authorization: `Bearer ${token}` } }),
        fetch("/api/human/plan", { headers: { authorization: `Bearer ${token}` } }),
        fetch("/api/human/diagnostic", { headers: { authorization: `Bearer ${token}` } }),
        fetch("/api/human/decision", { headers: { authorization: `Bearer ${token}` } }),
      ]);

      if (checkinRes.ok) {
        const data = (await checkinRes.json()) as { entries: HumanCheckinRecord[] };
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
      if (decisionRes.ok) {
        const data = (await decisionRes.json()) as { decisions: HumanDecisionRecord[] };
        setDecisions(data.decisions ?? []);
      }
    } catch {
      setError("Unable to load Human OS data.");
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (!user) {
      setEntries([]);
      setGuidance(null);
      setProblemMap(null);
      setPlan(null);
      setDecisions([]);
      setAnalytics(null);
      return;
    }
    void loadAll();
  }, [user, loadAll]);

  async function submitDiagnostic() {
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
        body: JSON.stringify(diagnosticInput),
      });
      if (!response.ok) {
        setError("Unable to run diagnostic.");
        setSending(false);
        return;
      }
      const data = (await response.json()) as { problemMap: HumanProblemMap };
      setProblemMap(data.problemMap);
      setTab("daily");
    } catch {
      setError("Unable to run diagnostic.");
    } finally {
      setSending(false);
    }
  }

  async function submitCheckin() {
    if (!user) return;
    setSending(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/human/checkin", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clarity: toNumber(checkinInput.clarity, 5),
          focus: toNumber(checkinInput.focus, 5),
          emotionalRegulation: toNumber(checkinInput.emotionalRegulation, 5),
          stressLoad: toNumber(checkinInput.stressLoad, 5),
          sleepQuality: toNumber(checkinInput.sleepQuality, 5),
          executionReadiness: toNumber(checkinInput.executionReadiness, 5),
          commitmentConfidence: toNumber(checkinInput.commitmentConfidence, 5),
          financialConfidence: toNumber(checkinInput.financialConfidence, 5),
          biggestBlocker: checkinInput.biggestBlocker,
          priority: checkinInput.priority,
          note: checkinInput.note,
        }),
      });
      if (!response.ok) {
        setError("Unable to submit daily check-in.");
        setSending(false);
        return;
      }
      const data = (await response.json()) as { entry: HumanCheckinRecord; guidance: HumanGuidance };
      setEntries((prev) => [data.entry, ...prev].slice(0, 200));
      setGuidance(data.guidance);
      setCheckinInput((prev) => ({ ...prev, note: "" }));
      await loadAll();
    } catch {
      setError("Unable to submit daily check-in.");
    } finally {
      setSending(false);
    }
  }

  async function submitDecision() {
    if (!user) return;
    setSending(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/human/decision", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: decisionInput.title,
          context: decisionInput.context,
          successMetric: decisionInput.successMetric,
          confidenceBefore: toNumber(decisionInput.confidenceBefore, 5),
          reversible: decisionInput.reversible,
          timeHorizonDays: toNumber(decisionInput.timeHorizonDays, 14),
          chosenOptionId: decisionInput.chosenOptionId,
          options: decisionInput.options,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({ error: "Unable to run decision audit." }))) as { error?: string };
        setError(body.error ?? "Unable to run decision audit.");
        setSending(false);
        return;
      }
      const data = (await response.json()) as { decision: HumanDecisionRecord };
      setDecisions((prev) => [data.decision, ...prev].slice(0, 200));
      await loadAll();
    } catch {
      setError("Unable to run decision audit.");
    } finally {
      setSending(false);
    }
  }

  async function generatePlan() {
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
        body: JSON.stringify(planProfile),
      });
      if (!response.ok) {
        setError("Unable to generate weekly plan.");
        setSending(false);
        return;
      }
      const data = (await response.json()) as { plan: HumanWeeklyPlan };
      setPlan(data.plan);
      setTab("insights");
      await loadAll();
    } catch {
      setError("Unable to generate weekly plan.");
    } finally {
      setSending(false);
    }
  }

  function updateDecisionOption(index: number, patch: Partial<HumanDecisionOptionInput>) {
    setDecisionInput((prev) => ({
      ...prev,
      options: prev.options.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  return (
    <section className="card stack">
      <div className="oracle-head">
        <p className="pill">Human OS</p>
      </div>
      <p className="subtle">
        Precision nervous-system and cognition optimization with measurable daily outcomes.
      </p>

      {!loading && !user && (
        <a className="text-sm font-semibold" href="/login">
          Sign in to use Human OS {"->"}
        </a>
      )}
      {loadingData && <p className="subtle text-sm">Loading Human OS...</p>}
      {error && <p className="subtle text-sm">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button className={tab === "diagnostic" ? "cta" : "ghost"} type="button" onClick={() => setTab("diagnostic")}>
          1. Diagnostic
        </button>
        <button className={tab === "daily" ? "cta" : "ghost"} type="button" onClick={() => setTab("daily")}>
          2. Daily loop
        </button>
        <button className={tab === "decision" ? "cta" : "ghost"} type="button" onClick={() => setTab("decision")}>
          3. Decision lab
        </button>
        <button className={tab === "plan" ? "cta" : "ghost"} type="button" onClick={() => setTab("plan")}>
          4. Weekly plan
        </button>
        <button className={tab === "insights" ? "cta" : "ghost"} type="button" onClick={() => setTab("insights")}>
          5. Insights
        </button>
      </div>

      {tab === "diagnostic" && (
        <div className="stack oracle-reply">
          <h3 className="text-lg">Problem Diagnostic</h3>
          <p className="subtle text-sm">Define what is actually broken before trying to optimize it.</p>
          <div className="human-grid-2">
            <input className="input" value={String(diagnosticInput.satisfaction)} onChange={(e) => setDiagnosticInput((p) => ({ ...p, satisfaction: toNumber(e.target.value, 5) }))} placeholder="Current life satisfaction (1-10)" />
            <input className="input" value={String(diagnosticInput.confidenceToChange)} onChange={(e) => setDiagnosticInput((p) => ({ ...p, confidenceToChange: toNumber(e.target.value, 5) }))} placeholder="Confidence to change (1-10)" />
          </div>
          <select className="input" value={diagnosticInput.stuckArea} onChange={(e) => setDiagnosticInput((p) => ({ ...p, stuckArea: e.target.value as HumanDiagnosticInput["stuckArea"] }))}>
            <option value="focus">Most stuck in focus/attention</option>
            <option value="career">Most stuck in career</option>
            <option value="money">Most stuck in money</option>
            <option value="relationships">Most stuck in relationships</option>
            <option value="health">Most stuck in health</option>
            <option value="purpose">Most stuck in purpose</option>
          </select>
          <input className="input" value={diagnosticInput.recurringPattern} onChange={(e) => setDiagnosticInput((p) => ({ ...p, recurringPattern: e.target.value }))} placeholder="What pattern keeps repeating?" />
          <input className="input" value={diagnosticInput.avoidancePattern} onChange={(e) => setDiagnosticInput((p) => ({ ...p, avoidancePattern: e.target.value }))} placeholder="What are you avoiding because it feels hard?" />
          <input className="input" value={diagnosticInput.weeklyCost} onChange={(e) => setDiagnosticInput((p) => ({ ...p, weeklyCost: e.target.value }))} placeholder="What is this costing you weekly (time/money/energy)?" />
          <input className="input" value={diagnosticInput.desiredChange} onChange={(e) => setDiagnosticInput((p) => ({ ...p, desiredChange: e.target.value }))} placeholder="What change would make this week meaningfully better?" />
          <button className="cta" type="button" onClick={submitDiagnostic} disabled={!user || sending}>
            {sending ? "Analyzing..." : "Run diagnostic"}
          </button>

          {problemMap && (
            <div className="list-item">
              <p className="text-sm"><strong>{problemMap.primaryProblem}</strong></p>
              <p className="subtle text-sm">Satisfaction gap: {problemMap.satisfactionGap}</p>
              <ul className="oracle-bullets">
                {problemMap.whyUnsatisfied.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="text-sm"><strong>Top constraints</strong></p>
              <ul className="oracle-bullets">
                {problemMap.topConstraints.map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong> ({item.impact}) - {item.firstFix}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "daily" && (
        <div className="stack oracle-reply">
          <h3 className="text-lg">Daily Alignment Loop</h3>
          <p className="subtle text-sm">Track state, then execute a targeted protocol for today.</p>
          <div className="human-grid-4">
            <input className="input" value={checkinInput.clarity} onChange={(e) => setCheckinInput((p) => ({ ...p, clarity: e.target.value }))} placeholder="Clarity (1-10)" />
            <input className="input" value={checkinInput.focus} onChange={(e) => setCheckinInput((p) => ({ ...p, focus: e.target.value }))} placeholder="Focus (1-10)" />
            <input className="input" value={checkinInput.emotionalRegulation} onChange={(e) => setCheckinInput((p) => ({ ...p, emotionalRegulation: e.target.value }))} placeholder="Regulation (1-10)" />
            <input className="input" value={checkinInput.stressLoad} onChange={(e) => setCheckinInput((p) => ({ ...p, stressLoad: e.target.value }))} placeholder="Stress load (1-10)" />
            <input className="input" value={checkinInput.sleepQuality} onChange={(e) => setCheckinInput((p) => ({ ...p, sleepQuality: e.target.value }))} placeholder="Sleep quality (1-10)" />
            <input className="input" value={checkinInput.executionReadiness} onChange={(e) => setCheckinInput((p) => ({ ...p, executionReadiness: e.target.value }))} placeholder="Execution readiness (1-10)" />
            <input className="input" value={checkinInput.commitmentConfidence} onChange={(e) => setCheckinInput((p) => ({ ...p, commitmentConfidence: e.target.value }))} placeholder="Commitment confidence (1-10)" />
            <input className="input" value={checkinInput.financialConfidence} onChange={(e) => setCheckinInput((p) => ({ ...p, financialConfidence: e.target.value }))} placeholder="Financial confidence (1-10)" />
          </div>
          <input className="input" value={checkinInput.priority} onChange={(e) => setCheckinInput((p) => ({ ...p, priority: e.target.value }))} placeholder="Top priority today" />
          <input className="input" value={checkinInput.biggestBlocker} onChange={(e) => setCheckinInput((p) => ({ ...p, biggestBlocker: e.target.value }))} placeholder="Biggest blocker right now" />
          <textarea className="textarea" value={checkinInput.note} onChange={(e) => setCheckinInput((p) => ({ ...p, note: e.target.value }))} placeholder="What else matters for today's state?" />
          <button className="cta" type="button" onClick={submitCheckin} disabled={!user || sending}>
            {sending ? "Submitting..." : "Submit daily loop"}
          </button>

          {guidance && (
            <div className="list-item">
              <p className="text-sm"><strong>{guidance.diagnosis}</strong></p>
              <ul className="oracle-bullets">
                {guidance.todayProtocol.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="subtle text-sm">{guidance.winCondition}</p>
            </div>
          )}
        </div>
      )}

      {tab === "decision" && (
        <div className="stack oracle-reply">
          <h3 className="text-lg">Decision Clarity Lab</h3>
          <p className="subtle text-sm">Audit major decisions before committing and improve decision quality over time.</p>
          <input className="input" value={decisionInput.title} onChange={(e) => setDecisionInput((p) => ({ ...p, title: e.target.value }))} placeholder="Decision title" />
          <textarea className="textarea" value={decisionInput.context} onChange={(e) => setDecisionInput((p) => ({ ...p, context: e.target.value }))} placeholder="Decision context and constraints" />
          <input className="input" value={decisionInput.successMetric} onChange={(e) => setDecisionInput((p) => ({ ...p, successMetric: e.target.value }))} placeholder="Success metric (measurable)" />
          <div className="human-grid-3">
            <input className="input" value={decisionInput.confidenceBefore} onChange={(e) => setDecisionInput((p) => ({ ...p, confidenceBefore: e.target.value }))} placeholder="Confidence before (1-10)" />
            <input className="input" value={decisionInput.timeHorizonDays} onChange={(e) => setDecisionInput((p) => ({ ...p, timeHorizonDays: e.target.value }))} placeholder="Time horizon (days)" />
            <label className="human-toggle">
              <input type="checkbox" checked={decisionInput.reversible} onChange={(e) => setDecisionInput((p) => ({ ...p, reversible: e.target.checked }))} />
              Reversible decision
            </label>
          </div>

          {decisionInput.options.map((option, index) => (
            <div key={option.id ?? index} className="list-item">
              <p className="text-sm"><strong>Option {index + 1}</strong></p>
              <input className="input" value={option.label} onChange={(e) => updateDecisionOption(index, { label: e.target.value })} placeholder={`Option ${index + 1} label`} />
              <div className="human-grid-4">
                <input className="input" value={String(option.expectedUpside)} onChange={(e) => updateDecisionOption(index, { expectedUpside: toNumber(e.target.value, 5) })} placeholder="Upside (1-10)" />
                <input className="input" value={String(option.expectedRisk)} onChange={(e) => updateDecisionOption(index, { expectedRisk: toNumber(e.target.value, 5) })} placeholder="Risk (1-10)" />
                <input className="input" value={String(option.executionEase)} onChange={(e) => updateDecisionOption(index, { executionEase: toNumber(e.target.value, 5) })} placeholder="Execution ease (1-10)" />
                <input className="input" value={String(option.identityAlignment)} onChange={(e) => updateDecisionOption(index, { identityAlignment: toNumber(e.target.value, 5) })} placeholder="Identity alignment (1-10)" />
              </div>
            </div>
          ))}

          <select className="input" value={decisionInput.chosenOptionId} onChange={(e) => setDecisionInput((p) => ({ ...p, chosenOptionId: e.target.value }))}>
            {decisionInput.options.map((option, index) => (
              <option key={option.id ?? index} value={option.id ?? `opt_${index + 1}`}>
                Chosen option: {option.label || `Option ${index + 1}`}
              </option>
            ))}
          </select>

          <button className="cta" type="button" onClick={submitDecision} disabled={!user || sending}>
            {sending ? "Scoring..." : "Run decision audit"}
          </button>

          {decisions.length > 0 && (
            <div className="list">
              {decisions.slice(0, 6).map((item) => (
                <div key={item.id} className="list-item">
                  <p className="text-sm"><strong>{item.title}</strong></p>
                  <p className="subtle text-sm">
                    Quality {item.decisionQualityScore} | Recommended {item.recommendedOptionId} | Chosen {item.chosenOptionId}
                  </p>
                  <p className="subtle text-sm">{item.nextAction}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "plan" && (
        <div className="stack oracle-reply">
          <h3 className="text-lg">Weekly Operating Plan</h3>
          <p className="subtle text-sm">Translate your state into a clear 7-day operating protocol.</p>
          <textarea className="textarea" value={planProfile.northStar} onChange={(e) => setPlanProfile((p) => ({ ...p, northStar: e.target.value }))} placeholder="North star for this week" />
          <div className="human-grid-3">
            <select className="input" value={planProfile.focusArea} onChange={(e) => setPlanProfile((p) => ({ ...p, focusArea: e.target.value as HumanFocusArea }))}>
              <option value="balance">Balance</option>
              <option value="clarity">Clarity</option>
              <option value="execution">Execution</option>
              <option value="stability">Stability</option>
              <option value="income">Income</option>
              <option value="relationships">Relationships</option>
            </select>
            <input className="input" value={String(planProfile.availableHours)} onChange={(e) => setPlanProfile((p) => ({ ...p, availableHours: toNumber(e.target.value, 14) }))} placeholder="Hours available" />
            <input className="input" value={String(planProfile.incomeTarget)} onChange={(e) => setPlanProfile((p) => ({ ...p, incomeTarget: toNumber(e.target.value, 0) }))} placeholder="Weekly income target" />
          </div>
          <div className="human-grid-2">
            <select className="input" value={planProfile.rhythm} onChange={(e) => setPlanProfile((p) => ({ ...p, rhythm: e.target.value as HumanRhythm }))}>
              <option value="steady">Steady</option>
              <option value="sprint">Sprint</option>
            </select>
            <input className="input" value={planProfile.accountabilityPartner} onChange={(e) => setPlanProfile((p) => ({ ...p, accountabilityPartner: e.target.value }))} placeholder="Accountability partner" />
          </div>
          <button className="cta" type="button" onClick={generatePlan} disabled={!user || sending}>
            {sending ? "Generating..." : "Generate weekly operating plan"}
          </button>

          {plan && (
            <div className="list">
              <div className="list-item">
                <p className="text-sm"><strong>{plan.theme}</strong></p>
                <p className="subtle text-sm">{plan.primaryOutcome}</p>
              </div>
              <div className="list-item">
                <p className="text-sm"><strong>Daily map</strong></p>
                <ul className="oracle-bullets">
                  {plan.dailyMap.map((item) => (
                    <li key={item.day}>
                      <strong>{item.day}:</strong> {item.cognitionAction} | {item.executionAction}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "insights" && (
        <div className="stack oracle-reply">
          <h3 className="text-lg">Human OS Insights</h3>
          {!analytics ? (
            <p className="subtle text-sm">No analytics yet. Run diagnostic and daily check-ins.</p>
          ) : (
            <>
              <p className="subtle">
                Current scores: Operating {analytics.current.operatingScore}, Clarity {analytics.current.clarityScore}, Execution{" "}
                {analytics.current.executionScore}, Stability {analytics.current.stabilityScore}, Confidence {analytics.current.financialConfidence}
              </p>
              <p className="subtle">
                Streak {analytics.streakDays} days | Check-ins {analytics.totalCheckins} | Decisions {analytics.decision.totalDecisions}
              </p>
              <p className="subtle">
                Decision quality {analytics.decision.avgDecisionQuality} | Recommendation adoption {analytics.decision.recommendationAdoptionRate}%
              </p>
              <div className="list-item">
                <p className="text-sm"><strong>Trajectory deltas</strong></p>
                <ul className="oracle-bullets">
                  {analytics.deltas.map((delta) => (
                    <li key={delta.period}>
                      {delta.period.toUpperCase()}: operating {formatDelta(delta.operatingDelta)}, clarity {formatDelta(delta.clarityDelta)},
                      execution {formatDelta(delta.executionDelta)}, stability {formatDelta(delta.stabilityDelta)}, confidence {formatDelta(delta.confidenceDelta)}
                    </li>
                  ))}
                </ul>
              </div>
              <HumanTrendChart entries={entries} analytics={analytics} />
              <div className="list-item">
                <p className="text-sm"><strong>Current problem snapshot</strong></p>
                <p className="subtle text-sm">Satisfaction gap {analytics.problemSnapshot.satisfactionGap}</p>
                <p className="subtle text-sm">{analytics.problemSnapshot.primaryProblem}</p>
              </div>
              <div className="list-item">
                <p className="text-sm"><strong>Insights</strong></p>
                <ul className="oracle-bullets">
                  {analytics.insights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
          <button className="ghost" type="button" onClick={() => void loadAll()} disabled={!user || loadingData}>
            Refresh insights
          </button>
        </div>
      )}
    </section>
  );
}
