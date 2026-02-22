"use client";

import React from "react";
import { useAuthUser } from "@/lib/useAuth";

type RiskTolerance = "low" | "medium" | "high";

type CapitalPlan = {
  planId: string;
  generatedAt: string;
  blockers: Array<{
    id: string;
    title: string;
    severity: "high" | "medium" | "low";
    evidence: string;
    fix: string;
  }>;
  opportunities: Array<{
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
  }>;
  recommendedOpportunityId: string;
  antiFailureProtocol: string[];
  executionCadence: {
    daily: string[];
    weekly: string[];
  };
  allocation: {
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
};

type CapitalAnalytics = {
  totals: {
    outreach: number;
    proposals: number;
    closedDeals: number;
    revenue: number;
    actions: number;
  };
  funnel: {
    proposalRate: number;
    closeRate: number;
    avgRevenuePerDeal: number;
  };
  cadence: {
    avgExecutionScore: number;
    activeDays: number;
  };
  insights: string[];
  opportunityBacktest: Array<{
    id: string;
    title: string;
    score: number;
    observedRevenue: number;
    observedCloseRate: number;
  }>;
  latestLesson: string;
};

type CapitalSimulation = {
  base: number[];
  upside: number[];
  downside: number[];
};

export function CapitalConsole() {
  const { user, loading } = useAuthUser();
  const latestPlanLoadedRef = React.useRef(false);
  const [stage, setStage] = React.useState<"plan" | "execute" | "analyze">("plan");
  const [goal, setGoal] = React.useState("Build durable monthly cashflow and compound capital.");
  const [topSkills, setTopSkills] = React.useState("AI automation, negotiation, systems design");
  const [market, setMarket] = React.useState("SMB founders");
  const [hoursPerWeek, setHoursPerWeek] = React.useState("18");
  const [monthlyExpenses, setMonthlyExpenses] = React.useState("2500");
  const [cashReserve, setCashReserve] = React.useState("5000");
  const [currentMonthlyRevenue, setCurrentMonthlyRevenue] = React.useState("1500");
  const [riskTolerance, setRiskTolerance] = React.useState<RiskTolerance>("medium");
  const [narrative, setNarrative] = React.useState("");

  const [plan, setPlan] = React.useState<CapitalPlan | null>(null);
  const [error, setError] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [restoringPlan, setRestoringPlan] = React.useState(false);
  const [resumedPlanAt, setResumedPlanAt] = React.useState<string | null>(null);

  const [checkin, setCheckin] = React.useState({
    completedActions: "3",
    outreachCount: "10",
    proposalCount: "2",
    closedDeals: "0",
    revenueGenerated: "0",
    blockerNote: "",
  });
  const [checkinResult, setCheckinResult] = React.useState<{ executionScore: number; adjustment: string } | null>(null);
  const [review, setReview] = React.useState({ wins: "", losses: "", lesson: "", nextWeekFocus: "" });
  const [reviewResult, setReviewResult] = React.useState<string[] | null>(null);
  const [analytics, setAnalytics] = React.useState<CapitalAnalytics | null>(null);
  const [simulation, setSimulation] = React.useState<CapitalSimulation | null>(null);
  const [simInput, setSimInput] = React.useState({
    startingCapital: "5000",
    monthlyContribution: "500",
    annualReturnBase: "8",
    annualReturnUpside: "14",
    annualReturnDownside: "3",
    months: "24",
  });

  React.useEffect(() => {
    if (!user) {
      latestPlanLoadedRef.current = false;
      setPlan(null);
      setResumedPlanAt(null);
      setStage("plan");
      return;
    }
    if (latestPlanLoadedRef.current) return;

    latestPlanLoadedRef.current = true;
    let cancelled = false;

    (async () => {
      setRestoringPlan(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/capital/latest", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;

        const data = (await res.json()) as { latestPlan: CapitalPlan | null };
        if (!data.latestPlan || cancelled) return;

        setPlan(data.latestPlan);
        setStage("execute");
        setResumedPlanAt(data.latestPlan.generatedAt ?? null);
        setCheckinResult(null);
        setReviewResult(null);
      } finally {
        if (!cancelled) setRestoringPlan(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function buildPlan() {
    if (!user) {
      setError("Sign in to use Capital OS.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/capital/plan", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          goal,
          topSkills: topSkills.split(",").map((s) => s.trim()).filter(Boolean),
          market,
          hoursPerWeek: Number(hoursPerWeek),
          monthlyExpenses: Number(monthlyExpenses),
          cashReserve: Number(cashReserve),
          currentMonthlyRevenue: Number(currentMonthlyRevenue),
          riskTolerance,
          narrative,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "Unable to build capital plan.");
        setSending(false);
        return;
      }
      const data = (await res.json()) as { plan: CapitalPlan };
      setPlan(data.plan);
      setResumedPlanAt(null);
      setCheckinResult(null);
      setReviewResult(null);
      setStage("execute");
    } catch {
      setError("Unable to build capital plan.");
    } finally {
      setSending(false);
    }
  }

  async function submitCheckin() {
    if (!user || !plan) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/capital/checkin", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        planId: plan.planId,
        completedActions: Number(checkin.completedActions),
        outreachCount: Number(checkin.outreachCount),
        proposalCount: Number(checkin.proposalCount),
        closedDeals: Number(checkin.closedDeals),
        revenueGenerated: Number(checkin.revenueGenerated),
        blockerNote: checkin.blockerNote,
      }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { executionScore: number; adjustment: string };
    setCheckinResult(data);
  }

  async function submitReview() {
    if (!user || !plan) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/capital/review", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ planId: plan.planId, ...review }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { nextWeekProtocol: string[] };
    setReviewResult(data.nextWeekProtocol);
  }

  async function loadAnalytics() {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/capital/analytics", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = (await res.json()) as { analytics: CapitalAnalytics };
    setAnalytics(data.analytics);
    setStage("analyze");
  }

  async function runSimulation() {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/capital/simulate", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        startingCapital: Number(simInput.startingCapital),
        monthlyContribution: Number(simInput.monthlyContribution),
        annualReturnBase: Number(simInput.annualReturnBase),
        annualReturnUpside: Number(simInput.annualReturnUpside),
        annualReturnDownside: Number(simInput.annualReturnDownside),
        months: Number(simInput.months),
      }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { simulation: CapitalSimulation };
    setSimulation(data.simulation);
  }

  return (
    <section className="card stack">
      <div className="oracle-head">
        <p className="pill">Capital OS</p>
      </div>
      <p className="subtle">
        Turn skill into cashflow, then cashflow into capital. This flow removes vague planning and forces measurable execution.
      </p>
      <div className="list-item">
        <p className="text-sm"><strong>How to use this</strong></p>
        <ul className="oracle-bullets">
          <li>
            <strong>1. Plan:</strong> define your constraints and get one ranked path.
          </li>
          <li>
            <strong>2. Execute:</strong> run daily actions and close the income gap.
          </li>
          <li>
            <strong>3. Analyze:</strong> review funnel metrics and forecast compounding scenarios.
          </li>
        </ul>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className={stage === "plan" ? "cta" : "ghost"} type="button" onClick={() => setStage("plan")}>
          1. Plan
        </button>
        <button className={stage === "execute" ? "cta" : "ghost"} type="button" onClick={() => setStage("execute")} disabled={!plan}>
          2. Execute
        </button>
        <button className={stage === "analyze" ? "cta" : "ghost"} type="button" onClick={() => setStage("analyze")} disabled={!plan}>
          3. Analyze
        </button>
      </div>

      {!loading && !user && (
        <a className="text-sm font-semibold" href="/login">
          Sign in to run Capital OS {"->"}
        </a>
      )}
      {restoringPlan && <p className="subtle text-sm">Restoring your latest saved plan...</p>}
      {resumedPlanAt && <p className="subtle text-sm">Resumed your latest plan from {new Date(resumedPlanAt).toLocaleString()}.</p>}

      {stage === "plan" && (
        <>
          <div className="stack">
            <h3 className="text-lg">Build Your Capital Plan</h3>
            <p className="subtle text-sm">Value: identifies blockers and selects the fastest path to reliable cashflow.</p>
            <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Goal (example: Reach $8k/month by productizing AI automation)" />
            <input className="input" value={topSkills} onChange={(e) => setTopSkills(e.target.value)} placeholder="Top skills (comma-separated)" />
            <input className="input" value={market} onChange={(e) => setMarket(e.target.value)} placeholder="Target market (who pays)" />
            <textarea className="textarea" value={narrative} onChange={(e) => setNarrative(e.target.value)} placeholder="What keeps stopping execution?" />
            <div className="flex flex-wrap gap-3">
              <input className="input" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} placeholder="Hours/week available" />
              <input className="input" value={monthlyExpenses} onChange={(e) => setMonthlyExpenses(e.target.value)} placeholder="Monthly expenses" />
              <input className="input" value={cashReserve} onChange={(e) => setCashReserve(e.target.value)} placeholder="Cash reserve" />
              <input className="input" value={currentMonthlyRevenue} onChange={(e) => setCurrentMonthlyRevenue(e.target.value)} placeholder="Current monthly revenue" />
            </div>
            <label className="stack">
              <span className="text-sm">Risk tolerance</span>
              <select className="input" value={riskTolerance} onChange={(e) => setRiskTolerance(e.target.value as RiskTolerance)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <button className="cta" type="button" onClick={buildPlan} disabled={sending || !user}>
              {sending ? "Building..." : "Generate Plan"}
            </button>
          </div>
          {error && <p className="subtle text-sm">{error}</p>}
        </>
      )}

      {plan && (
        <div className="stack oracle-reply">
          {stage === "plan" && (
            <>
              <h3 className="text-lg">Your Plan Summary</h3>
              <p className="subtle text-sm">Value: clarity on what to stop and what to execute first.</p>
              <h4 className="text-lg">Critical blockers</h4>
              <ul className="oracle-bullets">
                {plan.blockers.length > 0 ? (
                  plan.blockers.map((b) => (
                    <li key={b.id}>
                      <strong>{b.title}</strong> ({b.severity}) - {b.fix}
                    </li>
                  ))
                ) : (
                  <li>No major blockers detected. Move directly to execution.</li>
                )}
              </ul>
              <h4 className="text-lg">Best path right now</h4>
              <div className="list">
                {plan.opportunities.map((o) => (
                  <div key={o.id} className="list-item">
                    <h4 className="text-lg">
                      {o.title} [{o.score.total}]
                    </h4>
                    <p className="subtle">{o.model}</p>
                    <p className="subtle">
                      Buyer: {o.targetBuyer} | Price: {o.pricePoint}
                    </p>
                    {plan.recommendedOpportunityId === o.id && <p className="pill">Start here</p>}
                  </div>
                ))}
              </div>
              <button className="cta" type="button" onClick={() => setStage("execute")}>
                Move to execution
              </button>
            </>
          )}

          {stage === "execute" && (
            <>
              <h3 className="text-lg">Execution Console</h3>
              <p className="subtle text-sm">Value: daily revenue actions, visible score, immediate course-correction.</p>
              <h4 className="text-lg">Anti-failure protocol</h4>
              <ul className="oracle-bullets">
                {plan.antiFailureProtocol.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h4 className="text-lg">Allocation policy</h4>
              <p className="subtle">
                Runway {plan.allocation.runwayPct}% | Reinvest {plan.allocation.reinvestPct}% | Long-term {plan.allocation.longTermPct}% |
                Optionality {plan.allocation.optionalityPct}%
              </p>
              <p className="subtle">
                Weekly transfers: Runway {plan.allocation.weeklyTransfers.runway}, Reinvest {plan.allocation.weeklyTransfers.reinvest},
                Long-term {plan.allocation.weeklyTransfers.longTerm}, Optionality {plan.allocation.weeklyTransfers.optionality}
              </p>
              <h4 className="text-lg">Daily check-in</h4>
              <div className="flex flex-wrap gap-3">
                <input className="input" value={checkin.completedActions} onChange={(e) => setCheckin((p) => ({ ...p, completedActions: e.target.value }))} placeholder="Completed actions" />
                <input className="input" value={checkin.outreachCount} onChange={(e) => setCheckin((p) => ({ ...p, outreachCount: e.target.value }))} placeholder="Outreach sent" />
                <input className="input" value={checkin.proposalCount} onChange={(e) => setCheckin((p) => ({ ...p, proposalCount: e.target.value }))} placeholder="Proposals sent" />
                <input className="input" value={checkin.closedDeals} onChange={(e) => setCheckin((p) => ({ ...p, closedDeals: e.target.value }))} placeholder="Deals closed" />
                <input className="input" value={checkin.revenueGenerated} onChange={(e) => setCheckin((p) => ({ ...p, revenueGenerated: e.target.value }))} placeholder="Revenue today" />
              </div>
              <input className="input" value={checkin.blockerNote} onChange={(e) => setCheckin((p) => ({ ...p, blockerNote: e.target.value }))} placeholder="Biggest blocker encountered today" />
              <button className="ghost" type="button" onClick={submitCheckin}>
                Submit daily check-in
              </button>
              {checkinResult && (
                <p className="subtle">
                  Execution score: {checkinResult.executionScore}/100. Next move: {checkinResult.adjustment}
                </p>
              )}
              <h4 className="text-lg">Weekly adaptation</h4>
              <textarea className="textarea" value={review.wins} onChange={(e) => setReview((p) => ({ ...p, wins: e.target.value }))} placeholder="What worked this week?" />
              <textarea className="textarea" value={review.losses} onChange={(e) => setReview((p) => ({ ...p, losses: e.target.value }))} placeholder="What failed?" />
              <textarea className="textarea" value={review.lesson} onChange={(e) => setReview((p) => ({ ...p, lesson: e.target.value }))} placeholder="Key lesson" />
              <input className="input" value={review.nextWeekFocus} onChange={(e) => setReview((p) => ({ ...p, nextWeekFocus: e.target.value }))} placeholder="Single focus for next week" />
              <button className="ghost" type="button" onClick={submitReview}>
                Generate next-week protocol
              </button>
              {reviewResult && (
                <ul className="oracle-bullets">
                  {reviewResult.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              <button className="cta" type="button" onClick={loadAnalytics}>
                View analytics
              </button>
            </>
          )}

          {stage === "analyze" && (
            <>
              <h3 className="text-lg">Performance + Forecast</h3>
              <p className="subtle text-sm">Value: shows what is bottlenecking growth and what compounding looks like if you stay consistent.</p>
              <button className="ghost" type="button" onClick={loadAnalytics}>
                Refresh analytics
              </button>
              {analytics && (
                <div className="stack">
                  <p className="subtle">
                    Totals: Outreach {analytics.totals.outreach}, Proposals {analytics.totals.proposals}, Deals {analytics.totals.closedDeals},
                    Revenue {analytics.totals.revenue}
                  </p>
                  <p className="subtle">
                    Funnel: proposal rate {analytics.funnel.proposalRate}%, close rate {analytics.funnel.closeRate}%, avg revenue/deal{" "}
                    {analytics.funnel.avgRevenuePerDeal}
                  </p>
                  <p className="subtle">
                    Cadence: avg execution score {analytics.cadence.avgExecutionScore} over {analytics.cadence.activeDays} active days
                  </p>
                  <ul className="oracle-bullets">
                    {analytics.insights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {analytics.opportunityBacktest.length > 0 && (
                    <div className="list">
                      {analytics.opportunityBacktest.map((item) => (
                        <div key={item.id} className="list-item">
                          <p>
                            <strong>{item.title}</strong> - observed revenue {item.observedRevenue}, observed close rate {item.observedCloseRate}%
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="subtle">Latest lesson: {analytics.latestLesson}</p>
                </div>
              )}
              <h4 className="text-lg">Compounding simulator</h4>
              <div className="flex flex-wrap gap-3">
                <input
                  className="input"
                  value={simInput.startingCapital}
                  onChange={(e) => setSimInput((p) => ({ ...p, startingCapital: e.target.value }))}
                  placeholder="Starting capital"
                />
                <input
                  className="input"
                  value={simInput.monthlyContribution}
                  onChange={(e) => setSimInput((p) => ({ ...p, monthlyContribution: e.target.value }))}
                  placeholder="Monthly contribution"
                />
                <input
                  className="input"
                  value={simInput.annualReturnBase}
                  onChange={(e) => setSimInput((p) => ({ ...p, annualReturnBase: e.target.value }))}
                  placeholder="Base annual return %"
                />
                <input
                  className="input"
                  value={simInput.annualReturnUpside}
                  onChange={(e) => setSimInput((p) => ({ ...p, annualReturnUpside: e.target.value }))}
                  placeholder="Upside annual return %"
                />
                <input
                  className="input"
                  value={simInput.annualReturnDownside}
                  onChange={(e) => setSimInput((p) => ({ ...p, annualReturnDownside: e.target.value }))}
                  placeholder="Downside annual return %"
                />
                <input
                  className="input"
                  value={simInput.months}
                  onChange={(e) => setSimInput((p) => ({ ...p, months: e.target.value }))}
                  placeholder="Months"
                />
              </div>
              <button className="ghost" type="button" onClick={runSimulation}>
                Run projection
              </button>
              {simulation && (
                <div className="stack">
                  <p className="subtle">Projected end value (base): {simulation.base[simulation.base.length - 1] ?? 0}</p>
                  <p className="subtle">Projected end value (upside): {simulation.upside[simulation.upside.length - 1] ?? 0}</p>
                  <p className="subtle">Projected end value (downside): {simulation.downside[simulation.downside.length - 1] ?? 0}</p>
                </div>
              )}
              <button className="ghost" type="button" onClick={() => setStage("execute")}>
                Back to execution
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
