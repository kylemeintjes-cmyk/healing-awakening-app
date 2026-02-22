"use client";

import React from "react";
import { useAuthUser } from "@/lib/useAuth";

type SessionContent = {
  id: string;
  title: string;
  type: string;
  url: string;
  durationMinutes: number;
  description: string;
  tags: string[];
  intensity: string;
  contraindications: string[];
  createdAt: string;
};

const queue = [
  {
    name: "Kira",
    focus: "Long COVID + insomnia",
    status: "Draft ready",
  },
  {
    name: "Sam",
    focus: "ME/CFS + anxiety",
    status: "Needs edits",
  },
];

export default function AdminPage() {
  const { user, loading } = useAuthUser();
  const [sessions, setSessions] = React.useState<SessionContent[]>([]);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "",
    type: "audio",
    url: "",
    durationMinutes: 10,
    description: "",
    tags: "",
    intensity: "gentle",
    contraindications: "",
  });

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/sessions", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          setError("Unable to load sessions.");
          return;
        }
        const data = await response.json();
        setSessions(data.sessions ?? []);
      } catch {
        setError("Unable to load sessions.");
      }
    })();
  }, [user]);

  async function handleCreate() {
    if (!user) {
      setError("Sign in to manage sessions.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          url: form.url,
          durationMinutes: form.durationMinutes,
          description: form.description,
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          intensity: form.intensity,
          contraindications: form.contraindications
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      if (!response.ok) {
        setError("Unable to create session.");
        setSaving(false);
        return;
      }
      const data = await response.json();
      setSessions((prev) => [data.session, ...prev]);
      setForm({
        title: "",
        type: "audio",
        url: "",
        durationMinutes: 10,
        description: "",
        tags: "",
        intensity: "gentle",
        contraindications: "",
      });
    } catch {
      setError("Unable to create session.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <header className="top-nav">
        <div>
          <p className="pill">Admin</p>
          <h1 className="section-title">Session library</h1>
        </div>
        <a href="/">Back</a>
      </header>

      <div className="divider" />

      <section className="card stack">
        <p className="subtle">Add and tag sessions for recommendations.</p>
        {!loading && !user && (
          <a className="text-sm font-semibold" href="/login">
            Sign in to manage sessions {"->"}
          </a>
        )}
        <div className="stack">
          <label className="stack">
            <span className="text-sm">Title</span>
            <input
              className="input"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </label>
          <label className="stack">
            <span className="text-sm">Type</span>
            <select
              className="input"
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, type: event.target.value }))
              }
            >
              <option value="audio">Audio</option>
              <option value="video">Video</option>
              <option value="text">Text</option>
            </select>
          </label>
          <label className="stack">
            <span className="text-sm">URL</span>
            <input
              className="input"
              value={form.url}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, url: event.target.value }))
              }
            />
          </label>
          <label className="stack">
            <span className="text-sm">Duration (minutes)</span>
            <input
              className="input"
              type="number"
              min={1}
              value={form.durationMinutes}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  durationMinutes: Number(event.target.value),
                }))
              }
            />
          </label>
          <label className="stack">
            <span className="text-sm">Description</span>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </label>
          <label className="stack">
            <span className="text-sm">Tags (comma separated)</span>
            <input
              className="input"
              value={form.tags}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tags: event.target.value }))
              }
            />
          </label>
          <label className="stack">
            <span className="text-sm">Intensity</span>
            <select
              className="input"
              value={form.intensity}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, intensity: event.target.value }))
              }
            >
              <option value="gentle">Gentle</option>
              <option value="medium">Medium</option>
              <option value="deep">Deep</option>
            </select>
          </label>
          <label className="stack">
            <span className="text-sm">Contraindications (comma separated)</span>
            <input
              className="input"
              value={form.contraindications}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  contraindications: event.target.value,
                }))
              }
            />
          </label>
          <button className="cta" type="button" onClick={handleCreate} disabled={saving}>
            {saving ? "Saving..." : "Add session"}
          </button>
        </div>
        {error && <p className="subtle text-sm">{error}</p>}
      </section>

      <section className="stack mt-8">
        <h2 className="section-title">Existing sessions</h2>
        <div className="list">
          {sessions.length === 0 ? (
            <p className="subtle text-sm">No sessions yet.</p>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="list-item">
                <h3 className="text-lg">{session.title}</h3>
                <p className="subtle mt-1">
                  {session.type} - {session.durationMinutes} min - {session.intensity}
                </p>
                {session.description && <p className="mt-2 text-sm">{session.description}</p>}
                {session.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {session.tags.map((tag) => (
                      <span key={`${session.id}-${tag}`} className="pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="stack mt-8">
        <h2 className="section-title">Review queue</h2>
        <div className="list">
          {queue.map((item) => (
            <div key={item.name} className="list-item">
              <h3 className="text-lg">{item.name}</h3>
              <p className="subtle mt-1">{item.focus}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="pill">{item.status}</span>
                <button className="cta">Review</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
