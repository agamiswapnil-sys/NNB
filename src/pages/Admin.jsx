import { useEffect, useState } from "react";
import {
  deleteAdminSubmission,
  getAdminPlayers,
  getAdminSubmissions,
  getAdminSession,
  loginAdmin,
  logoutAdmin,
  saveAdminPlayers,
} from "../api.js";

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function blankPlayer() {
  return { id: "", name: "", sport: "", photo: "", bio: "", instagram: "", highlights: [], events: [] };
}

function blankEvent() {
  return { id: "", title: "", venue: "", date: "", category: "", result: "", images: [] };
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(null);
  const [login, setLogin] = useState({ username: "admin", password: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adminView, setAdminView] = useState("athletes");
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminSession()
      .then(async (value) => {
        if (!active) return;
        if (value.authenticated) {
          setSession(value);
          setLogin((current) => ({ ...current, username: value.username }));
          const records = await getAdminPlayers();
          if (active) {
            setPlayers(records);
            if (records[0]) {
              setSelectedId(records[0].id);
              setDraft(records[0]);
            }
          }
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function choosePlayer(player) {
    setAdminView("athletes");
    setSelectedId(player.id);
    setDraft(structuredClone(player));
    setError("");
    setNotice("");
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const value = await loginAdmin(login.username, login.password);
      const records = await getAdminPlayers();
      setSession(value);
      setPlayers(records);
      setLogin((current) => ({ ...current, password: "" }));
      if (records[0]) choosePlayer(records[0]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateEvent(index, key, value) {
    setDraft((current) => ({
      ...current,
      events: current.events.map((event, eventIndex) =>
        eventIndex === index ? { ...event, [key]: value } : event),
    }));
  }

  function addPlayer() {
    setAdminView("athletes");
    const player = blankPlayer();
    setDraft(player);
    setSelectedId("");
    setError("");
    setNotice("New athlete — add their details, then save.");
  }

  function removePlayer() {
    if (!draft?.id || !window.confirm(`Remove ${draft.name} and all their event records?`)) return;
    const nextPlayers = players.filter((player) => player.id !== draft.id);
    setPlayers(nextPlayers);
    setSelectedId(nextPlayers[0]?.id || "");
    setDraft(nextPlayers[0] ? structuredClone(nextPlayers[0]) : null);
    setNotice("Athlete removed. Save changes to confirm.");
    setError("");
  }

  function makePlayerId(name) {
    if (!selectedId) {
      updateDraft("id", slugify(name));
    }
  }

  async function saveAll(event) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    setNotice("");
    const nextPlayers = selectedId
      ? players.map((player) => player.id === selectedId ? draft : player)
      : [...players, draft];
    try {
      await saveAdminPlayers(nextPlayers, session.csrfToken);
      setPlayers(nextPlayers);
      setSelectedId(draft.id);
      setNotice("Changes saved. The public website is updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutAdmin(session.csrfToken);
      setSession(null);
      setPlayers([]);
      setSelectedId("");
      setDraft(null);
      setSubmissions([]);
      setNotice("");
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function openSubmissions() {
    setAdminView("submissions");
    setSubmissionsLoading(true);
    setError("");
    setNotice("");
    try {
      setSubmissions(await getAdminSubmissions());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmissionsLoading(false);
    }
  }

  async function removeSubmission(submission) {
    if (!window.confirm(`Delete the contact submission from ${submission.fullName}?`)) return;
    setError("");
    setNotice("");
    try {
      await deleteAdminSubmission(submission.id, session.csrfToken);
      setSubmissions((current) => current.filter((item) => item.id !== submission.id));
      setNotice("Contact submission deleted.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (loading) {
    return <main className="admin-page"><div className="admin-state">Loading admin panel…</div></main>;
  }

  if (!session) {
    return (
      <main className="admin-page admin-login-page">
        <section className="admin-login-card">
          <span className="eyebrow">NNB ACADEMY · ADMIN</span>
          <h1>Welcome back.</h1>
          <p>Sign in to manage athlete profiles and event records.</p>
          <form onSubmit={handleLogin}>
            <label>Username<input autoComplete="username" value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} required /></label>
            <label>Password<input type="password" autoComplete="current-password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} required /></label>
            {error && <p className="admin-error" role="alert">{error}</p>}
            <button className="button button--primary" type="submit" disabled={loading}>Sign in <span aria-hidden="true">→</span></button>
          </form>
          <a className="admin-back-link" href="/">← Back to academy website</a>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <a className="brand" href="/" aria-label="NNB Academy home">
            <span className="brand-mark" aria-hidden="true">N</span>
            <span className="brand-word">NNB <em>Admin</em></span>
          </a>
          <div className="admin-sidebar-heading"><span>CONTENT</span><strong>Manage athletes</strong></div>
          <button
            type="button"
            className={`admin-nav-button${adminView === "athletes" ? " is-selected" : ""}`}
            onClick={() => setAdminView("athletes")}
          >
            Athlete profiles
          </button>
          <button
            type="button"
            className={`admin-nav-button${adminView === "submissions" ? " is-selected" : ""}`}
            onClick={openSubmissions}
          >
            Members & enquiries
          </button>
          {adminView === "athletes" && (
            <>
              <nav className="admin-player-list" aria-label="Athletes">
                {players.map((player) => (
                  <button
                    key={player.id}
                    className={`admin-player-choice${selectedId === player.id ? " is-selected" : ""}`}
                    type="button"
                    onClick={() => choosePlayer(player)}
                  >
                    <span>{player.name}</span><small>{player.sport}</small>
                  </button>
                ))}
              </nav>
              <button type="button" className="admin-add-player" onClick={addPlayer}>＋ Add athlete</button>
            </>
          )}
          <div className="admin-sidebar-bottom">
            <span>Signed in as <strong>{session.username}</strong></span>
            <button className="text-button" type="button" onClick={handleLogout}>Sign out</button>
          </div>
        </aside>

        <section className="admin-workspace">
          <header className="admin-topbar">
            <div><span className="eyebrow">CONTENT MANAGEMENT</span><h1>{adminView === "submissions" ? "Members & enquiries" : (draft?.name || "New athlete")}</h1></div>
            <a className="admin-preview-link" href="/" target="_blank" rel="noreferrer">View website ↗</a>
          </header>
          {error && <p className="admin-banner admin-banner--error" role="alert">{error}</p>}
          {notice && <p className="admin-banner" role="status">{notice}</p>}
          {adminView === "submissions" ? (
            <section className="admin-panel admin-submissions-panel">
              <div className="admin-panel-heading">
                <span>01</span>
                <div><h2>Contact submissions</h2><p>Private contact details are visible only to signed-in admins.</p></div>
              </div>
              {submissionsLoading && <div className="admin-empty">Loading submissions…</div>}
              {!submissionsLoading && submissions.length === 0 && <div className="admin-empty">No contact submissions yet.</div>}
              {!submissionsLoading && submissions.length > 0 && (
                <div className="admin-submission-list">
                  {submissions.map((submission) => (
                    <article className="admin-submission-card" key={submission.id}>
                      <div className="admin-submission-heading">
                        <div><h3>{submission.fullName}</h3><span>{new Date(submission.createdAt).toLocaleString()}</span></div>
                        <span className={`admin-email-status admin-email-status--${submission.emailStatus}`}>
                          {submission.emailStatus === "sent" ? "Email sent" : submission.emailStatus === "failed" ? "Email failed" : submission.emailStatus === "pending" ? "Email pending" : "Email not configured"}
                        </span>
                      </div>
                      <dl className="admin-submission-facts">
                        <div><dt>Email</dt><dd><a href={`mailto:${submission.email}`}>{submission.email}</a></dd></div>
                        <div><dt>Mobile</dt><dd><a href={`tel:${submission.mobile}`}>{submission.mobile}</a></dd></div>
                        <div><dt>Player</dt><dd>{submission.playerName} · {submission.sport}</dd></div>
                        <div><dt>Event</dt><dd>{submission.eventTitle}</dd></div>
                        <div><dt>Public name consent</dt><dd>{submission.showInMembers ? "Yes" : "No"}</dd></div>
                      </dl>
                      <button className="admin-delete-button" type="button" onClick={() => removeSubmission(submission)}>Delete submission</button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : !draft ? (
            <div className="admin-empty">Choose an athlete or add a new profile.</div>
          ) : (
            <form className="admin-editor" onSubmit={saveAll}>
              <section className="admin-panel">
                <div className="admin-panel-heading"><span>01</span><div><h2>Player profile</h2><p>These details appear on the members page and athlete profile.</p></div></div>
                <div className="admin-form-grid">
                  <label>Player ID <input value={draft.id} onChange={(event) => updateDraft("id", slugify(event.target.value))} placeholder="e.g. navhyam" required pattern="(?:[a-z0-9]|-){2,50}" /></label>
                  <label>Full name <input value={draft.name} onChange={(event) => { updateDraft("name", event.target.value); makePlayerId(event.target.value); }} required maxLength={100} /></label>
                  <label>Sport category <input value={draft.sport} onChange={(event) => updateDraft("sport", event.target.value)} required maxLength={100} /></label>
                  <label>Profile photo URL <input type="url" value={draft.photo} onChange={(event) => updateDraft("photo", event.target.value)} placeholder="https://…" required /></label>
                  <label className="admin-field-wide">Instagram URL <input type="url" value={draft.instagram} onChange={(event) => updateDraft("instagram", event.target.value)} placeholder="https://instagram.com/…" /></label>
                  <label className="admin-field-wide">Biography <textarea rows="4" value={draft.bio} onChange={(event) => updateDraft("bio", event.target.value)} maxLength={3000} /></label>
                  <label className="admin-field-wide">Key highlights <span className="admin-field-hint">One achievement per line</span><textarea rows="5" value={draft.highlights.join("\n")} onChange={(event) => updateDraft("highlights", event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))} /></label>
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-heading admin-events-heading">
                  <span>02</span><div><h2>Sports events</h2><p>Event details are shown publicly only after visitor verification.</p></div>
                  <button type="button" className="admin-secondary-button" onClick={() => updateDraft("events", [...draft.events, blankEvent()])}>＋ Add event</button>
                </div>
                <div className="admin-event-editor-list">
                  {draft.events.map((event, index) => (
                    <fieldset className="admin-event-editor" key={`${event.id}-${index}`}>
                      <legend>Event {String(index + 1).padStart(2, "0")}</legend>
                      <button type="button" className="admin-remove-event" onClick={() => updateDraft("events", draft.events.filter((_, eventIndex) => eventIndex !== index))}>Remove</button>
                      <div className="admin-form-grid">
                        <label>Event ID <input value={event.id} onChange={(change) => updateEvent(index, "id", slugify(change.target.value))} placeholder="e.g. state-meet-2025" required pattern="(?:[a-z0-9]|-){2,80}" /></label>
                        <label>Event name <input value={event.title} onChange={(change) => { updateEvent(index, "title", change.target.value); if (!event.id) updateEvent(index, "id", slugify(change.target.value)); }} required maxLength={200} /></label>
                        <label>Venue <input value={event.venue} onChange={(change) => updateEvent(index, "venue", change.target.value)} maxLength={250} /></label>
                        <label>Date <input value={event.date} onChange={(change) => updateEvent(index, "date", change.target.value)} maxLength={120} /></label>
                        <label>Competition category <input value={event.category} onChange={(change) => updateEvent(index, "category", change.target.value)} maxLength={200} /></label>
                        <label>Result / medals <input value={event.result} onChange={(change) => updateEvent(index, "result", change.target.value)} maxLength={300} /></label>
                        <label className="admin-field-wide">Event photo URLs <span className="admin-field-hint">One https:// URL per line</span><textarea rows="2" value={event.images.join("\n")} onChange={(change) => updateEvent(index, "images", change.target.value.split("\n").map((item) => item.trim()).filter(Boolean))} /></label>
                      </div>
                    </fieldset>
                  ))}
                  {draft.events.length === 0 && <p className="admin-empty">No event records yet. Add an event to get started.</p>}
                </div>
              </section>
              <div className="admin-save-bar">
                {selectedId && <button className="admin-delete-button" type="button" onClick={removePlayer}>Remove athlete</button>}
                <button className="button button--primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"} <span aria-hidden="true">✓</span></button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
