"use client";

import React from "react";
import Link from "next/link";
import { useAuthUser } from "@/lib/useAuth";
import { OracleConsole } from "@/components/oracle-console";

type RecommendedSession = {
  id: string;
  title: string;
  type: string;
  durationMinutes: number;
  intensity: string;
  description?: string;
};

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
  {
    title: "Joy OS",
    detail: "Track joy and confidence, then run weekly joy-first growth plans.",
    href: "/joy",
  },
];

export default function Home() {
  const { user } = useAuthUser();
  const [recommended, setRecommended] = React.useState<RecommendedSession[]>([]);
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
          <Link href="/onboarding">Onboarding</Link>
          <Link href="/intake">Start</Link>
          <Link href="/plan">Plan</Link>
          <Link href="/oracle">Oracle</Link>
          <Link href="/capital">Capital</Link>
          <Link href="/joy">Joy</Link>
          <Link href="/library">Meditations</Link>
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
            <Link className="cta" href="/oracle">
              Open oracle
            </Link>
            <Link className="ghost" href="/capital">
              Open capital OS
            </Link>
            <Link className="ghost" href="/joy">
              Open joy OS
            </Link>
            <Link className="ghost" href="/login">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="card stack mt-8">
        <p className="pill">New</p>
        <h3 className="section-title">Joy OS: feel better and grow faster</h3>
        <p className="subtle">
          Run a quick daily joy check-in, get adaptive guidance, and build a weekly plan that compounds joy and money confidence.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="cta" href="/joy">
            Launch Joy OS
          </Link>
          <Link className="ghost" href="/capital">
            Pair with Capital OS
          </Link>
        </div>
      </section>

      <section className="stack mt-8">
        <h3 className="section-title">Ask right now</h3>
        <OracleConsole surface="home" />
      </section>

      <section className="stack mt-8">
        <h3 className="section-title">Today&apos;s plan</h3>
        {!user ? (
          <div className="list-item">
            <p className="subtle">
              Sign in to see a personalized plan and recommendations.
            </p>
            <Link className="cta mt-3" href="/login">
              Sign in
            </Link>
          </div>
        ) : recommended.length === 0 ? (
          <div className="list-item">
            <p className="subtle">
              Add sessions in Admin and complete onboarding to get recommendations.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <Link className="cta" href="/onboarding">
                Complete onboarding
              </Link>
              <Link className="ghost" href="/admin">
                Add sessions
              </Link>
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
            <Link key={step.title} className="list-item" href={step.href}>
              <h4 className="text-lg">{step.title}</h4>
              <p className="subtle mt-2">{step.detail}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
