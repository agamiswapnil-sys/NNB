import { Link } from "react-router-dom";

export default function PlayerBio({ player }) {
  return (
    <section className="profile-hero">
      <div className="profile-hero-texture" aria-hidden="true" />
      <div className="container profile-hero-layout">
        <div className="profile-portrait">
          <img src={player.photo} alt={player.name} />
          <span className="portrait-label"><i /> NNB ACADEMY ATHLETE</span>
        </div>
        <div className="profile-bio-copy">
          <Link className="back-link" to="/members">← Back to members</Link>
          <span className="eyebrow eyebrow--light">{player.sport} · NNB ATHLETE</span>
          <h1>{player.name}</h1>
          <div className="profile-rule" />
          <p>{player.bio}</p>
          <a className="button button--instagram" href={player.instagram} target="_blank" rel="noreferrer">
            <span className="instagram-icon" aria-hidden="true">◎</span> Follow on Instagram <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
