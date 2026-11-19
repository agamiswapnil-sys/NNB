import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const testDataDirectory = await mkdtemp(path.join(os.tmpdir(), "nnb-academy-test-"));
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "test-admin-password-2026";
process.env.SUBMISSIONS_FILE = path.join(testDataDirectory, "submissions.json");
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASSWORD = "";
const { app } = await import("../server/index.js");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await rm(testDataDirectory, { recursive: true, force: true });
});

test("event results stay private until a valid server-side CAPTCHA check", async () => {
  const profileResponse = await fetch(`${baseUrl}/api/players/navhyam`);
  assert.equal(profileResponse.status, 200);
  const profile = await profileResponse.json();
  assert.deepEqual(profile.events[0], {
    id: "national-inline-2025",
    title: "National Inline Speed Skating Championship 2025",
  });
  assert.equal("result" in profile.events[0], false);
  assert.equal("venue" in profile.events[0], false);

  const challengeResponse = await fetch(`${baseUrl}/api/captcha/challenge`);
  const challenge = await challengeResponse.json();
  const [first, second] = challenge.question.match(/\d+/g).map(Number);
  const contact = { fullName: "Test Visitor", email: "visitor@example.com", mobile: "+91 98765 43210" };
  const endpoint = `${baseUrl}/api/events/unlock`;
  const submit = (captchaAnswer) => fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      playerId: "navhyam",
      eventId: "national-inline-2025",
      contact,
      showInMembers: true,
      challengeId: challenge.id,
      captchaAnswer,
    }),
  });

  const rejected = await submit("incorrect");
  assert.equal(rejected.status, 400);
  const answer = await submit(String(first + second));
  assert.equal(answer.status, 400, "a failed one-use challenge cannot be replayed");

  const freshChallenge = await (await fetch(`${baseUrl}/api/captcha/challenge`)).json();
  const [freshFirst, freshSecond] = freshChallenge.question.match(/\d+/g).map(Number);
  const unlocked = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      playerId: "navhyam",
      eventId: "national-inline-2025",
      contact,
      showInMembers: true,
      challengeId: freshChallenge.id,
      captchaAnswer: String(freshFirst + freshSecond),
    }),
  });
  assert.equal(unlocked.status, 200);
  const details = await unlocked.json();
  assert.equal(details.events.length, profile.events.length);
  const verifiedEvent = details.events.find((event) => event.id === "national-inline-2025");
  assert.ok(verifiedEvent);
  assert.match(verifiedEvent.result, /Silver medal/);
  assert.equal(verifiedEvent.venue, "Gachibowli Skating Arena, Hyderabad");
  assert.deepEqual(details.submission, {
    id: details.submission.id,
    emailConfigured: false,
    emailSent: false,
    showInMembers: true,
  });

  const publicMembers = await (await fetch(`${baseUrl}/api/community-members`)).json();
  assert.equal(publicMembers.length, 1);
  assert.equal(publicMembers[0].name, "Test Visitor");
  assert.equal("email" in publicMembers[0], false);
  assert.equal("mobile" in publicMembers[0], false);
});

test("admin player data requires a valid session and CSRF token", async () => {
  const anonymous = await fetch(`${baseUrl}/api/admin/players`);
  assert.equal(anonymous.status, 401);

  const badLogin = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "wrong-password" }),
  });
  assert.equal(badLogin.status, 401);

  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: process.env.ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 200);
  const session = await login.json();
  const cookie = login.headers.get("set-cookie").split(";")[0];

  const playersResponse = await fetch(`${baseUrl}/api/admin/players`, {
    headers: { cookie },
  });
  assert.equal(playersResponse.status, 200);
  const players = await playersResponse.json();
  assert.ok(players.length >= 1);

  const submissionResponse = await fetch(`${baseUrl}/api/admin/submissions`, {
    headers: { cookie },
  });
  assert.equal(submissionResponse.status, 200);
  const submissions = await submissionResponse.json();
  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].email, "visitor@example.com");
  assert.equal(submissions[0].mobile, "+91 98765 43210");
  assert.equal(submissions[0].emailStatus, "not_configured");

  const csrfRejected = await fetch(`${baseUrl}/api/admin/players`, {
    method: "PUT",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ players }),
  });
  assert.equal(csrfRejected.status, 403);

  const saved = await fetch(`${baseUrl}/api/admin/players`, {
    method: "PUT",
    headers: {
      cookie,
      "content-type": "application/json",
      "x-csrf-token": session.csrfToken,
    },
    body: JSON.stringify({ players }),
  });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).count, players.length);

  const deleted = await fetch(`${baseUrl}/api/admin/submissions/${submissions[0].id}`, {
    method: "DELETE",
    headers: { cookie, "x-csrf-token": session.csrfToken },
  });
  assert.equal(deleted.status, 200);
  assert.deepEqual(await (await fetch(`${baseUrl}/api/community-members`)).json(), []);

  const logout = await fetch(`${baseUrl}/api/admin/logout`, {
    method: "POST",
    headers: { cookie, "x-csrf-token": session.csrfToken },
  });
  assert.equal(logout.status, 200);

  const expiredSession = await fetch(`${baseUrl}/api/admin/players`, {
    headers: { cookie },
  });
  assert.equal(expiredSession.status, 401);
});
