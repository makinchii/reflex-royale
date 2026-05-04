import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import crypto from "crypto";
import mongoose from "mongoose";

export type AppAuthUser = {
  username: string;
  bestScore: number;
  preferredThemeCommand?: string;
  preferredThemeColor?: string;
  preferredThemeShades?: Record<string, string>;
};

type SessionStoreDocument = {
  _id: string;
  session: unknown;
};

const SESSION_COOKIE_NAME = "connect.sid";
const AUTH_COOKIE_NAME = "reflexRoyaleAuth";
const SESSION_SECRET = process.env.SESSION_SECRET || "reflex-royale-dev-secret";

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const [name, ...rest] = part.split("=");
      cookies[name] = decodeURIComponent(rest.join("="));
      return cookies;
    }, {});
}

function unsignSessionCookie(value: string, secret: string) {
  if (!value.startsWith("s:")) return null;

  const signedValue = value.slice(2);
  const lastDot = signedValue.lastIndexOf(".");
  if (lastDot === -1) return null;

  const sessionId = signedValue.slice(0, lastDot);
  const signature = signedValue.slice(lastDot + 1);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(sessionId)
    .digest("base64")
    .replace(/=+$/g, "");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  return sessionId;
}

function signPayload(payload: string) {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");
}

function getSignedAuthUser(value: string): AppAuthUser | null {
  const lastDot = value.lastIndexOf(".");
  if (lastDot === -1) return null;

  const payload = value.slice(0, lastDot);
  const signature = value.slice(lastDot + 1);
  const expected = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed?.username) return null;
    return {
      username: String(parsed.username),
      bestScore: Number(parsed.bestScore || 0),
      preferredThemeCommand: typeof parsed.preferredThemeCommand === "string" ? parsed.preferredThemeCommand : "tron",
      preferredThemeColor: typeof parsed.preferredThemeColor === "string" ? parsed.preferredThemeColor : "#00d4ff",
      preferredThemeShades: typeof parsed.preferredThemeShades === "object" && parsed.preferredThemeShades ? parsed.preferredThemeShades : undefined,
    };
  } catch {
    return null;
  }
}

async function getRequestCookies() {
  const requestHeaders = await headers();
  return parseCookies(requestHeaders.get("cookie") || "");
}

async function getSessionUserId(cookies: Record<string, string>) {
  const signedCookie = cookies[SESSION_COOKIE_NAME];
  if (!signedCookie) return null;

  return unsignSessionCookie(signedCookie, SESSION_SECRET);
}

export const getCurrentUser = cache(async function getCurrentUser(): Promise<AppAuthUser | null> {
  const cookies = await getRequestCookies();
  const signedAuthUser = cookies[AUTH_COOKIE_NAME]
    ? getSignedAuthUser(cookies[AUTH_COOKIE_NAME])
    : null;

  if (signedAuthUser) {
    return signedAuthUser;
  }

  const sessionId = await getSessionUserId(cookies);
  if (!sessionId) {
    return null;
  }

  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  const sessions = mongoose.connection.db?.collection<SessionStoreDocument>("sessions");
  const sessionDoc = sessions
    ? await sessions.findOne({ _id: sessionId }, { projection: { _id: 0, session: 1 } })
    : null;
  if (!sessionDoc) {
    return null;
  }

  let sessionPayload: any = sessionDoc.session;
  if (typeof sessionPayload === "string") {
    try {
      sessionPayload = JSON.parse(sessionPayload);
    } catch {
      return null;
    }
  }

  const user = sessionPayload?.user;
  if (!user?.username) {
    return null;
  }

  return {
    username: user.username,
    bestScore: Number(user.bestScore || 0),
    preferredThemeCommand: typeof user.preferredThemeCommand === "string" ? user.preferredThemeCommand : "tron",
    preferredThemeColor: typeof user.preferredThemeColor === "string" ? user.preferredThemeColor : "#00d4ff",
    preferredThemeShades: typeof user.preferredThemeShades === "object" && user.preferredThemeShades ? user.preferredThemeShades : undefined,
  };
});

export async function requireCurrentUser(nextPath = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}
