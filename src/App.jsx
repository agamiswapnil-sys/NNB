import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { getPlayers } from "./api.js";
import Home from "./pages/Home.jsx";
import PlayerProfile from "./pages/PlayerProfile.jsx";
import About from "./pages/About.jsx";
import Members from "./pages/Members.jsx";
import Programs from "./pages/Programs.jsx";
import Contact from "./pages/Contact.jsx";
import Admin from "./pages/Admin.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";

export function useMembers() {
  const [members, setMembers] = useState([]);
  const [membersState, setMembersState] = useState({ loading: true, error: "" });

  useEffect(() => {
    let mounted = true;
    getPlayers()
      .then((data) => {
        if (mounted) {
          setMembers(data);
          setMembersState({ loading: false, error: "" });
        }
      })
      .catch((error) => {
        if (mounted) setMembersState({ loading: false, error: error.message });
      });
    return () => { mounted = false; };
  }, []);

  return { members, ...membersState };
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pathname, hash]);
  return null;
}

function NotFound() {
  return (
    <main className="not-found">
      <span className="eyebrow">404 · OFF THE TRACK</span>
      <h1>This page isn’t in the lineup.</h1>
      <p>Let’s get you back to the academy.</p>
      <Link className="button button--primary" to="/">Back to home</Link>
    </main>
  );
}

export default function App() {
  const membersData = useMembers();
  const { pathname } = useLocation();
  const isAdmin = pathname === "/admin";
  return (
    <>
      <ScrollToTop />
      {!isAdmin && <Navbar />}
      <Routes>
        <Route path="/" element={<Home {...membersData} />} />
        <Route path="/about" element={<About />} />
        <Route path="/members" element={<Members {...membersData} />} />
        <Route path="/members/:playerId" element={<PlayerProfile />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isAdmin && <Footer />}
    </>
  );
}

export function SectionHeading({ eyebrow, title, description, centered = false }) {
  return (
    <div className={`section-heading${centered ? " section-heading--centered" : ""}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

export function PageIntro({ eyebrow, title, description }) {
  return (
    <section className="page-intro">
      <div className="container">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}

export function LoadingState({ label = "Loading academy details…" }) {
  return <div className="state-message" role="status"><span className="loader" />{label}</div>;
}

export function ErrorState({ message, retry }) {
  return (
    <div className="state-message state-message--error" role="alert">
      <span>{message}</span>
      {retry && <button className="text-button" onClick={retry}>Try again</button>}
    </div>
  );
}

export function ActiveLink({ to, children, ...props }) {
  return <NavLink to={to} end={to === "/"} {...props}>{children}</NavLink>;
}
