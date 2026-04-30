import { headers } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import mongoose from "mongoose";

export type AppAuthUser = {
  username: string;
  bestScore: number;
};

const SESSION_COOKIE_NAME = "connect.sid";

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

async function getSessionUserId() {
  const requestHeaders = await headers();
  const cookies = parseCookies(requestHeaders.get("cookie") || "");
  const signedCookie = cookies[SESSION_COOKIE_NAME];
  if (!signedCookie || !process.env.SESSION_SECRET) return null;

  return unsignSessionCookie(signedCookie, process.env.SESSION_SECRET);
}

export async function getCurrentUser(): Promise<AppAuthUser | null> {
  const sessionId = await getSessionUserId();
  if (!sessionId) {
    return null;
  }

  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  const sessions = mongoose.connection.db?.collection("sessions");
  const sessionDoc = sessions ? await sessions.findOne({ _id: sessionId }) : null;
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
  };
}

export async function requireCurrentUser(nextPath = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}
