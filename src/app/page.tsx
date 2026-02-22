"use client";

import React from "react";
import { useAuthUser } from "@/lib/useAuth";
import { OracleConsole } from "@/components/oracle-console";

const steps = [
  {
    title: "Ask the oracle",
    detail: "Get grounded guidance from your local GGUF model.",
    href: "/oracle",
  },
  {
    title: "Start healing",
    detail: "A short, guided intake. One question at a time.",
    href: "/intake",
  },
  {
    title: "Receive your plan",
    detail: "A gentle action plan you can follow right away.",
    href: "/plan",
  },
  {
    title: "Daily ritual",
    detail: "Check-in, journal, and meditation in minutes.",
    href: "/checkin",
  },
  {
    title: "Capital OS",
    detail: "Turn skills into cashflow and compound capital weekly.",
    href: "/capital",
  },
];

export default function Home() {
  const { user } = useAuthUser();
  const [recommended, setRecommended] = React.useState<any[]>([]);
  const [rationale, setRationale] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/recommendations", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          setError("Unable to load recommendations.");
          return;
        }
        const data = await response.json();
        setRecommended(data.recommended ?? []);
        setRationale(data.rationale ?? "");
      } catch {
        setError("Unable to load recommendations.");
      }
    })();
  }, [user]);

  return (
    <div className="container">
      <header className="top-nav">
        <div>
          <p className="pill">Lumen Path</p>
          <h1 className="section-title">Healing and awakening, made simple.</h1>
        </div>
        <nav className="stack">
          <a href="/onboarding">Onboarding</a>
          <a href="/intake">Start</a>
          <a href="/plan">Plan</a>
          <a href="/oracle">Oracle</a>
          <a href="/capital">Capital</a>
          <a href="/library">Meditations</a>
        </nav>
      </header>

      <div className="divider" />

      <section className="card stack">
        <p className="subtle">
          Your local oracle model now drives guidance across the app.
        </p>
        <div className="stack">
          <h2 className="text-3xl">Oracle-first healing flow</h2>
          <p className="subtle">
            Ask the oracle, then turn the guidance into practical steps through intake,
            check-ins, and your personalized plan.
          </p>
          <div className="flex flex-wrap gap-3">
            <a className="cta" href="/oracle">
              Open oracle
            </a>
            <a className="ghost" href="/capital">
              Open capital OS
            </a>
            <a className="ghost" href="/login">
              Sign in
            </a>
          </div>
        </div>
      </section>

      <section className="stack mt-8">
        <h3 className="section-title">Ask right now</h3>
        <OracleConsole surface="home" />
      </section>

      <section className="stack mt-8">
        <h3 className="section-title">Today's plan</h3>
        {!user ? (
          <div className="list-item">
            <p className="subtle">
              Sign in to see a personalized plan and recommendations.
            </p>
            <a className="cta mt-3" href="/login">
              Sign in
            </a>
          </div>
        ) : recommended.length === 0 ? (
          <div className="list-item">
            <p className="subtle">
              Add sessions in Admin and complete onboarding to get recommendations.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <a className="cta" href="/onboarding">
                Complete onboarding
              </a>
              <a className="ghost" href="/admin">
                Add sessions
              </a>
            </div>
          </div>
        ) : (
          <div className="list">
            {recommended.map((item) => (
              <div key={item.id} className="list-item">
                <h4 className="text-lg">{item.title}</h4>
                <p className="subtle mt-1">
                  {item.type} - {item.durationMinutes} min - {item.intensity}
                </p>
                {item.description && (
                  <p className="subtle mt-2">{item.description}</p>
                )}
              </div>
            ))}
            {rationale && <p className="subtle text-sm">{rationale}</p>}
          </div>
        )}
        {error && <p className="subtle text-sm">{error}</p>}
      </section>

      <section className="stack mt-8">
        <h3 className="section-title">How it works</h3>
        <div className="list">
          {steps.map((step) => (
            <a key={step.title} className="list-item" href={step.href}>
              <h4 className="text-lg">{step.title}</h4>
              <p className="subtle mt-2">{step.detail}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
