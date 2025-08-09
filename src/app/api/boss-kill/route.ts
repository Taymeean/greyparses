// src/app/api/boss-kill/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentWeekStartNY, formatWeekLabelNY } from '@/lib/week';
import { AuditAction } from '@prisma/client';
import { getActorDisplay } from '@/lib/auth';

const BodySchema = z.object({
  bossId: z.number().int().positive(),
  killed: z.boolean(),
});

export async function POST(req: Request) {
  // 1) parse body
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { bossId, killed } = parsed.data;

  // 2) resolve current week
  const start = getCurrentWeekStartNY();
  const label = formatWeekLabelNY(start);
  const week = await prisma.week.findUnique({
    where: { label },
    include: { raid: true },
  });
  if (!week) return NextResponse.json({ error: 'Current week not found' }, { status: 500 });

  // 3) make sure boss exists and belongs to this raid
  const boss = await prisma.boss.findUnique({ where: { id: bossId } });
  if (!boss) return NextResponse.json({ error: 'Boss not found' }, { status: 404 });
  if (boss.raidId !== week.raidId) {
    return NextResponse.json({ error: 'Boss not in current raid' }, { status: 400 });
  }

  // 4) read existing state (for audit diff)
  const existing = await prisma.bossKill.findUnique({
    where: { weekId_bossId: { weekId: week.id, bossId } },
  });

  // 5) upsert + audit
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.bossKill.upsert({
      where: { weekId_bossId: { weekId: week.id, bossId } },
      update: { killed },
      create: { weekId: week.id, bossId, killed },
    });

    await tx.auditLog.create({
      data: {
        action: AuditAction.BOSS_KILL_TOGGLED,
        targetType: 'BOSS_KILL',
        targetId: `week:${week.id}/boss:${bossId}`,
        weekId: week.id,
        before: existing ? { killed: existing.killed } : null,
        after: { killed },
        actorDisplay: getActorDisplay(), // <— now uses cookie actor
      },
    });

    return updated;
  });

  return NextResponse.json({ ok: true, bossKill: result });
}
