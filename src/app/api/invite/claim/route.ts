// src/app/api/invite/claim/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { signSession, COOKIE_NAME } from '@/lib/auth';
import { AuditAction, Role } from '@prisma/client';

const Body = z.object({
  token: z.string().min(8),
  name: z.string().min(2).max(24).trim(),
  role: z.enum(['TANK', 'HEALER', 'MDPS', 'RDPS']),
  classId: z.number().int().positive(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { token, name, role, classId } = parsed.data;

  if (token !== process.env.MEMBER_INVITE_TOKEN) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 403 });
  }

  try {
    // make sure class exists
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // --- CASE-INSENSITIVE name check (JS side) ---
    // (SQLite + this Prisma version doesn’t support `mode: 'insensitive'`.)
    const existingSameCase = await prisma.player.findFirst({ where: { name } });
    if (existingSameCase) {
      return NextResponse.json({ error: 'That character name is already claimed' }, { status: 409 });
    }
    const allNames = await prisma.player.findMany({ select: { name: true } });
    const takenCI = allNames.some(p => p.name.toLowerCase() === name.toLowerCase());
    if (takenCI) {
      return NextResponse.json({ error: 'That character name is already claimed' }, { status: 409 });
    }
    // ---------------------------------------------

    // create player
    const player = await prisma.player.create({
      data: { name, role: role as Role, classId },
      select: { id: true, name: true, role: true },
    });

    // set signed cookie
    const tokenValue = signSession({ playerId: player.id, name: player.name, role: player.role });
    const res = NextResponse.json({ ok: true, player });
    res.cookies.set(COOKIE_NAME, tokenValue, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 90, // 90 days
    });

    // audit (claim itself stays anonymous; cookie applies to subsequent calls)
    await prisma.auditLog.create({
      data: {
        action: AuditAction.INVITE_CLAIMED,
        targetType: 'PLAYER',
        targetId: `player:${player.id}`,
        weekId: null,
        before: null,
        after: { name: player.name, role: player.role, classId },
        actorDisplay: 'anonymous',
      },
    });

    return res;
  } catch (err: any) {
    console.error('INVITE_CLAIM_ERROR', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
