// src/lib/auth.ts
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import type { Role } from '@prisma/client';

export const COOKIE_NAME = 'gp_sess';
const SECRET = process.env.SESSION_SECRET ?? 'dev-secret';

export type SessionPayload = { playerId: number; name: string; role: Role };

function b64u(buf: Buffer) {
  return buf.toString('base64url');
}
function signData(data: string) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

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
    // timing-safe compare
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

export function getActorDisplay(): string {
  const s = readSession();
  return s ? `player:${s.name}` : 'anonymous';
}
