import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div>
          <Link className="brand brand--footer" to="/">
            <span className="brand-mark" aria-hidden="true">N</span>
            <span className="brand-word">NNB <em>Academy</em></span>
          </Link>
          <p>Building confident athletes and a lifelong love of sport.</p>
        </div>
        <div className="footer-links">
          <span className="footer-title">Explore</span>
          <Link to="/about">About the academy</Link>
          <Link to="/members">Our members</Link>
          <Link to="/programs">Training programs</Link>
        </div>
        <div className="footer-links">
          <span className="footer-title">Get in touch</span>
          <a href="mailto:hello@nnbacademy.org">hello@nnbacademy.org</a>
          <a href="tel:+919876543210">+91 98765 43210</a>
          <span>Guwahati, Assam, India</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} NNB Academy</span>
        <span>Sport. Skill. Spirit.</span>
      </div>
    </footer>
  );
}
