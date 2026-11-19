import { useEffect, useState } from "react";
import ContactVerificationForm from "./ContactVerificationForm.jsx";
import { SectionHeading } from "../App.jsx";

function EventDetails({ event }) {
  return (
    <div className="event-details">
      {event.images?.length > 0 && (
        <div className="event-gallery">
          {event.images.map((image, index) => <img src={image} alt={`${event.title} — event photo ${index + 1}`} key={image} loading="lazy" />)}
        </div>
      )}
      <dl className="event-facts">
        <div><dt>VENUE</dt><dd>{event.venue}</dd></div>
        <div><dt>DATE</dt><dd>{event.date}</dd></div>
        <div><dt>CATEGORY</dt><dd>{event.category}</dd></div>
        <div><dt>RESULT</dt><dd>{event.result}</dd></div>
      </dl>
    </div>
  );
}

export default function SportsEvents({ playerId, events }) {
  const [activeEvent, setActiveEvent] = useState(null);
  const [unlocked, setUnlocked] = useState({});
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState(null);
  const isVerified = Object.keys(unlocked).length > 0;
  const selectedEvent = events.find((event) => event.id === activeEvent);

  useEffect(() => {
    if (!verificationOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event) {
      if (event.key === "Escape") setVerificationOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [verificationOpen]);

  return (
    <section className="events-section" id="events">
      <div className="container">
        <SectionHeading eyebrow="MOMENTS THAT MOVE US" title="Sports events participated" description="A record of the competitions, lessons and milestones along the way." />
        <div className="events-list">
          {events.map((event, index) => {
            const isUnlocked = Boolean(unlocked[event.id]);
            const isActive = activeEvent === event.id;
            return (
              <article className={`event-item${isUnlocked ? " event-item--unlocked" : ""}${isVerified && isActive ? " event-item--active" : ""}`} key={event.id}>
                <button
                  type="button"
                  className="event-trigger"
                  aria-expanded={isVerified && isActive}
                  aria-haspopup={isVerified ? undefined : "dialog"}
                  onClick={() => {
                    if (isVerified) {
                      setActiveEvent(isActive ? null : event.id);
                    } else {
                      setActiveEvent(event.id);
                      setVerificationOpen(true);
                    }
                  }}
                >
                  <span className="event-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="event-title">{event.title}</span>
                  <span className="event-access">{isUnlocked ? "VIEW RECORD" : "VERIFY TO VIEW"}</span>
                  <span className="event-chevron" aria-hidden="true">{isVerified && isActive ? "−" : "+"}</span>
                </button>
                {isVerified && isActive && isUnlocked && <EventDetails event={unlocked[event.id]} />}
              </article>
            );
          })}
        </div>
        {verificationOpen && selectedEvent && (
          <div
            className="event-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setVerificationOpen(false);
            }}
          >
            <div className="event-verification-dialog" role="dialog" aria-modal="true" aria-labelledby="event-verification-title">
              <ContactVerificationForm
                key={selectedEvent.id}
                playerId={playerId}
                eventId={selectedEvent.id}
                eventTitle={selectedEvent.title}
                onCancel={() => setVerificationOpen(false)}
                onVerified={({ events: details, submission }) => {
                  setUnlocked(Object.fromEntries(details.map((event) => [event.id, event])));
                  setActiveEvent(events[0]?.id || null);
                  setVerificationOpen(false);
                  setSubmissionNotice(
                    submission.emailSent
                      ? { type: "success", text: "Your contact details were sent to hello@gmail.com." }
                      : {
                          type: "warning",
                          text: submission.emailConfigured
                            ? "Your details are saved, but the email notification could not be sent. The academy can view them in the Admin Panel."
                            : "Your details are saved in the Admin Panel. Email notifications are not configured yet.",
                        },
                  );
                }}
              />
            </div>
          </div>
        )}
        {submissionNotice && <p className={`submission-notice submission-notice--${submissionNotice.type}`} role="status">{submissionNotice.text}</p>}
        <p className="events-privacy">Event information is shared after successful contact and CAPTCHA verification.</p>
      </div>
    </section>
  );
}
