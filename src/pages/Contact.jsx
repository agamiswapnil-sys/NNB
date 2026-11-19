import { useState } from "react";
import { PageIntro } from "../App.jsx";

export default function Contact() {
  const [sent, setSent] = useState(false);
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = encodeURIComponent(`NNB Academy enquiry from ${form.get("name")}`);
    const body = encodeURIComponent(
      `Name: ${form.get("name")}\nEmail: ${form.get("email")}\nSport of interest: ${form.get("sport") || "Not specified"}\n\n${form.get("message")}`,
    );
    window.location.href = `mailto:hello@nnbacademy.org?subject=${subject}&body=${body}`;
    setSent(true);
  }
  return (
    <main>
      <PageIntro eyebrow="LET’S TALK SPORT" title="Get in touch." description="Interested in joining, collaborating or learning more? We’d love to hear from you." />
      <section className="contact-section">
        <div className="container contact-layout">
          <div className="contact-details">
            <span className="eyebrow">SAY HELLO</span>
            <h2>Great things start with a conversation.</h2>
            <p>Reach out and our team will be happy to point you in the right direction.</p>
            <a href="mailto:hello@nnbacademy.org"><span>EMAIL</span>hello@nnbacademy.org</a>
            <a href="tel:+919876543210"><span>CALL</span>+91 98765 43210</a>
            <div><span>FIND US</span>Guwahati, Assam, India</div>
          </div>
          <form className="contact-form" onSubmit={submit}>
            <h3>Send us a note</h3>
            <p>Your email app will open with your message ready to send.</p>
            <label>Your name<input name="name" required minLength={2} autoComplete="name" /></label>
            <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
            <label>Sport you’re interested in<select name="sport" defaultValue=""><option value="">Choose a sport</option><option>Speed skating</option><option>Athletics</option><option>Badminton</option><option>Swimming</option><option>Karate</option><option>Cycling</option><option>Not sure yet</option></select></label>
            <label>Your message<textarea name="message" rows="4" required minLength={10} /></label>
            <button className="button button--primary" type="submit">Prepare email <span aria-hidden="true">↗</span></button>
            {sent && <p className="contact-success" role="status">Your email app should be ready. If it didn’t open, email us at hello@nnbacademy.org.</p>}
          </form>
        </div>
      </section>
    </main>
  );
}
