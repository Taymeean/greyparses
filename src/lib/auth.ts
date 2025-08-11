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

export function readSession(): SessionPayload | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

// ===== officer cookie =====
// opaque, signed value; no identity, just "officer ok"
function officerMarker(): string {
  // stable HMAC so we can verify without DB
  return signData('officer:marker:v1');
}

export function isOfficer() {
  const c = cookies();
  return c.get('gp_officer')?.value === '1' || c.get('officer')?.value === '1';
}


// actor for audit logs: prefer officer, then member, else anonymous
export function getActorDisplay(): string {
  if (isOfficer()) return 'officer';
  const s = readSession();
  return s ? `player:${s.name}` : 'anonymous';
}

// helper to set the officer cookie value in the login route
export function signedOfficerCookieValue(): string {
  return officerMarker();
}
