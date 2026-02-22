"use client";

import React from "react";
import { useAuthUser } from "@/lib/useAuth";

type OnboardingData = {
  intent: string;
  experience: string;
  styles: string[];
  contraindications: string[];
  consent: boolean;
};

const styleOptions = [
  "Somatic",
  "Breath",
  "Inquiry",
  "Visualization",
  "Devotion",
  "Non-dual pointing",
];

const contraindicationOptions = [
  "Panic-prone",
  "Trauma-sensitive",
  "Breathwork sensitive",
  "High fatigue",
  "Sound sensitive",
];

const experienceOptions = [
  "New to meditation",
  "Some experience",
  "Regular practice",
  "Teacher or facilitator",
];

export default function OnboardingPage() {
  const { user, loading } = useAuthUser();
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState<OnboardingData>({
    intent: "",
    experience: experienceOptions[0],
    styles: [],
    contraindications: [],
    consent: false,
  });
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/onboarding", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (payload.onboarding) {
          setData((prev) => ({ ...prev, ...payload.onboarding }));
        }
      } catch {
        // no-op
      }
    })();
  }, [user]);

  function toggleMulti(field: "styles" | "contraindications", value: string) {
    setData((prev) => {
      const next = prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value];
      return { ...prev, [field]: next };
    });
  }

  function handleNext() {
    if (step < 2) setStep((prev) => prev + 1);
  }

  function handleBack() {
    if (step > 0) setStep((prev) => prev - 1);
  }

  async function handleSubmit() {
    if (!user) {
      setError("Please sign in to finish onboarding.");
      return;
    }
    if (!data.consent) {
      setError("Please confirm the wellbeing disclaimer to continue.");
      return;
    }
    setError("");
    setStatus("saving");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ onboarding: data }),
      });
      if (!response.ok) {
        setError("Unable to save onboarding.");
        setStatus("idle");
        return;
      }
      setStatus("saved");
    } catch {
      setError("Unable to save onboarding.");
      setStatus("idle");
    }
  }

  return (
    <div className="container">
      <header className="top-nav">
        <div>
          <p className="pill">Onboarding</p>
          <h1 className="section-title">A few questions to tune your plan</h1>
        </div>
        <a href="/">Back</a>
      </header>

      <div className="divider" />

      <section className="card stack">
        <p className="subtle">
          This is a wellbeing practice, not medical care. You are in control.
        </p>

        {!loading && !user && (
          <a className="text-sm font-semibold" href="/login">
            Sign in to continue {"->"}
          </a>
        )}

        {step === 0 && (
          <div className="stack">
            <label className="stack">
              <span className="text-sm">Your main intent right now</span>
              <textarea
                className="textarea"
                placeholder="Calm, clarity, release, grounding, sleep..."
                value={data.intent}
                onChange={(event) =>
                  setData((prev) => ({ ...prev, intent: event.target.value }))
                }
              />
            </label>
            <label className="stack">
              <span className="text-sm">Meditation experience</span>
              <select
                className="input"
                value={data.experience}
                onChange={(event) =>
                  setData((prev) => ({ ...prev, experience: event.target.value }))
                }
              >
                {experienceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="stack">
            <p className="text-sm">Preferred styles (choose any)</p>
            <div className="flex flex-wrap gap-2">
              {styleOptions.map((style) => (
                <button
                  key={style}
                  className={`pill ${data.styles.includes(style) ? "text-black" : ""}`}
                  type="button"
                  onClick={() => toggleMulti("styles", style)}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <p className="text-sm">Contraindications (choose any)</p>
            <div className="flex flex-wrap gap-2">
              {contraindicationOptions.map((item) => (
                <button
                  key={item}
                  className={`pill ${data.contraindications.includes(item) ? "text-black" : ""}`}
                  type="button"
                  onClick={() => toggleMulti("contraindications", item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="stack">
              <span className="text-sm">
                I understand this is not medical advice or therapy.
              </span>
              <input
                className="input"
                type="checkbox"
                checked={data.consent}
                onChange={(event) =>
                  setData((prev) => ({ ...prev, consent: event.target.checked }))
                }
              />
            </label>
          </div>
        )}

        {error && <p className="subtle text-sm">{error}</p>}
        {status === "saved" && (
          <p className="subtle text-sm">Saved. You can update this anytime.</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button className="ghost" type="button" onClick={handleBack}>
            Back
          </button>
          {step < 2 ? (
            <button className="cta" type="button" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button className="cta" type="button" onClick={handleSubmit}>
              Save onboarding
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
