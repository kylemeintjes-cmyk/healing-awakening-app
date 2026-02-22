"use client";

import React from "react";
import { useAuthUser } from "@/lib/useAuth";

type CheckinEntry = {
  id: string;
  createdAt: string;
  energy: number;
  mood: number;
  stress: number;
  sleep: number;
  tension: number;
  symptom: string;
  tone: string;
  readiness: string;
  note: string;
};

const STORAGE_KEY = "lumen.checkins";

function loadCheckins(): CheckinEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CheckinEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCheckins(entries: CheckinEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export default function CheckinPage() {
  const [energy, setEnergy] = React.useState(2);
  const [mood, setMood] = React.useState(3);
  const [stress, setStress] = React.useState(3);
  const [sleep, setSleep] = React.useState(3);
  const [tension, setTension] = React.useState(3);
  const [symptom, setSymptom] = React.useState("Lightheadedness");
  const [tone, setTone] = React.useState("Tender");
  const [readiness, setReadiness] = React.useState("Low");
  const [note, setNote] = React.useState("");
  const [entries, setEntries] = React.useState<CheckinEntry[]>([]);
  const [error, setError] = React.useState("");
  const { user } = useAuthUser();

  React.useEffect(() => {
    if (!user) {
      setEntries(loadCheckins());
      return;
    }

    (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/checkins", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          setError("Unable to load check-ins.");
          return;
        }
        const data = await response.json();
        setEntries(data.entries ?? []);
      } catch (err) {
        setError("Unable to load check-ins.");
      }
    })();
  }, [user]);

  async function handleSubmit() {
    setError("");
    if (!user) {
      const entry: CheckinEntry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        energy,
        mood,
        stress,
        sleep,
        tension,
        symptom,
        tone,
        readiness,
        note: note.trim(),
      };
      const next = [entry, ...entries].slice(0, 30);
      setEntries(next);
      saveCheckins(next);
      setNote("");
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          energy,
          mood,
          stress,
          sleep,
          tension,
          symptom,
          tone,
          readiness,
          note: note.trim(),
        }),
      });
      if (!response.ok) {
        setError("Unable to save check-in.");
        return;
      }
      const data = await response.json();
      setEntries((prev) => [data.entry, ...prev]);
      setNote("");
    } catch (err) {
      setError("Unable to save check-in.");
    }
  }

  return (
    <div className="container">
      <header className="top-nav">
        <div>
          <p className="pill">Daily ritual</p>
          <h1 className="section-title">Check in</h1>
        </div>
        <a href="/">Back</a>
      </header>

      <div className="divider" />

      <section className="card stack">
        <p className="subtle">
          A 90-second pulse check to align your plan with your nervous system.
        </p>
        <div className="stack">
          <label className="stack">
            <span className="text-sm">Energy level (1-5)</span>
            <input
              className="input"
              type="number"
              min={1}
              max={5}
              value={energy}
              onChange={(event) => setEnergy(Number(event.target.value))}
            />
          </label>
          <label className="stack">
            <span className="text-sm">Mood (1-5)</span>
            <input
              className="input"
              type="range"
              min={1}
              max={5}
              value={mood}
              onChange={(event) => setMood(Number(event.target.value))}
            />
            <span className="subtle text-sm">Current: {mood}</span>
          </label>
          <label className="stack">
            <span className="text-sm">Stress (1-5)</span>
            <input
              className="input"
              type="range"
              min={1}
              max={5}
              value={stress}
              onChange={(event) => setStress(Number(event.target.value))}
            />
            <span className="subtle text-sm">Current: {stress}</span>
          </label>
          <label className="stack">
            <span className="text-sm">Sleep quality (1-5)</span>
            <input
              className="input"
              type="range"
              min={1}
              max={5}
              value={sleep}
              onChange={(event) => setSleep(Number(event.target.value))}
            />
            <span className="subtle text-sm">Current: {sleep}</span>
          </label>
          <label className="stack">
            <span className="text-sm">Body tension (1-5)</span>
            <input
              className="input"
              type="range"
              min={1}
              max={5}
              value={tension}
              onChange={(event) => setTension(Number(event.target.value))}
            />
            <span className="subtle text-sm">Current: {tension}</span>
          </label>
          <label className="stack">
            <span className="text-sm">Primary symptom</span>
            <input
              className="input"
              value={symptom}
              onChange={(event) => setSymptom(event.target.value)}
            />
          </label>
          <label className="stack">
            <span className="text-sm">Emotional tone</span>
            <input
              className="input"
              value={tone}
              onChange={(event) => setTone(event.target.value)}
            />
          </label>
          <label className="stack">
            <span className="text-sm">Meditation readiness</span>
            <input
              className="input"
              value={readiness}
              onChange={(event) => setReadiness(event.target.value)}
            />
          </label>
          <label className="stack">
            <span className="text-sm">What do you need today?</span>
            <textarea
              className="textarea"
              placeholder="A softer plan, less stimulation, more grounding..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>
        <button className="cta" type="button" onClick={handleSubmit}>
          Submit check-in
        </button>
        {error && <p className="subtle text-sm">{error}</p>}
      </section>

      <section className="stack mt-8">
        <h2 className="section-title">Recent check-ins</h2>
        <div className="list">
          {entries.length === 0 ? (
            <p className="subtle text-sm">No check-ins yet.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="list-item">
                <p className="subtle text-xs">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
                <div className="mt-2 grid gap-1 text-sm">
                  <span>Energy: {entry.energy} / 5</span>
                  <span>Mood: {entry.mood} / 5</span>
                  <span>Stress: {entry.stress} / 5</span>
                  <span>Sleep: {entry.sleep} / 5</span>
                  <span>Tension: {entry.tension} / 5</span>
                  <span>Symptom: {entry.symptom}</span>
                  <span>Tone: {entry.tone}</span>
                  <span>Readiness: {entry.readiness}</span>
                </div>
                {entry.note && <p className="mt-2 text-sm">{entry.note}</p>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
