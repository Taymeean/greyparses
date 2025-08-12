import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import type { Role } from '@prisma/client';

export const COOKIE_NAME = 'gp_sess';      // member session
export const OFFICER_COOKIE = 'gp_officer'; // officer flag cookie

const SECRET = process.env.SESSION_SECRET ?? 'dev-secret';

// ===== utilities =====
function b64u(buf: Buffer) {
  return buf.toString('base64url');
}
function signData(data: string) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

// ===== member session (player) =====
export type SessionPayload = { playerId: number; name: string; role: Role };

export function signSession(p: SessionPayload): string {
  const data = b64u(Buffer.from(JSON.stringify(p)));
  const sig = signData(`v1.${data}`);
  return `v1.${data}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const [v, data, sig] = parts;
  const expected = signData(`${v}.${data}`);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
  } catch {
    return null;
  }
}

// --- PATCH: make member cookie robust ---
export function readSession() {
  const c = cookies();

  // Prefer our new cookie; accept old name for compatibility
  const raw =
    c.get('gp_member')?.value ??
    c.get('member')?.value ??
    null;

  if (!raw) return null;

  // Some runtimes URL-encode cookie values; try both
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
}

// ===== officer cookie =====
// opaque, signed value; no identity, just "officer ok"
function officerMarker(): string {
  // stable HMAC so we can verify without DB
  return signData('officer:marker:v1');
}

// --- PATCH: recognize either officer cookie name ---
export function isOfficer() {
  const c = cookies();
  return (
    c.get('gp_officer')?.value === '1' ||
    c.get('officer')?.value === '1'
  );
}

// Use player session if present, even for officers.
// Fall back to a manual alias, then plain "officer".
export function getActorDisplay() {
  const c = cookies();

  // read player session (new + old cookie names)
  const raw =
    c.get('gp_member')?.value ??
    c.get('member')?.value ??
    null;

  let sess: { playerId?: number; name?: string } | null = null;
  if (raw) {
    try { sess = JSON.parse(raw); }
    catch { try { sess = JSON.parse(decodeURIComponent(raw)); } catch { /* ignore */ } }
  }

  const isOfficer =
    c.get('gp_officer')?.value === '1' ||
    c.get('officer')?.value === '1';

  if (isOfficer) {
    const alias = c.get('gp_officer_name')?.value; // optional manual alias
    if (sess?.name) return `officer:${sess.name}`;
    if (alias) return `officer:${alias}`;
    return 'officer';
  }

  return sess?.name ? `player:${sess.name}` : 'anonymous';
}

// Keep your existing readSession()/isOfficer() as-is.
// If you want, tweak your header to show both when applicable:
// officer + player name at the same time.

// helper to set the officer cookie value in the login route
export function signedOfficerCookieValue(): string {
  return officerMarker();
}
