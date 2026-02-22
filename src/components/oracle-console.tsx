"use client";

import React from "react";
import { useAuthUser } from "@/lib/useAuth";

type OracleStyle = "gentle" | "direct" | "mystic" | "pragmatic";
type OracleAction = "ask" | "more_practical" | "go_deeper" | "coherence_audit" | "options_map";
type OracleLifeArea = "general" | "work" | "relationships" | "health" | "money" | "spiritual";

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
  decisionEngine: {
    truth: string;
    misalignment: string[];
    options: Array<{
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
    }>;
    recommendedOptionId: string;
    recommendedWhy: string;
    next7Days: string[];
    checkpointQuestion: string;
  };
  confidence: "low" | "medium" | "high";
};

type OracleResponse = {
  traceId: string;
  source: "local-llm" | "fallback";
  model: string | null;
  style: OracleStyle;
  action: OracleAction;
  lifeArea: OracleLifeArea;
  intent: "gift_discovery" | "wellbeing" | "general";
  zodiacSign?: string | null;
  natalChart?: {
    sunSign: string;
    moonSign: string;
    ascendantSign: string;
    midheavenSign: string;
    dominantElement: string;
    aspects: Array<{ point1: string; point2: string; type: string; orb: number }>;
  } | null;
  transits?: {
    generatedAt: string;
    influences: Array<{
      transitBody: string;
      natalPoint: string;
      aspect: string;
      orb: number;
      interpretation: string;
      action: string;
    }>;
  } | null;
  message: string;
  reply: string;
  question: string;
  reading: OracleReading;
  rejectedReasons?: string[];
  recommendations: Array<{
    id: string;
    title: string;
    type: string;
    durationMinutes: number;
    intensity: string;
  }>;
};

type OracleConsoleProps = {
  surface: "home" | "oracle_page";
};

const styleOptions: Array<{ label: string; value: OracleStyle }> = [
  { label: "Gentle", value: "gentle" },
  { label: "Direct", value: "direct" },
  { label: "Mystic", value: "mystic" },
  { label: "Pragmatic", value: "pragmatic" },
];

const lifeAreaOptions: Array<{ label: string; value: OracleLifeArea }> = [
  { label: "General", value: "general" },
  { label: "Work", value: "work" },
  { label: "Relationships", value: "relationships" },
  { label: "Health", value: "health" },
  { label: "Money", value: "money" },
  { label: "Spiritual", value: "spiritual" },
];

export function OracleConsole({ surface }: OracleConsoleProps) {
  const { user, loading } = useAuthUser();
  const [message, setMessage] = React.useState("");
  const [style, setStyle] = React.useState<OracleStyle>("mystic");
  const [lifeArea, setLifeArea] = React.useState<OracleLifeArea>("general");
  const [birthDate, setBirthDate] = React.useState("");
  const [birthTime, setBirthTime] = React.useState("");
  const [birthPlace, setBirthPlace] = React.useState("");
  const [birthLatitude, setBirthLatitude] = React.useState("");
  const [birthLongitude, setBirthLongitude] = React.useState("");
  const [response, setResponse] = React.useState<OracleResponse | null>(null);
  const [error, setError] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [health, setHealth] = React.useState<{ up: boolean; model: string | null } | null>(null);
  const [feedbackState, setFeedbackState] = React.useState<"idle" | "sending" | "saved">("idle");
  const [commitState, setCommitState] = React.useState<"idle" | "saving" | "saved">("idle");

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/oracle/health");
        if (!res.ok) return;
        const data = (await res.json()) as { up: boolean; model: string | null };
        setHealth({ up: data.up, model: data.model });
      } catch {
        // no-op
      }
    })();
  }, []);

  async function askOracle(action: OracleAction = "ask", messageOverride?: string) {
    const outgoingMessage = (messageOverride ?? message).trim();
    if (!user) {
      setError("Sign in to ask your oracle.");
      return;
    }
    if (!outgoingMessage) {
      setError("Share a message first.");
      return;
    }

    setError("");
    setSending(true);
    setFeedbackState("idle");
    setCommitState("idle");

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: outgoingMessage,
          surface,
          style,
          action,
          lifeArea,
          previousReply: response?.reply ?? "",
          mysticalProfile: {
            birthDate: birthDate || undefined,
            birthTime: birthTime || undefined,
            birthPlace: birthPlace || undefined,
            birthLatitude: birthLatitude ? Number(birthLatitude) : undefined,
            birthLongitude: birthLongitude ? Number(birthLongitude) : undefined,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err?.error ?? "Oracle unavailable right now.");
        setSending(false);
        return;
      }
      const data = (await res.json()) as OracleResponse;
      setResponse(data);
    } catch {
      setError("Oracle unavailable right now.");
    } finally {
      setSending(false);
    }
  }

  function actionFromFollowUp(question: string): OracleAction {
    const q = question.toLowerCase();
    if (q.includes("coherence audit") || q.includes("alignment")) return "coherence_audit";
    if (
      q.includes("options mapping") ||
      q.includes("best, safest, and boldest") ||
      (q.includes("options") && q.includes("ranked"))
    ) {
      return "options_map";
    }
    if (q.includes("90-day") || q.includes("weekly milestones") || q.includes("concrete")) return "more_practical";
    return "go_deeper";
  }

  async function runFollowUp(question: string) {
    const nextAction = actionFromFollowUp(question);
    setMessage(question);
    await askOracle(nextAction, question);
  }

  async function saveFeedback(rating: "helpful" | "not_helpful") {
    if (!user || !response) return;
    setFeedbackState("sending");
    try {
      const token = await user.getIdToken();
      await fetch("/api/oracle/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          traceId: response.traceId,
          rating,
          message,
          reply: response.reply,
          surface,
          action: response.action,
          lifeArea: response.lifeArea,
        }),
      });
      setFeedbackState("saved");
    } catch {
      setFeedbackState("idle");
    }
  }

  async function commitOption(optionId: string, optionTitle: string) {
    if (!user || !response) return;
    setCommitState("saving");
    try {
      const token = await user.getIdToken();
      await fetch("/api/oracle/commit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          traceId: response.traceId,
          optionId,
          optionTitle,
          lifeArea: response.lifeArea,
        }),
      });
      setCommitState("saved");
    } catch {
      setCommitState("idle");
    }
  }

  return (
    <section className="card stack">
      <div className="oracle-head">
        <p className="pill">Local Oracle</p>
        <span className={`oracle-status ${health?.up ? "up" : "down"}`}>
          {health?.up ? "Model online" : "Model offline"}
        </span>
      </div>

      <p className="subtle">
        Ask gifts/purpose questions and the oracle will switch to mystical discovery mode.
      </p>

      {!loading && !user && (
        <a className="text-sm font-semibold" href="/login">
          Sign in to ask the oracle {"->"}
        </a>
      )}

      <label className="stack">
        <span className="text-sm">Style mode</span>
        <select className="input" value={style} onChange={(event) => setStyle(event.target.value as OracleStyle)}>
          {styleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="stack">
        <span className="text-sm">Life area focus</span>
        <select className="input" value={lifeArea} onChange={(event) => setLifeArea(event.target.value as OracleLifeArea)}>
          {lifeAreaOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="stack">
        <p className="text-sm subtle">
          Optional for astrology-based readings (improves gifts/purpose answers):
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            className="input"
            placeholder="Birth date (YYYY-MM-DD)"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
          <input
            className="input"
            placeholder="Birth time (HH:MM)"
            value={birthTime}
            onChange={(event) => setBirthTime(event.target.value)}
          />
          <input
            className="input"
            placeholder="Birth place (City, Country)"
            value={birthPlace}
            onChange={(event) => setBirthPlace(event.target.value)}
          />
          <input
            className="input"
            placeholder="Lat (optional)"
            value={birthLatitude}
            onChange={(event) => setBirthLatitude(event.target.value)}
          />
          <input
            className="input"
            placeholder="Lon (optional)"
            value={birthLongitude}
            onChange={(event) => setBirthLongitude(event.target.value)}
          />
        </div>
      </div>

      <textarea
        className="textarea"
        placeholder="What are my gifts, and how do I use them?"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />

      <div className="flex flex-wrap gap-3">
        <button className="cta" type="button" disabled={sending || !user} onClick={() => askOracle("ask")}>
          {sending ? "Asking..." : "Ask Oracle"}
        </button>
        <a className="ghost" href="/oracle">
          Open full oracle view
        </a>
      </div>

      {error && <p className="subtle text-sm">{error}</p>}

      {response && (
        <div className="oracle-reply stack">
          <p className="text-sm subtle">
            Source: {response.source} | Intent: {response.intent} | Style: {response.style} | Confidence:{" "}
            {response.reading.confidence} | Area: {response.lifeArea}
          </p>
          {response.natalChart && (
            <p className="text-sm subtle">
              Chart: Sun {response.natalChart.sunSign}, Moon {response.natalChart.moonSign}, Asc{" "}
              {response.natalChart.ascendantSign}, MC {response.natalChart.midheavenSign}, Element{" "}
              {response.natalChart.dominantElement}
            </p>
          )}
          {response.action !== "ask" && (
            <p className="subtle text-sm">Rewrite applied: {response.action}</p>
          )}
          {response.source === "fallback" && (
            <p className="subtle text-sm">
              Model fallback triggered{response.rejectedReasons?.length ? `: ${response.rejectedReasons.join(", ")}` : "."}
            </p>
          )}
          <div className="stack">
            <h4 className="text-lg">Mirror</h4>
            <p>{response.reading.mirror}</p>
          </div>
          <div className="stack">
            <h4 className="text-lg">Reading</h4>
            <ul className="oracle-bullets">
              {response.reading.insights.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
          <div className="stack">
            <h4 className="text-lg">Practice</h4>
            <p>{response.reading.practice}</p>
          </div>
          <div className="stack">
            <h4 className="text-lg">Purpose Path</h4>
            <ul className="oracle-bullets">
              <li>
                <strong>Vocation:</strong> {response.reading.purposePath.vocation}
              </li>
              <li>
                <strong>Service:</strong> {response.reading.purposePath.service}
              </li>
              <li>
                <strong>Spiritual:</strong> {response.reading.purposePath.spiritual}
              </li>
            </ul>
          </div>
          {response.reading.transitFocus.length > 0 && (
            <div className="stack">
              <h4 className="text-lg">Current Transits</h4>
              <ul className="oracle-bullets">
                {response.reading.transitFocus.map((item) => (
                  <li key={`${item.influence}-${item.action}`}>
                    <strong>Influence:</strong> {item.influence} <strong>Action:</strong> {item.action}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="stack">
            <h4 className="text-lg">Coherence</h4>
            {response.reading.coherenceAudit.outOfAlignment.length > 0 && (
              <>
                <p className="subtle text-sm">Out of alignment</p>
                <ul className="oracle-bullets">
                  {response.reading.coherenceAudit.outOfAlignment.map((item) => (
                    <li key={`out-${item}`}>{item}</li>
                  ))}
                </ul>
              </>
            )}
            {response.reading.coherenceAudit.inAlignment.length > 0 && (
              <>
                <p className="subtle text-sm">In alignment</p>
                <ul className="oracle-bullets">
                  {response.reading.coherenceAudit.inAlignment.map((item) => (
                    <li key={`in-${item}`}>{item}</li>
                  ))}
                </ul>
              </>
            )}
            {response.reading.coherenceAudit.nextBestMoves.length > 0 && (
              <>
                <p className="subtle text-sm">Next best moves</p>
                <ul className="oracle-bullets">
                  {response.reading.coherenceAudit.nextBestMoves.map((item) => (
                    <li key={`next-${item}`}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {response.reading.optionsMap.length > 0 && (
            <div className="stack">
              <h4 className="text-lg">Options Available</h4>
              <ul className="oracle-bullets">
                {response.reading.optionsMap.map((item) => (
                  <li key={`${item.option}-${item.firstStep}`}>
                    <strong>{item.option}:</strong> {item.whyNow} <strong>Risk:</strong> {item.risk} <strong>First step:</strong>{" "}
                    {item.firstStep}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="stack">
            <h4 className="text-lg">Decision Engine</h4>
            <p className="subtle text-sm">Truth: {response.reading.decisionEngine.truth}</p>
            {response.reading.decisionEngine.misalignment.length > 0 && (
              <ul className="oracle-bullets">
                {response.reading.decisionEngine.misalignment.map((item) => (
                  <li key={`misalign-${item}`}>Misalignment: {item}</li>
                ))}
              </ul>
            )}
            <div className="stack">
              {response.reading.decisionEngine.options.map((option) => (
                <div key={option.id} className="list-item">
                  <h5 className="text-lg">
                    {option.title} ({option.total})
                  </h5>
                  <p className="subtle text-sm">{option.summary}</p>
                  <p className="subtle text-sm">
                    Scores: A{option.scores.alignment} F{option.scores.feasibility} E{option.scores.energyCost} R{option.scores.risk} U
                    {option.scores.upside}
                  </p>
                  <p className="subtle text-sm">First step: {option.firstStep}</p>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => commitOption(option.id, option.title)}
                    disabled={commitState === "saving"}
                  >
                    Commit to this option
                  </button>
                </div>
              ))}
            </div>
            <p className="subtle text-sm">
              Recommended: {response.reading.decisionEngine.recommendedOptionId} - {response.reading.decisionEngine.recommendedWhy}
            </p>
            {response.reading.decisionEngine.next7Days.length > 0 && (
              <div>
                <p className="subtle text-sm">Next 7 days</p>
                <ul className="oracle-bullets">
                  {response.reading.decisionEngine.next7Days.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="subtle text-sm">Checkpoint: {response.reading.decisionEngine.checkpointQuestion}</p>
            {commitState === "saved" && <p className="subtle text-sm">Commitment saved.</p>}
          </div>
          {response.transits && response.transits.influences.length > 0 && (
            <div className="stack">
              <h4 className="text-lg">Transit Details</h4>
              <ul className="oracle-bullets">
                {response.transits.influences.map((item) => (
                  <li key={`${item.transitBody}-${item.natalPoint}-${item.aspect}-${item.orb}`}>
                    {item.transitBody} {item.aspect} {item.natalPoint} (orb {item.orb}) - {item.action}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="subtle text-sm">Question: {response.reading.question}</p>

          {response.reading.followUpQuestions.length > 0 && (
            <div className="stack">
              <h4 className="text-lg">Needed Next</h4>
              <ul className="oracle-bullets">
                {response.reading.followUpQuestions.map((item) => (
                  <li key={item}>
                    {item}{" "}
                    <button className="ghost" type="button" onClick={() => runFollowUp(item)} disabled={sending}>
                      Ask this
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {response.reading.mysticalArtsUsed.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {response.reading.mysticalArtsUsed.map((art) => (
                <span key={art} className="pill">
                  {art}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button className="ghost" type="button" onClick={() => askOracle("more_practical")} disabled={sending}>
              Make practical
            </button>
            <button className="ghost" type="button" onClick={() => askOracle("go_deeper")} disabled={sending}>
              Go deeper
            </button>
            <button className="ghost" type="button" onClick={() => askOracle("coherence_audit")} disabled={sending}>
              Coherence audit
            </button>
            <button className="ghost" type="button" onClick={() => askOracle("options_map")} disabled={sending}>
              Map options
            </button>
          </div>

          {response.recommendations.length > 0 && response.intent !== "gift_discovery" && (
            <div className="list">
              {response.recommendations.map((item) => (
                <div key={item.id} className="list-item">
                  <h4 className="text-lg">{item.title}</h4>
                  <p className="subtle mt-1">
                    {item.type} - {item.durationMinutes} min - {item.intensity}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              className="ghost"
              type="button"
              onClick={() => saveFeedback("helpful")}
              disabled={feedbackState === "sending" || feedbackState === "saved"}
            >
              Helpful
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => saveFeedback("not_helpful")}
              disabled={feedbackState === "sending" || feedbackState === "saved"}
            >
              Needs work
            </button>
            {feedbackState === "saved" && <span className="subtle text-sm">Feedback saved.</span>}
          </div>
        </div>
      )}
    </section>
  );
}
