import { useEffect, useRef, useState } from "react";
import { getCaptchaChallenge, getCaptchaConfig, unlockEvent } from "../api.js";

export default function ContactVerificationForm({ playerId, eventId, eventTitle, onVerified, onCancel }) {
  const [contact, setContact] = useState({ fullName: "", email: "", mobile: "" });
  const [showInMembers, setShowInMembers] = useState(false);
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState(null);
  const [turnstileError, setTurnstileError] = useState("");
  const turnstileRef = useRef(null);
  const widgetId = useRef(null);

  async function loadChallenge() {
    setCaptchaAnswer("");
    setError("");
    try {
      setCaptcha(await getCaptchaChallenge());
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    let mounted = true;
    getCaptchaConfig()
      .then(async (value) => {
        if (!mounted) return;
        setConfig(value);
        if (value.mode === "local") await loadChallenge();
      })
      .catch((loadError) => { if (mounted) setError(loadError.message); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (config?.mode !== "turnstile" || !config.siteKey || !turnstileRef.current) return undefined;
    let cancelled = false;
    const renderWidget = () => {
      if (cancelled || !window.turnstile || !turnstileRef.current || widgetId.current !== null) return;
      widgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: config.siteKey,
        callback: (token) => { setCaptchaToken(token); setTurnstileError(""); },
        "expired-callback": () => setCaptchaToken(""),
        "error-callback": () => setTurnstileError("CAPTCHA could not load. Check your connection and try again."),
      });
    };
    if (window.turnstile) {
      renderWidget();
    } else {
      let script = document.querySelector('script[data-turnstile="true"]');
      if (!script) {
        script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = "true";
        document.head.appendChild(script);
      }
      script.addEventListener("load", renderWidget);
      script.addEventListener("error", () => setTurnstileError("CAPTCHA could not load. Check your connection and try again."));
    }
    return () => { cancelled = true; };
  }, [config]);

  function updateContact(event) {
    setContact((value) => ({ ...value, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { playerId, eventId, contact, showInMembers };
      if (config?.mode === "turnstile") {
        if (!captchaToken) throw new Error("Please complete the CAPTCHA verification.");
        payload.captchaToken = captchaToken;
      } else {
        if (!captcha || !captchaAnswer.trim()) throw new Error("Please answer the CAPTCHA challenge.");
        payload.challengeId = captcha.id;
        payload.captchaAnswer = captchaAnswer;
      }
      await onVerified(await unlockEvent(payload));
    } catch (submitError) {
      setError(submitError.message);
      if (config?.mode === "local") await loadChallenge();
      if (config?.mode === "turnstile" && window.turnstile && widgetId.current !== null) {
        window.turnstile.reset(widgetId.current);
        setCaptchaToken("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="verification-form" onSubmit={submit}>
      <div className="verification-heading">
        <div><span className="eyebrow">ONE QUICK CHECK</span><h3 id="event-verification-title">Unlock event details</h3></div>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Close verification form">×</button>
      </div>
      <p className="verification-event-title">{eventTitle}</p>
      <p className="privacy-note">Your contact details will be saved for academy follow-up. Email notifications are sent to hello@gmail.com when mail delivery is configured. Your name appears in the public Members section only if you opt in below.</p>
      <div className="form-grid">
        <label>Full name<input name="fullName" autoComplete="name" autoFocus value={contact.fullName} onChange={updateContact} required minLength={2} maxLength={100} /></label>
        <label>Email address<input name="email" type="email" autoComplete="email" value={contact.email} onChange={updateContact} required maxLength={254} /></label>
        <label className="form-field--wide">Mobile number<input name="mobile" type="tel" autoComplete="tel" value={contact.mobile} onChange={updateContact} required minLength={7} maxLength={20} pattern="(?:\+)?(?:\d|\s|\(|\)|\.|-){7,20}" /></label>
      </div>
      <label className="public-listing-consent">
        <input type="checkbox" checked={showInMembers} onChange={(event) => setShowInMembers(event.target.checked)} />
        <span>Yes, show my name in the public Members section. My email address and mobile number will remain private.</span>
      </label>
      <div className="captcha-area">
        <span className="form-label">CAPTCHA verification</span>
        {config?.mode === "turnstile"
          ? <div ref={turnstileRef} className="turnstile-slot" />
          : <div className="math-captcha">
              <span aria-live="polite">{captcha?.question || "Loading challenge…"}</span>
              <input aria-label="CAPTCHA answer" inputMode="numeric" value={captchaAnswer} onChange={(event) => setCaptchaAnswer(event.target.value)} />
              <button type="button" className="text-button" onClick={loadChallenge} aria-label="Get a new CAPTCHA challenge">↻ New</button>
            </div>}
        {turnstileError && <p className="form-error" role="alert">{turnstileError}</p>}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button--primary form-submit" type="submit" disabled={busy || !config}>
        {busy ? "Verifying…" : "Verify & view event"} <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
