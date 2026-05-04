const crypto = require("crypto");
const User = require("../models/User");
const { normalizeThemeShades } = require("./themePreferences");

const AUTH_COOKIE_NAME = "reflexRoyaleAuth";
const SESSION_SECRET = process.env.SESSION_SECRET || "reflex-royale-dev-secret";

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function signPayload(payload) {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");
}

function createAuthCookieValue(user) {
  const payload = base64UrlEncode(JSON.stringify({
    id: String(user._id),
    username: user.username,
    bestScore: Number(user.bestScore || 0),
    preferredThemeCommand: user.preferredThemeCommand || "tron",
    preferredThemeColor: user.preferredThemeColor || "#00d4ff",
    preferredThemeShades: normalizeThemeShades(user.preferredThemeShades),
  }));
  return `${payload}.${signPayload(payload)}`;
}

function setAuthCookie(res, user) {
  if (typeof res.cookie !== "function") return;
  res.cookie(AUTH_COOKIE_NAME, createAuthCookieValue(user), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function clearAuthCookie(res) {
  if (typeof res.clearCookie !== "function") return;
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function createSession(req, res, user) {
  if (!req.session) return;
  req.session.user = {
    id: String(user._id),
    username: user.username,
    preferredThemeCommand: user.preferredThemeCommand || "tron",
    preferredThemeColor: user.preferredThemeColor || "#00d4ff",
    preferredThemeShades: normalizeThemeShades(user.preferredThemeShades),
  };
  setAuthCookie(res, user);
}

function destroySession(req, res, onDone) {
  if (!req.session) {
    clearAuthCookie(res);
    if (typeof onDone === "function") onDone();
    return;
  }

  req.session.destroy(() => {
    clearAuthCookie(res);
    res.clearCookie("connect.sid");
    if (typeof onDone === "function") onDone();
  });
}

async function getCurrentUser(req) {
  const userId = req.session?.user?.id;
  if (!userId) return null;
  return User.findById(userId);
}

async function requireAuth(req, res, next) {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "You must be logged in to update your leaderboard score.",
    });
  }

  req.currentUser = user;
  return next();
}

module.exports = {
  createSession,
  destroySession,
  getCurrentUser,
  requireAuth,
};
