import { Link } from "react-router-dom";
import { PageIntro } from "../App.jsx";

const programs = [
  { number: "01", name: "Speed skating", detail: "Build balance, control and race-day confidence with age-appropriate skating fundamentals and speed sessions.", tag: "WHEELS · ALL LEVELS" },
  { number: "02", name: "Athletics", detail: "Learn efficient movement, sprint mechanics and endurance through structured track and field coaching.", tag: "TRACK · FOUNDATION TO COMPETITIVE" },
  { number: "03", name: "Badminton", detail: "Develop footwork, technique and match awareness on court, with coaching for singles and doubles.", tag: "COURT · ALL LEVELS" },
  { number: "04", name: "Swimming", detail: "Grow water confidence, stroke technique and endurance in a supportive, safety-first environment.", tag: "POOL · BEGINNER TO ADVANCED" },
  { number: "05", name: "Karate", detail: "Practice movement, focus and self-discipline through kata and kumite training.", tag: "MARTIAL ARTS · ALL LEVELS" },
  { number: "06", name: "Cycling", detail: "Build road skills and endurance with guided sessions for young riders, from first rides to race preparation.", tag: "ROAD · YOUTH" },
];

export default function Programs() {
  return (
    <main>
      <PageIntro eyebrow="FIND YOUR GAME" title="Move your way." description="Different sports, shared values. Discover a program that gets you moving and keeps you growing." />
      <section className="programs-section">
        <div className="container programs-grid">
          {programs.map((program) => (
            <article className="program-card" key={program.number}>
              <span className="program-number">{program.number}</span>
              <span className="program-tag">{program.tag}</span>
              <h2>{program.name}</h2>
              <p>{program.detail}</p>
              <Link to="/contact" aria-label={`Ask about ${program.name}`}>Ask about this program <span aria-hidden="true">↗</span></Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
