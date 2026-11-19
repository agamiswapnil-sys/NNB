import { Link } from "react-router-dom";
import { PageIntro, SectionHeading } from "../App.jsx";

export default function About() {
  return (
    <main>
      <PageIntro eyebrow="A LITTLE ABOUT US" title="More than a place to train." description="NNB Academy is a community where young people build skills, find confidence and discover what they can do." />
      <section className="content-section">
        <div className="container story-layout">
          <div className="story-photo"><img src="https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=1200&q=85" alt="Athletes training together" loading="lazy" /></div>
          <div className="story-copy">
            <span className="eyebrow">OUR APPROACH</span>
            <h2>Big goals grow from good foundations.</h2>
            <p>At NNB Academy, we believe sport can help every young person become more active, resilient and confident. Our coaches create a welcoming environment where learning matters as much as winning.</p>
            <p>From the first practice to the start line, we support athletes with thoughtful coaching, consistent training and a team that celebrates every step forward.</p>
            <Link className="button button--primary" to="/programs">Explore programs <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>
      <section className="values-section">
        <div className="container">
          <SectionHeading eyebrow="WHAT WE BELIEVE" title="A good team makes room to grow." />
          <div className="values-grid">
            <article><span>01</span><h3>Show up</h3><p>Progress starts with curiosity, consistency and the courage to try.</p></article>
            <article><span>02</span><h3>Play fair</h3><p>Respect for teammates, coaches, opponents and ourselves comes first.</p></article>
            <article><span>03</span><h3>Grow together</h3><p>Every athlete belongs. We celebrate effort, learning and one another.</p></article>
          </div>
        </div>
      </section>
    </main>
  );
}
