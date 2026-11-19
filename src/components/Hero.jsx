import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="home-hero">
      <div className="hero-texture" aria-hidden="true" />
      <div className="container hero-layout">
        <div className="hero-copy">
          <span className="eyebrow eyebrow--light"><i /> AN ACADEMY FOR PROMOTING SPORTS AND WELLBEING</span>
          <h1>Find your pace.<br /><em>Own your finish.</em></h1>
          <p>We nurture young talent and a lifelong love for sport — one athlete, one goal, one breakthrough at a time.</p>
          <div className="hero-actions">
            <Link className="button button--yellow" to="/members">Meet our athletes <span aria-hidden="true">↗</span></Link>
            <Link className="button button--outline" to="/about">Discover NNB</Link>
          </div>
          <div className="hero-stats">
            <div><strong>06<span>+</span></strong><small>sports to explore</small></div>
            <div><strong>01<span>+</span></strong><small>community, growing</small></div>
            <div><strong>100<span>%</span></strong><small>heart in every rep</small></div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-ring" />
          <div className="hero-image">
            <img src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1000&q=85" alt="Athlete in motion on the track" />
          </div>
          <div className="hero-sticker"><span>TRAIN</span><strong>HARD.</strong><span>STAY</span><strong>HUMBLE.</strong></div>
          <div className="hero-caption"><span className="caption-dot" /> MADE FOR THE NEXT GENERATION</div>
        </div>
      </div>
      <div className="hero-bottom-line" aria-hidden="true"><span>DISCIPLINE</span><b>✳</b><span>DETERMINATION</span><b>✳</b><span>TEAM SPIRIT</span><b>✳</b><span>GROWTH</span></div>
    </section>
  );
}
