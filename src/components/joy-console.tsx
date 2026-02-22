"use client";

import React from "react";
import { useAuthUser } from "@/lib/useAuth";
import { JoyTrendChart } from "@/components/joy-trend-chart";
import type {
  JoyAnalytics,
  JoyCheckinRecord,
  JoyFocusArea,
  JoyGuidance,
  JoyPlanProfile,
  JoyRhythm,
  JoySocialMode,
  JoyWeeklyPlan,
} from "@/lib/joy-engine";

type JoyCheckinInputState = {
  joy: string;
  meaning: string;
  connection: string;
  play: string;
  calm: string;
  financialConfidence: string;
  gratitude: string;
  win: string;
  intention: string;
};

const initialCheckin: JoyCheckinInputState = {
  joy: "6",
  meaning: "6",
  connection: "6",
  play: "5",
  calm: "5",
  financialConfidence: "5",
  gratitude: "",
  win: "",
  intention: "",
};

const initialProfile: JoyPlanProfile = {
  vision: "Build a joyful life with strong energy and growing income.",
  focusArea: "balance",
  availableHours: 12,
  spendBudget: 30,
  socialMode: "mixed",
  rhythm: "steady",
  accountabilityName: "",
};

function toNumber(value: string, fallback = 5) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

export function JoyConsole() {
  const { user, loading } = useAuthUser();
  const [tab, setTab] = React.useState<"checkin" | "plan" | "insights">("checkin");
  const [checkinInput, setCheckinInput] = React.useState<JoyCheckinInputState>(initialCheckin);
  const [entries, setEntries] = React.useState<JoyCheckinRecord[]>([]);
  const [guidance, setGuidance] = React.useState<JoyGuidance | null>(null);
  const [planProfile, setPlanProfile] = React.useState<JoyPlanProfile>(initialProfile);
  const [plan, setPlan] = React.useState<JoyWeeklyPlan | null>(null);
  const [analytics, setAnalytics] = React.useState<JoyAnalytics | null>(null);
  const [loadingData, setLoadingData] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");

  const loadAll = React.useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const [checkinRes, insightsRes, planRes] = await Promise.all([
        fetch("/api/joy/checkin", { headers: { authorization: `Bearer ${token}` } }),
        fetch("/api/joy/insights", { headers: { authorization: `Bearer ${token}` } }),
        fetch("/api/joy/plan", { headers: { authorization: `Bearer ${token}` } }),
      ]);

      if (checkinRes.ok) {
        const data = (await checkinRes.json()) as { entries: JoyCheckinRecord[] };
        setEntries(data.entries ?? []);
      }
      if (insightsRes.ok) {
        const data = (await insightsRes.json()) as { analytics: JoyAnalytics };
        setAnalytics(data.analytics);
      }
      if (planRes.ok) {
        const data = (await planRes.json()) as { latestPlan: JoyWeeklyPlan | null };
        setPlan(data.latestPlan ?? null);
      }
    } catch {
      setError("Unable to load joy dashboard.");
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (!user) {
      setEntries([]);
      setPlan(null);
      setAnalytics(null);
      return;
    }
    void loadAll();
  }, [user, loadAll]);

  async function submitCheckin() {
    if (!user) return;
    setSending(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/joy/checkin", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          joy: toNumber(checkinInput.joy),
          meaning: toNumber(checkinInput.meaning),
          connection: toNumber(checkinInput.connection),
          play: toNumber(checkinInput.play),
          calm: toNumber(checkinInput.calm),
          financialConfidence: toNumber(checkinInput.financialConfidence),
          gratitude: checkinInput.gratitude,
          win: checkinInput.win,
          intention: checkinInput.intention,
        }),
      });
      if (!response.ok) {
        setError("Unable to submit joy check-in.");
        setSending(false);
        return;
      }

      const data = (await response.json()) as {
        entry: JoyCheckinRecord;
        guidance: JoyGuidance;
      };
      setEntries((prev) => [data.entry, ...prev].slice(0, 120));
      setGuidance(data.guidance);
      setCheckinInput((prev) => ({ ...prev, gratitude: "", win: "", intention: "" }));

      const insightsRes = await fetch("/api/joy/insights", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (insightsRes.ok) {
        const insightsData = (await insightsRes.json()) as { analytics: JoyAnalytics };
        setAnalytics(insightsData.analytics);
      }
    } catch {
      setError("Unable to submit joy check-in.");
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
      const response = await fetch("/api/joy/plan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(planProfile),
      });
      if (!response.ok) {
        setError("Unable to generate weekly joy plan.");
        setSending(false);
        return;
      }
      const data = (await response.json()) as { plan: JoyWeeklyPlan };
      setPlan(data.plan);
      setTab("insights");
      const insightsRes = await fetch("/api/joy/insights", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (insightsRes.ok) {
        const insightsData = (await insightsRes.json()) as { analytics: JoyAnalytics };
        setAnalytics(insightsData.analytics);
      }
    } catch {
      setError("Unable to generate weekly joy plan.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card stack">
      <div className="oracle-head">
        <p className="pill">Joy OS</p>
      </div>
      <p className="subtle">
        Design a life that feels better while your momentum and money confidence rise.
      </p>

      {!loading && !user && (
        <a className="text-sm font-semibold" href="/login">
          Sign in to use Joy OS {"->"}
        </a>
      )}
      {loadingData && <p className="subtle text-sm">Loading your joy dashboard...</p>}
      {error && <p className="subtle text-sm">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button className={tab === "checkin" ? "cta" : "ghost"} type="button" onClick={() => setTab("checkin")}>
          Daily check-in
        </button>
        <button className={tab === "plan" ? "cta" : "ghost"} type="button" onClick={() => setTab("plan")}>
          Weekly plan
        </button>
        <button className={tab === "insights" ? "cta" : "ghost"} type="button" onClick={() => setTab("insights")}>
          Insights
        </button>
      </div>

      {tab === "checkin" && (
        <div className="stack oracle-reply">
          <h3 className="text-lg">Daily Joy Check-In</h3>
          <p className="subtle text-sm">Track six signals (1-10) and get adaptive guidance for today.</p>
          <div className="flex flex-wrap gap-3">
            <input className="input" value={checkinInput.joy} onChange={(e) => setCheckinInput((p) => ({ ...p, joy: e.target.value }))} placeholder="Joy (1-10)" />
            <input className="input" value={checkinInput.meaning} onChange={(e) => setCheckinInput((p) => ({ ...p, meaning: e.target.value }))} placeholder="Meaning (1-10)" />
            <input className="input" value={checkinInput.connection} onChange={(e) => setCheckinInput((p) => ({ ...p, connection: e.target.value }))} placeholder="Connection (1-10)" />
            <input className="input" value={checkinInput.play} onChange={(e) => setCheckinInput((p) => ({ ...p, play: e.target.value }))} placeholder="Play (1-10)" />
            <input className="input" value={checkinInput.calm} onChange={(e) => setCheckinInput((p) => ({ ...p, calm: e.target.value }))} placeholder="Calm (1-10)" />
            <input className="input" value={checkinInput.financialConfidence} onChange={(e) => setCheckinInput((p) => ({ ...p, financialConfidence: e.target.value }))} placeholder="Money confidence (1-10)" />
          </div>
          <input className="input" value={checkinInput.gratitude} onChange={(e) => setCheckinInput((p) => ({ ...p, gratitude: e.target.value }))} placeholder="What are you grateful for today?" />
          <input className="input" value={checkinInput.win} onChange={(e) => setCheckinInput((p) => ({ ...p, win: e.target.value }))} placeholder="Today's win" />
          <input className="input" value={checkinInput.intention} onChange={(e) => setCheckinInput((p) => ({ ...p, intention: e.target.value }))} placeholder="One intention for today" />
          <button className="cta" type="button" onClick={submitCheckin} disabled={!user || sending}>
            {sending ? "Submitting..." : "Submit check-in"}
          </button>

          {guidance && (
            <div className="list-item">
              <p className="text-sm"><strong>{guidance.headline}</strong></p>
              <ul className="oracle-bullets">
                {guidance.todayActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
              <p className="subtle text-sm">{guidance.celebration}</p>
            </div>
          )}

          {entries.length > 0 && (
            <div className="list">
              {entries.slice(0, 7).map((entry) => (
                <div key={entry.id} className="list-item">
                  <p className="subtle text-xs">{new Date(entry.createdAt).toLocaleString()}</p>
                  <p className="subtle text-sm">
                    Joy {entry.joyScore} | Money confidence {entry.financialConfidence} | Stability {entry.lifeStabilityScore}
                  </p>
                  {(entry.win || entry.gratitude) && (
                    <p className="text-sm">
                      {entry.win ? `Win: ${entry.win}` : ""} {entry.gratitude ? `Gratitude: ${entry.gratitude}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "plan" && (
        <div className="stack oracle-reply">
          <h3 className="text-lg">Weekly Joy Plan</h3>
          <p className="subtle text-sm">Create one high-leverage week with joy, income actions, and accountability.</p>
          <textarea className="textarea" value={planProfile.vision} onChange={(e) => setPlanProfile((p) => ({ ...p, vision: e.target.value }))} placeholder="Vision for this week" />
          <div className="flex flex-wrap gap-3">
            <select className="input" value={planProfile.focusArea} onChange={(e) => setPlanProfile((p) => ({ ...p, focusArea: e.target.value as JoyFocusArea }))}>
              <option value="balance">Balance</option>
              <option value="energy">Energy</option>
              <option value="purpose">Purpose</option>
              <option value="relationships">Relationships</option>
              <option value="creativity">Creativity</option>
              <option value="wealth">Wealth</option>
            </select>
            <input className="input" value={String(planProfile.availableHours)} onChange={(e) => setPlanProfile((p) => ({ ...p, availableHours: toNumber(e.target.value, 12) }))} placeholder="Hours available" />
            <input className="input" value={String(planProfile.spendBudget)} onChange={(e) => setPlanProfile((p) => ({ ...p, spendBudget: toNumber(e.target.value, 0) }))} placeholder="Weekly joy budget" />
          </div>
          <div className="flex flex-wrap gap-3">
            <select className="input" value={planProfile.socialMode} onChange={(e) => setPlanProfile((p) => ({ ...p, socialMode: e.target.value as JoySocialMode }))}>
              <option value="solo">Solo</option>
              <option value="mixed">Mixed</option>
              <option value="community">Community</option>
            </select>
            <select className="input" value={planProfile.rhythm} onChange={(e) => setPlanProfile((p) => ({ ...p, rhythm: e.target.value as JoyRhythm }))}>
              <option value="steady">Steady</option>
              <option value="sprint">Sprint</option>
            </select>
            <input className="input" value={planProfile.accountabilityName} onChange={(e) => setPlanProfile((p) => ({ ...p, accountabilityName: e.target.value }))} placeholder="Accountability partner name (optional)" />
          </div>
          <button className="cta" type="button" onClick={generateWeeklyPlan} disabled={!user || sending}>
            {sending ? "Generating..." : "Generate weekly plan"}
          </button>

          {plan && (
            <div className="stack">
              <div className="list-item">
                <p className="text-sm"><strong>{plan.weeklyTheme}</strong></p>
                <p className="subtle text-sm">{plan.priorityOutcome}</p>
                <p className="subtle text-sm">
                  Accountability: {plan.accountability.partner} | Checkpoint day: {plan.accountability.checkpointDay}
                </p>
              </div>
              <div className="list-item">
                <p className="text-sm"><strong>Joy rituals</strong></p>
                <ul className="oracle-bullets">
                  {plan.joyRituals.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="list-item">
                <p className="text-sm"><strong>Money moves</strong></p>
                <ul className="oracle-bullets">
                  {plan.moneyMoves.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="list-item">
                <p className="text-sm"><strong>Daily map</strong></p>
                <ul className="oracle-bullets">
                  {plan.dailyMap.map((item) => (
                    <li key={item.day}>
                      <strong>{item.day}:</strong> {item.joyAction} | {item.moneyAction}
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
          <h3 className="text-lg">Joy + Momentum Insights</h3>
          {!analytics ? (
            <p className="subtle text-sm">No analytics yet. Submit your first joy check-in.</p>
          ) : (
            <>
              <p className="subtle">
                Current: Joy {analytics.current.joyScore} | Money confidence {analytics.current.financialConfidence} | Stability{" "}
                {analytics.current.lifeStabilityScore}
              </p>
              <p className="subtle">
                Streak: {analytics.streakDays} days | Total check-ins: {analytics.totalCheckins}
              </p>
              <div className="list-item">
                <p className="text-sm"><strong>Trajectory deltas</strong></p>
                <ul className="oracle-bullets">
                  {analytics.deltas.map((delta) => (
                    <li key={delta.period}>
                      {delta.period.toUpperCase()}: joy {formatDelta(delta.joyDelta)}, stability {formatDelta(delta.stabilityDelta)},
                      confidence {formatDelta(delta.confidenceDelta)}
                    </li>
                  ))}
                </ul>
              </div>
              <JoyTrendChart entries={entries} analytics={analytics} />
              <div className="list-item">
                <p className="text-sm"><strong>Insights</strong></p>
                <ul className="oracle-bullets">
                  {analytics.insights.map((insight) => (
                    <li key={insight}>{insight}</li>
                  ))}
                </ul>
              </div>
              <p className="subtle text-sm">Current weekly theme: {analytics.latestWeeklyTheme}</p>
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
