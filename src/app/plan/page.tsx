const planBlocks = [
  {
    title: "Grounding + pacing",
    detail:
      "Two micro-rests per day, 6 minutes each. Gentle breath with hand on heart.",
  },
  {
    title: "Somatic support",
    detail:
      "Seated body scan focusing on ease. No forced expansion. Notice and soften.",
  },
  {
    title: "Awakening inquiry",
    detail:
      "One question: \"What is aware of this experience?\" Sit with it for 3 minutes.",
  },
  {
    title: "Journal prompt",
    detail:
      "What part of me is asking for tenderness today? Write for 6 minutes.",
  },
];

export default function PlanPage() {
  return (
    <div className="container">
      <header className="top-nav">
        <div>
          <p className="pill">Sample plan</p>
          <h1 className="section-title">Week one: gentle stabilization</h1>
        </div>
        <a href="/">Back</a>
      </header>

      <div className="divider" />

      <section className="card stack">
        <p className="subtle">
          Drafted by AI, refined by you. Designed for low energy days.
        </p>
        <div className="list">
          {planBlocks.map((block) => (
            <div key={block.title} className="list-item">
              <h3 className="text-lg">{block.title}</h3>
              <p className="subtle mt-2">{block.detail}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="cta">Request this plan</button>
          <a className="ghost" href="/intake">
            Start new intake
          </a>
        </div>
      </section>
    </div>
  );
}
