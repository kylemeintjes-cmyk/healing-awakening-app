"use client";

import React from "react";
import { useAuthUser } from "@/lib/useAuth";

const prompts = [
  "What emotion wants space right now?",
  "What do you need to hear that no one has said?",
  "What part of you is ready to soften?",
];

type JournalEntry = {
  id: string;
  createdAt: string;
  prompt: string;
  body: string;
};

const STORAGE_KEY = "lumen.journal.entries";

function loadEntries(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as JournalEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: JournalEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export default function JournalPage() {
  const [selectedPrompt, setSelectedPrompt] = React.useState(prompts[0]);
  const [body, setBody] = React.useState("");
  const [entries, setEntries] = React.useState<JournalEntry[]>([]);
  const [error, setError] = React.useState("");
  const { user } = useAuthUser();

  React.useEffect(() => {
    if (!user) {
      setEntries(loadEntries());
      return;
    }

    (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/journal", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          setError("Unable to load entries.");
          return;
        }
        const data = await response.json();
        setEntries(data.entries ?? []);
      } catch (err) {
        setError("Unable to load entries.");
      }
    })();
  }, [user]);

  async function handleSave() {
    if (!body.trim()) return;
    setError("");
    if (!user) {
      const entry: JournalEntry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        prompt: selectedPrompt,
        body: body.trim(),
      };
      const next = [entry, ...entries].slice(0, 25);
      setEntries(next);
      saveEntries(next);
      setBody("");
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: selectedPrompt, body: body.trim() }),
      });
      if (!response.ok) {
        setError("Unable to save entry.");
        return;
      }
      const data = await response.json();
      setEntries((prev) => [data.entry, ...prev]);
      setBody("");
    } catch (err) {
      setError("Unable to save entry.");
    }
  }

  return (
    <div className="container">
      <header className="top-nav">
        <div>
          <p className="pill">Journal</p>
          <h1 className="section-title">Emotional release</h1>
        </div>
        <a href="/">Back</a>
      </header>

      <div className="divider" />

      <section className="card stack">
        <p className="subtle">
          Choose a prompt or free write. The goal is softness, not performance.
        </p>
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              className={`pill ${selectedPrompt === prompt ? "text-black" : ""}`}
              type="button"
              onClick={() => setSelectedPrompt(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
        <textarea
          className="textarea"
          placeholder="Begin here..."
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <button className="cta" type="button" onClick={handleSave}>
            Save entry
          </button>
          <button className="ghost" type="button">
            Mark as release complete
          </button>
        </div>
        {error && <p className="subtle text-sm">{error}</p>}
      </section>

      <section className="stack mt-8">
        <h2 className="section-title">Recent entries</h2>
        <div className="list">
          {entries.length === 0 ? (
            <p className="subtle text-sm">No entries yet.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="list-item">
                <p className="subtle text-xs">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
                <p className="subtle mt-2 text-sm">{entry.prompt}</p>
                <p className="mt-2 text-sm">{entry.body}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
