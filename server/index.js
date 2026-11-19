import "dotenv/config";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import nodemailer from "nodemailer";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(currentDir, "..");
const app = express();
const port = Number(process.env.PORT || 5174);
const captchaMode = process.env.NODE_ENV === "production"
  ? "turnstile"
  : (process.env.CAPTCHA_MODE || "local");
const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || "";
const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY || "";
const adminUsername = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "";
const adminPasswordHash = createHash("sha256").update(adminPassword).digest();
const challengeStore = new Map();
const adminSessions = new Map();
const challengeLifetime = 3 * 60 * 1000;
const adminSessionLifetime = 8 * 60 * 60 * 1000;
const adminCookieName = "nnb_admin_session";
const playersFile = path.join(currentDir, "data", "players.json");
const submissionsFile = process.env.SUBMISSIONS_FILE || path.join(currentDir, "data", "submissions.json");
const submissionEmailTo = "hello@gmail.com";
const smtpHost = process.env.SMTP_HOST || "";
const smtpUser = process.env.SMTP_USER || "";
const smtpPassword = process.env.SMTP_PASSWORD || "";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const emailConfigured = Boolean(smtpHost && smtpUser && smtpPassword);
const mailTransport = emailConfigured
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    })
  : null;
let submissionQueue = Promise.resolve();

if (captchaMode === "turnstile" && (!turnstileSiteKey || !turnstileSecretKey)) {
  throw new Error("TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are required when CAPTCHA_MODE=turnstile.");
}
if (adminPassword && adminPassword.length < 16) {
  throw new Error("ADMIN_PASSWORD must be at least 16 characters long.");
}
if (emailConfigured && (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535)) {
  throw new Error("SMTP_PORT must be a valid port number.");
}
if ((smtpHost || smtpUser || smtpPassword) && !emailConfigured) {
  console.warn("Email notifications are disabled until SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are all set.");
}

let players = JSON.parse(await readFile(playersFile, "utf8"));
let playerById = new Map(players.map((player) => [player.id, player]));
let submissions = [];
try {
  const savedSubmissions = JSON.parse(await readFile(submissionsFile, "utf8"));
  if (!Array.isArray(savedSubmissions)) throw new Error("Submission data must be a JSON array.");
  submissions = savedSubmissions;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", "https://challenges.cloudflare.com"],
      frameSrc: ["'self'", "https://challenges.cloudflare.com"],
      connectSrc: ["'self'", "https://challenges.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(express.json({ limit: "1mb" }));

const eventUnlockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many verification attempts. Please try again later." },
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait and try again." },
});

function readCookie(request, name) {
  const cookies = request.headers.cookie?.split(";") || [];
  const entry = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`));
  return entry ? entry.trim().slice(name.length + 1) : "";
}

function findAdminSession(request) {
  const sessionId = readCookie(request, adminCookieName);
  const session = adminSessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    adminSessions.delete(sessionId);
    return null;
  }
  return { sessionId, ...session };
}

function safeEqual(first, second) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

function requireAdmin(request, response, next) {
  const session = findAdminSession(request);
  if (!session) return response.status(401).json({ error: "Please sign in to the admin panel." });
  request.adminSession = session;
  return next();
}

function requireCsrf(request, response, next) {
  const token = request.get("x-csrf-token") || "";
  if (!safeEqual(token, request.adminSession.csrfToken)) {
    return response.status(403).json({ error: "Security token expired. Refresh the admin page and try again." });
  }
  return next();
}

function isValidHttpUrl(value, allowEmpty = false) {
  if (allowEmpty && value === "") return true;
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function validPlayerCollection(candidate) {
  if (!Array.isArray(candidate) || candidate.length > 100) return false;
  const ids = new Set();
  for (const player of candidate) {
    if (!player || typeof player !== "object"
      || typeof player.id !== "string" || !/^[a-z0-9-]{2,50}$/.test(player.id)
      || ids.has(player.id)
      || typeof player.name !== "string" || !player.name.trim() || player.name.length > 100
      || typeof player.sport !== "string" || !player.sport.trim() || player.sport.length > 100
      || !isValidHttpUrl(player.photo)
      || typeof player.bio !== "string" || player.bio.length > 3000
      || !isValidHttpUrl(player.instagram, true)
      || !Array.isArray(player.highlights) || player.highlights.length > 30
      || player.highlights.some((item) => typeof item !== "string" || !item.trim() || item.length > 300)
      || !Array.isArray(player.events) || player.events.length > 100) return false;
    ids.add(player.id);
    const eventIds = new Set();
    for (const event of player.events) {
      if (!event || typeof event !== "object"
        || typeof event.id !== "string" || !/^[a-z0-9-]{2,80}$/.test(event.id)
        || eventIds.has(event.id)
        || typeof event.title !== "string" || !event.title.trim() || event.title.length > 200
        || typeof event.venue !== "string" || event.venue.length > 250
        || typeof event.date !== "string" || event.date.length > 120
        || typeof event.category !== "string" || event.category.length > 200
        || typeof event.result !== "string" || event.result.length > 300
        || !Array.isArray(event.images) || event.images.length > 10
        || event.images.some((image) => !isValidHttpUrl(image))) return false;
      eventIds.add(event.id);
    }
  }
  return true;
}

async function savePlayers(candidate) {
  const temporaryFile = `${playersFile}.${randomBytes(8).toString("hex")}.tmp`;
  try {
    await writeFile(temporaryFile, `${JSON.stringify(candidate, null, 2)}\n`, { flag: "wx" });
    await rename(temporaryFile, playersFile);
    players = candidate;
    playerById = new Map(players.map((player) => [player.id, player]));
  } catch (error) {
    try {
      await unlink(temporaryFile);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") console.error("Could not remove temporary player data:", cleanupError.message);
    }
    throw error;
  }
}

async function writeJsonAtomically(filePath, data) {
  const temporaryFile = `${filePath}.${randomBytes(8).toString("hex")}.tmp`;
  try {
    await writeFile(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, { flag: "wx" });
    await rename(temporaryFile, filePath);
  } catch (error) {
    try {
      await unlink(temporaryFile);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") console.error("Could not remove temporary data:", cleanupError.message);
    }
    throw error;
  }
}

function updateSubmissions(update) {
  const operation = submissionQueue.then(async () => {
    const next = update(submissions);
    await writeJsonAtomically(submissionsFile, next);
    submissions = next;
    return next;
  });
  submissionQueue = operation.catch(() => {});
  return operation;
}

async function sendSubmissionEmail(submission) {
  if (!mailTransport) return false;
  const safeSubject = submission.eventTitle.replace(/[\r\n]/g, " ");
  await mailTransport.sendMail({
    from: process.env.SMTP_FROM || smtpUser,
    to: submissionEmailTo,
    subject: `NNB Academy event enquiry — ${safeSubject}`,
    text: [
      "A visitor verified an event-details request.",
      "",
      `Name: ${submission.fullName}`,
      `Email: ${submission.email}`,
      `Mobile: ${submission.mobile}`,
      `Player: ${submission.playerName} (${submission.sport})`,
      `Selected event: ${submission.eventTitle}`,
      `Public member listing consent: ${submission.showInMembers ? "Yes" : "No"}`,
      `Submitted: ${submission.createdAt}`,
    ].join("\n"),
  });
  return true;
}

function publicPlayer(player) {
  const { events, ...profile } = player;
  return {
    ...profile,
    events: events.map(({ id, title }) => ({ id, title })),
  };
}

function removeExpiredChallenges() {
  const now = Date.now();
  for (const [id, challenge] of challengeStore) {
    if (challenge.expiresAt <= now) challengeStore.delete(id);
  }
  while (challengeStore.size >= 5000) {
    challengeStore.delete(challengeStore.keys().next().value);
  }
}

function makeChallenge() {
  removeExpiredChallenges();
  const first = randomInt(2, 10);
  const second = randomInt(2, 10);
  const id = randomBytes(24).toString("hex");
  const answerHash = createHash("sha256").update(`${id}:${first + second}`).digest("hex");
  challengeStore.set(id, { answerHash, expiresAt: Date.now() + challengeLifetime });
  return { id, question: `What is ${first} + ${second}?` };
}

function validContact(contact) {
  if (!contact || typeof contact !== "object") return false;
  const { fullName, email, mobile } = contact;
  return typeof fullName === "string"
    && fullName.trim().length >= 2
    && fullName.trim().length <= 100
    && typeof email === "string"
    && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    && typeof mobile === "string"
    && /^\+?[\d\s().-]{7,20}$/.test(mobile.trim());
}

async function verifyTurnstile(token, remoteIp) {
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
  const body = new URLSearchParams({
    secret: turnstileSecretKey,
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Turnstile verification failed with status ${response.status}.`);
  const result = await response.json();
  return result.success === true;
}

app.get("/api/admin/session", (request, response) => {
  const session = findAdminSession(request);
  if (!session) return response.json({ authenticated: false });
  return response.json({
    authenticated: true,
    username: adminUsername,
    csrfToken: session.csrfToken,
  });
});

app.post("/api/admin/login", adminLoginLimiter, (request, response) => {
  if (!adminPassword) {
    return response.status(503).json({ error: "Admin login is not configured. Add ADMIN_PASSWORD to your .env file." });
  }
  const { username, password } = request.body || {};
  const suppliedHash = createHash("sha256")
    .update(typeof password === "string" ? password : "")
    .digest();
  if (username !== adminUsername || !timingSafeEqual(suppliedHash, adminPasswordHash)) {
    return response.status(401).json({ error: "Incorrect username or password." });
  }

  const now = Date.now();
  for (const [id, session] of adminSessions) {
    if (session.expiresAt <= now) adminSessions.delete(id);
  }
  while (adminSessions.size >= 1000) {
    adminSessions.delete(adminSessions.keys().next().value);
  }
  const sessionId = randomBytes(32).toString("hex");
  const csrfToken = randomBytes(32).toString("hex");
  adminSessions.set(sessionId, { csrfToken, expiresAt: now + adminSessionLifetime });
  response.cookie(adminCookieName, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: adminSessionLifetime,
  });
  return response.json({ authenticated: true, username: adminUsername, csrfToken });
});

app.post("/api/admin/logout", requireAdmin, requireCsrf, (request, response) => {
  adminSessions.delete(request.adminSession.sessionId);
  response.clearCookie(adminCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  return response.json({ authenticated: false });
});

app.get("/api/admin/players", requireAdmin, (_request, response) => {
  response.json(players);
});

app.get("/api/admin/submissions", requireAdmin, async (_request, response) => {
  await submissionQueue;
  response.json(submissions);
});

app.delete("/api/admin/submissions/:submissionId", requireAdmin, requireCsrf, async (request, response) => {
  const exists = submissions.some((submission) => submission.id === request.params.submissionId);
  if (!exists) return response.status(404).json({ error: "Submission not found." });
  try {
    await updateSubmissions((current) => current.filter((submission) => submission.id !== request.params.submissionId));
    return response.json({ deleted: true });
  } catch (error) {
    console.error("Could not delete contact submission:", error.message);
    return response.status(500).json({ error: "Could not delete the submission. Check server file permissions." });
  }
});

app.put("/api/admin/players", requireAdmin, requireCsrf, async (request, response) => {
  const { players: candidate } = request.body || {};
  if (!validPlayerCollection(candidate)) {
    return response.status(400).json({ error: "Player data is invalid. Check IDs, URLs, highlights and event fields." });
  }
  try {
    await savePlayers(candidate);
    return response.json({ saved: true, count: players.length });
  } catch (error) {
    console.error("Could not save player data:", error.message);
    return response.status(500).json({ error: "Could not save player data. Check server file permissions." });
  }
});

app.get("/api/captcha/config", (_request, response) => {
  response.json({
    mode: captchaMode,
    siteKey: captchaMode === "turnstile" ? turnstileSiteKey : null,
  });
});

app.get("/api/captcha/challenge", (_request, response) => {
  if (captchaMode !== "local") {
    return response.status(404).json({ error: "Local challenge is disabled." });
  }
  return response.json(makeChallenge());
});

app.get("/api/players", (_request, response) => {
  response.json(players.map((player) => ({
    id: player.id,
    name: player.name,
    sport: player.sport,
    photo: player.photo,
  })));
});

app.get("/api/players/:playerId", (request, response) => {
  const player = playerById.get(request.params.playerId);
  if (!player) return response.status(404).json({ error: "Player not found." });
  return response.json(publicPlayer(player));
});

app.get("/api/community-members", async (_request, response) => {
  await submissionQueue;
  response.json(submissions
    .filter((submission) => submission.showInMembers)
    .map(({ id, fullName, playerName, sport, createdAt }) => ({
      id,
      name: fullName,
      playerName,
      sport,
      createdAt,
    })));
});

app.post("/api/events/unlock", eventUnlockLimiter, async (request, response) => {
  const { playerId, eventId, contact, showInMembers } = request.body || {};
  if (!validContact(contact)) {
    return response.status(400).json({ error: "Enter a valid name, email address, and mobile number." });
  }
  if (showInMembers !== undefined && typeof showInMembers !== "boolean") {
    return response.status(400).json({ error: "Member listing consent must be a yes or no value." });
  }
  const player = playerById.get(playerId);
  if (!player?.events.some((item) => item.id === eventId)) {
    return response.status(404).json({ error: "Event not found." });
  }

  try {
    let verified = false;
    if (captchaMode === "turnstile") {
      verified = await verifyTurnstile(request.body.captchaToken, request.ip);
    } else {
      const { challengeId, captchaAnswer } = request.body;
      const challenge = challengeStore.get(challengeId);
      if (challenge) {
        challengeStore.delete(challengeId);
        const answerHash = createHash("sha256")
          .update(`${challengeId}:${String(captchaAnswer ?? "").trim()}`)
          .digest("hex");
        verified = challenge.expiresAt > Date.now() && answerHash === challenge.answerHash;
      }
    }

    if (!verified) {
      return response.status(400).json({ error: "CAPTCHA verification failed. Please try a new challenge." });
    }
    const event = player.events.find((item) => item.id === eventId);
    const submission = {
      id: randomBytes(16).toString("hex"),
      fullName: contact.fullName.trim(),
      email: contact.email.trim(),
      mobile: contact.mobile.trim(),
      playerId: player.id,
      playerName: player.name,
      sport: player.sport,
      eventId: event.id,
      eventTitle: event.title,
      showInMembers: showInMembers === true,
      createdAt: new Date().toISOString(),
      emailStatus: emailConfigured ? "pending" : "not_configured",
    };

    try {
      await updateSubmissions((current) => [submission, ...current]);
    } catch (error) {
      console.error("Could not save contact submission:", error.message);
      return response.status(500).json({ error: "Your verification passed, but your contact details could not be saved. Please try again." });
    }

    let emailSent = false;
    if (mailTransport) {
      try {
        emailSent = await sendSubmissionEmail(submission);
        await updateSubmissions((current) => current.map((item) =>
          item.id === submission.id ? { ...item, emailStatus: "sent" } : item));
      } catch (error) {
        console.error("Contact submission email failed:", error.message);
        try {
          await updateSubmissions((current) => current.map((item) =>
            item.id === submission.id ? { ...item, emailStatus: "failed" } : item));
        } catch (saveError) {
          console.error("Could not update contact email status:", saveError.message);
        }
      }
    }

    return response.json({
      events: player.events,
      submission: {
        id: submission.id,
        emailConfigured,
        emailSent,
        showInMembers: submission.showInMembers,
      },
    });
  } catch (error) {
    console.error("Event verification service error:", error.message);
    return response.status(502).json({ error: "Verification is temporarily unavailable. Please try again." });
  }
});

if (process.env.NODE_ENV === "production") {
  const distDir = path.join(projectDir, "dist");
  app.use(express.static(distDir));
  app.get("/{*splat}", (_request, response) => response.sendFile(path.join(distDir, "index.html")));
}

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({ error: "Request body must be valid JSON." });
  }
  console.error("API error:", error.message);
  return response.status(500).json({ error: "An unexpected server error occurred." });
});

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  app.listen(port, () => {
    console.log(`NNB Academy API listening on http://localhost:${port} (${captchaMode} CAPTCHA)`);
  });
}

export { app };
