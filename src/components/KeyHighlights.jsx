import { SectionHeading } from "../App.jsx";

const icons = ["🏆", "🥇", "↗", "⚡", "✦", "★"];

export default function KeyHighlights({ highlights }) {
  return (
    <section className="highlights-section" id="highlights">
      <div className="container">
        <SectionHeading eyebrow="THE WORK, THE WINS" title="Key highlights" description="Milestones earned through commitment, courage and countless hours of practice." />
        <div className="highlight-grid">
          {highlights.map((highlight, index) => (
            <article className="highlight-card" key={`${highlight}-${index}`}>
              <span className="highlight-icon" aria-hidden="true">{icons[index % icons.length]}</span>
              <span className="highlight-number">{String(index + 1).padStart(2, "0")}</span>
              <p>{highlight}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
