// src/lib/auth.ts
import { cookies } from "next/headers";
import crypto from "node:crypto";
import type { Role } from "@prisma/client";

export const COOKIE_NAME = "gp_sess";          // member session (not used directly below but kept for parity)
export const OFFICER_COOKIE = "gp_officer";    // officer flag cookie ("1" means true)

// Back-compat cookie names
const MEMBER_COOKIE_NEW = "gp_member";
const MEMBER_COOKIE_OLD = "member";
const OFFICER_FALLBACK = "officer";
const OFFICER_NAME = "gp_officer_name";

const SECRET = process.env.SESSION_SECRET ?? "dev-secret";

// ===== utilities =====
function b64u(buf: Buffer) {
  return buf.toString("base64url");
}
function signData(data: string) {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}
function tryParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw)) as T;
    } catch {
      return null;
    }
  }
}

// ===== member session (player) =====
export type SessionPayload = { playerId: number; name: string; role: Role };

export function signSession(p: SessionPayload): string {
  const data = b64u(Buffer.from(JSON.stringify(p)));
  const sig = signData(`v1.${data}`);
  return `v1.${data}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [v, data, sig] = parts;
  const expected = signData(`${v}.${data}`);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Read member session from cookies.
 * Returns a typed SessionPayload when available, otherwise null.
 * Next 15: cookies() is async, so this is async too.
 */
export async function readSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const raw =
    c.get(MEMBER_COOKIE_NEW)?.value ??
    c.get(MEMBER_COOKIE_OLD)?.value ??
    null;

  // Accept plain JSON, URI-encoded JSON, or signed token via verifySession
  const parsed = tryParseJson<SessionPayload>(raw);
  if (parsed && typeof parsed.playerId === "number" && typeof parsed.name === "string") {
    return parsed;
  }
  if (raw) {
    const verified = verifySession(raw);
    if (verified) return verified;
  }
  return null;
}

// ===== officer cookie =====
// Note: current app logic treats officer cookie as a simple "1"/truthy flag.
export async function isOfficer(): Promise<boolean> {
  const c = await cookies();
  return (
    c.get(OFFICER_COOKIE)?.value === "1" ||
    c.get(OFFICER_FALLBACK)?.value === "1"
  );
}

/**
 * Returns a display string indicating the acting user.
 * - If officer: "officer:Name" (from session if present, else OFFICER_NAME alias, else "officer")
 * - If player:  "player:Name"
 * - Else:      "anonymous"
 */
export async function getActorDisplay(): Promise<string> {
  const c = await cookies();
  const sessionRaw =
    c.get(MEMBER_COOKIE_NEW)?.value ??
    c.get(MEMBER_COOKIE_OLD)?.value ??
    null;

  const sess = tryParseJson<Partial<SessionPayload>>(sessionRaw);

  const officer =
    c.get(OFFICER_COOKIE)?.value === "1" ||
    c.get(OFFICER_FALLBACK)?.value === "1";

  if (officer) {
    const alias = c.get(OFFICER_NAME)?.value || null;
    if (sess?.name) return `officer:${sess.name}`;
    if (alias) return `officer:${alias}`;
    return "officer";
  }

  return sess?.name ? `player:${sess.name}` : "anonymous";
}

// Optional: produce an HMAC marker if you later want to switch from "1" flags
// to a signed opaque value. Not used by isOfficer() right now.
function officerMarker(): string {
  return signData("officer:marker:v1");
}
export function signedOfficerCookieValue(): string {
  return officerMarker();
}
