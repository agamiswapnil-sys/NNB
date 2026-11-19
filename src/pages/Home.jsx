import { Link } from "react-router-dom";
import { ErrorState, LoadingState, SectionHeading } from "../App.jsx";
import Hero from "../components/Hero.jsx";
import MemberCard from "../components/MemberCard.jsx";
import CommunityMembers from "../components/CommunityMembers.jsx";

export default function Home({ members, loading, error }) {
  return (
    <main>
      <Hero />
      <section className="intro-strip">
        <div className="container intro-layout">
          <span className="intro-emblem" aria-hidden="true">✳</span>
          <p><strong>NNB Academy</strong> nurtures young talent and a lifelong love for sports. Through expert coaching, mentorship and a supportive community, we help every athlete find their own way to thrive.</p>
          <Link className="intro-link" to="/about">Our story <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
      <section className="members-section" id="members">
        <div className="container">
          <div className="members-heading-row">
            <SectionHeading eyebrow="OUR PEOPLE, OUR PRIDE" title="Meet the team" description="Every journey is different. Every effort matters." />
            <Link className="text-link" to="/members">All members <span aria-hidden="true">↗</span></Link>
          </div>
          {loading && <LoadingState label="Loading our athletes…" />}
          {error && <ErrorState message={error} />}
          {!loading && !error && (
            <div className="member-grid">
              {members.map((member) => <MemberCard key={member.id} member={member} />)}
            </div>
          )}
        </div>
      </section>
      <CommunityMembers />
      <section className="home-cta">
        <div className="container home-cta-inner">
          <div><span className="eyebrow eyebrow--light">YOUR NEXT CHAPTER STARTS HERE</span><h2>Ready to find your sport?</h2><p>Come train with us. There’s a place for every kind of ambition.</p></div>
          <Link className="button button--yellow" to="/contact">Talk to our team <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </main>
  );
}
