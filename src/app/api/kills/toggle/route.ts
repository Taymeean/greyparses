import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentWeekStartNY, formatWeekLabelNY } from '@/lib/week';
import { isOfficer, getActorDisplay } from '@/lib/auth';
import { AuditAction } from '@prisma/client';

const Body = z.object({ bossId: z.number().int().positive() });

export async function POST(req: Request) {
  if (!isOfficer()) return NextResponse.json({ error: 'Officer only' }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const { bossId } = parsed.data;

  const start = getCurrentWeekStartNY();
  const label = formatWeekLabelNY(start);
  const week = await prisma.week.findUnique({ where: { label }, select: { id: true } });
  if (!week) return NextResponse.json({ error: 'Current week not found' }, { status: 404 });

  // ensure boss exists in this raid (optional, but nice)
  const boss = await prisma.boss.findUnique({ where: { id: bossId }, select: { id: true, name: true } });
  if (!boss) return NextResponse.json({ error: 'Boss not found' }, { status: 404 });

  // find existing kill row
  const existing = await prisma.bossKill.findUnique({
    where: { weekId_bossId: { weekId: week.id, bossId } },
  });

  let before = { killed: false };
  let after = { killed: true };

  let updated;
  if (!existing) {
    // create killed=true on first toggle
    updated = await prisma.bossKill.create({
      data: { weekId: week.id, bossId, killed: true },
    });
    after = { killed: true };
  } else {
    before = { killed: existing.killed };
    updated = await prisma.bossKill.update({
      where: { weekId_bossId: { weekId: week.id, bossId } },
      data: { killed: !existing.killed },
    });
    after = { killed: updated.killed };
  }

  // audit
  await prisma.auditLog.create({
    data: {
      action: AuditAction.BOSS_KILL_TOGGLED,
      targetType: 'BOSS_KILL',
      targetId: `week:${week.id}/boss:${bossId}`,
      weekId: week.id,
      before,
      after,
      actorDisplay: getActorDisplay(),
    },
  });

  return NextResponse.json({ ok: true, bossId, killed: updated.killed });
}
