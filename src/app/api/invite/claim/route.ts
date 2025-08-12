import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const Body = z.object({
  token: z.string().min(4),
  name: z.string().min(2).max(32),
  role: z.enum(['TANK', 'HEALER', 'MDPS', 'RDPS']).optional(), // only needed when creating new
  classId: z.number().int().positive().optional(),             // only needed when creating new
});

const MEMBER_COOKIE = 'gp_member'; // if your project uses a different name, swap it here

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { token, name, role, classId } = parsed.data;
  const expected = (process.env.MEMBER_INVITE_TOKEN ?? '').trim();
  if (!expected) return NextResponse.json({ error: 'Server missing MEMBER_INVITE_TOKEN' }, { status: 500 });
  if (token.trim() !== expected) return NextResponse.json({ error: 'Invalid invite token' }, { status: 403 });

  // 1) Try to ATTACH to an existing character (exact name match)
  const existing = await prisma.player.findFirst({
    where: { name }, // exact match; keep exact-casing to avoid surprises
    select: { id: true, name: true, role: true, active: true },
  });

  if (existing) {
    if (existing.active === false) {
      return NextResponse.json({ error: 'This character is deactivated. Ask an officer to reactivate.' }, { status: 403 });
    }
    const res = NextResponse.json({ ok: true, attached: true, playerId: existing.id, name: existing.name });
    // store a tiny session; /api/me should read this
    res.cookies.set(MEMBER_COOKIE, JSON.stringify({
      playerId: existing.id, name: existing.name, role: existing.role,
    }), { path: '/', httpOnly: true });
    return res;
  }

  // 2) Otherwise CREATE a new character (requires role + classId)
  if (!role || !classId) {
    return NextResponse.json({ error: 'Missing role or classId for new claim' }, { status: 400 });
  }

  const created = await prisma.player.create({
    data: { name, role, classId, active: true },
    select: { id: true, name: true, role: true },
  });

  const res = NextResponse.json({ ok: true, created: true, playerId: created.id, name: created.name });
  res.cookies.set(MEMBER_COOKIE, JSON.stringify({
    playerId: created.id, name: created.name, role: created.role,
  }), { path: '/', httpOnly: true });
  return res;
}
