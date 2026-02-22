const playlists = [
  {
    title: "Restorative nervous system calm",
    tags: ["ME/CFS", "Low energy", "Soothing"],
  },
  {
    title: "Non-dual presence in pain",
    tags: ["Chronic pain", "Insight", "Stillness"],
  },
  {
    title: "Somatic release + breath",
    tags: ["POTS", "Breath", "Stabilize"],
  },
  {
    title: "Long COVID recovery rituals",
    tags: ["Long COVID", "Gentle", "Morning"],
  },
];

export default function LibraryPage() {
  return (
    <div className="container">
      <header className="top-nav">
        <div>
          <p className="pill">Meditations</p>
          <h1 className="section-title">Meditation library</h1>
        </div>
        <a href="/">Back</a>
      </header>

      <div className="divider" />

      <section className="card stack">
        <div className="stack">
          <h2 className="text-2xl">Your YouTube playlists</h2>
          <p className="subtle">
            Tag by condition, energy, and depth. Surface the right meditation
            in one click.
          </p>
        </div>
        <div className="list">
          {playlists.map((playlist) => (
            <div key={playlist.title} className="list-item">
              <h3 className="text-lg">{playlist.title}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {playlist.tags.map((tag) => (
                  <span key={tag} className="pill">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-sm subtle">YouTube embed preview</div>
            </div>
          ))}
        </div>
        <button className="cta w-fit">Add playlist</button>
      </section>
    </div>
  );
}
