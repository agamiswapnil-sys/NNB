async function request(path, options) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Something went wrong. Please try again.");
  }
  return body;
}

export const getPlayers = () => request("/api/players");
export const getPlayer = (playerId) => request(`/api/players/${encodeURIComponent(playerId)}`);
export const getCommunityMembers = () => request("/api/community-members");
export const getCaptchaConfig = () => request("/api/captcha/config");
export const getCaptchaChallenge = () => request("/api/captcha/challenge");
export const unlockEvent = (payload) => request("/api/events/unlock", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});

export const getAdminSession = () => request("/api/admin/session");
export const getAdminPlayers = () => request("/api/admin/players");
export const getAdminSubmissions = () => request("/api/admin/submissions");
export const loginAdmin = (username, password) => request("/api/admin/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username, password }),
});
export const logoutAdmin = (csrfToken) => request("/api/admin/logout", {
  method: "POST",
  headers: { "x-csrf-token": csrfToken },
});
export const saveAdminPlayers = (players, csrfToken) => request("/api/admin/players", {
  method: "PUT",
  headers: {
    "content-type": "application/json",
    "x-csrf-token": csrfToken,
  },
  body: JSON.stringify({ players }),
});
export const deleteAdminSubmission = (submissionId, csrfToken) => request(
  `/api/admin/submissions/${encodeURIComponent(submissionId)}`,
  {
    method: "DELETE",
    headers: { "x-csrf-token": csrfToken },
  },
);
