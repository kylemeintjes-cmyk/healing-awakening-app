"use client";

import React from "react";
import { useAuthUser } from "@/lib/useAuth";

type IntakeAnswers = {
  stuck: string;
  energy: string;
  conditions: string;
  goal: string;
  meditation: string;
  limits: string;
};

const questions = [
  {
    key: "stuck",
    label: "Where do you feel most stuck right now?",
    hint: "Symptoms, emotions, or patterns that feel heavy.",
  },
  {
    key: "energy",
    label: "What is your energy level today?",
    hint: "1 = fragile, 5 = steady",
  },
  {
    key: "conditions",
    label: "What conditions are you living with?",
    hint: "ME/CFS, Long COVID, POTS, chronic pain, other.",
  },
  {
    key: "goal",
    label: "What would meaningful healing look like in 30 days?",
    hint: "Be specific and gentle.",
  },
  {
    key: "meditation",
    label: "What is your relationship to meditation or awakening?",
    hint: "Beginner, experienced, seeking insight.",
  },
  {
    key: "limits",
    label: "Any pacing limits or triggers we should honor?",
    hint: "Movement, breathwork, screen time, etc.",
  },
];

function generatePlan(answers: IntakeAnswers) {
  const energyNum = Number(answers.energy);
  const energyLevel = Number.isNaN(energyNum) ? 3 : Math.max(1, Math.min(5, energyNum));
  const intensity = energyLevel <= 2 ? "very gentle" : energyLevel <= 4 ? "gentle" : "steady";

  return [
    {
      title: "Daily grounding",
      detail: `Two ${intensity} rests per day. Hand on heart, 6 slow breaths. Aim for ease, not effort.`,
    },
    {
      title: "Nervous system care",
      detail:
        "Short seated body scan: notice three points of ease, soften around discomfort.",
    },
    {
      title: "Healing focus",
      detail: `Primary focus: ${answers.stuck || "stabilization"}. Pair with pacing and kindness.`,
    },
    {
      title: "Awakening inquiry",
      detail:
        "One question daily: \"What is aware of this experience?\" Sit for 3 minutes.",
    },
    {
      title: "Journal prompt",
      detail: "What part of me is asking for tenderness today? Write for 6 minutes.",
    },
  ];
}

export default function IntakePage() {
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<IntakeAnswers>({
    stuck: "",
    energy: "",
    conditions: "",
    goal: "",
    meditation: "",
    limits: "",
  });
  const [submitted, setSubmitted] = React.useState(false);
  const [serverPlan, setServerPlan] = React.useState<any>(null);
  const [error, setError] = React.useState("");
  const { user, loading } = useAuthUser();

  const current = questions[step];
  const plan = generatePlan(answers);

  function handleNext() {
    if (step < questions.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }
    handleSubmit();
  }

  function handleBack() {
    if (step > 0) setStep((prev) => prev - 1);
  }

  async function handleSubmit() {
    if (!user) {
      setError("Please sign in to generate your plan.");
      return;
    }
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/intakes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(answers),
      });
      if (!response.ok) {
        setError("Unable to generate plan. Try again.");
        return;
      }
      const data = await response.json();
      setServerPlan(data.plan);
      setSubmitted(true);
    } catch (err) {
      setError("Unable to generate plan. Try again.");
    }
  }

  return (
    <div className="container">
      <header className="top-nav">
        <div>
          <p className="pill">Guided intake</p>
          <h1 className="section-title">One question at a time</h1>
        </div>
        <a href="/">Back</a>
      </header>

      <div className="divider" />

      <section className="card stack">
        <p className="subtle">
          We'll go step by step. Your responses create a personalized action plan.
        </p>
        {!submitted ? (
          <div className="stack">
            <div className="progress">
              {questions.map((_, index) => (
                <span
                  key={`step-${index}`}
                  className={index <= step ? "active" : ""}
                />
              ))}
            </div>
            <div className="stack">
              <label className="text-lg font-semibold">{current.label}</label>
              <span className="subtle text-sm">{current.hint}</span>
              <textarea
                className="textarea"
                placeholder="Share what is alive right now..."
                value={answers[current.key as keyof IntakeAnswers]}
                onChange={(event) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [current.key]: event.target.value,
                  }))
                }
              />
            </div>
            {error && <p className="subtle text-sm">{error}</p>}
            {!loading && !user && (
              <a className="text-sm font-semibold" href="/login">
                Sign in to continue {"->"}
              </a>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                className="ghost"
                type="button"
                onClick={handleBack}
                disabled={step === 0}
              >
                Back
              </button>
              <button className="cta" type="button" onClick={handleNext}>
                {step === questions.length - 1 ? "Generate plan" : "Next"}
              </button>
            </div>
          </div>
        ) : (
          <div className="stack">
            <div className="list-item">
              <p className="pill">Your plan</p>
              <h2 className="text-2xl mt-3">Gentle 30-day action plan</h2>
              <p className="subtle mt-2">
                This draft reflects your intake. You can refine it at any time.
              </p>
            </div>
            <div className="list">
              {(serverPlan?.items ?? plan).map((item: any) => (
                <div key={item.title} className="list-item">
                  <h3 className="text-lg">{item.title}</h3>
                  <p className="subtle mt-2">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setStep(0);
                }}
              >
                Start over
              </button>
              <a className="cta" href="/checkin">
                Go to daily ritual
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
