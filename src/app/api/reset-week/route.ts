// src/app/api/reset-week/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentWeekStartNY, formatWeekLabelNY, getNextWeekStartFrom } from '@/lib/week';
import { AuditAction } from '@prisma/client';
import { getActorDisplay } from '@/lib/auth';

export async function POST() {
  // resolve current (closing) week by label
  const currentStart = getCurrentWeekStartNY();
  const currentLabel = formatWeekLabelNY(currentStart);

  const current = await prisma.week.findUnique({
    where: { label: currentLabel },
    select: { id: true, raidId: true, startDate: true, label: true },
  });
  if (!current) {
    return NextResponse.json({ error: 'Current week not found. Seed/init first.' }, { status: 500 });
  }

  // snapshot counts for audit
  const [choicesCount, killsTrueCount] = await Promise.all([
    prisma.sRChoice.count({ where: { weekId: current.id } }),
    prisma.bossKill.count({ where: { weekId: current.id, killed: true } }),
  ]);

  // compute/create the next week (7 days after current.startDate)
  const nextStart = getNextWeekStartFrom(current.startDate);
  const nextLabel = formatWeekLabelNY(nextStart);

  let next = await prisma.week.findUnique({ where: { label: nextLabel } });
  let created = false;
  if (!next) {
    next = await prisma.week.create({
      data: { raidId: current.raidId, label: nextLabel, startDate: nextStart },
      select: { id: true, label: true, startDate: true },
    });
    created = true;
  }

  // audit the reset
  await prisma.auditLog.create({
    data: {
      action: AuditAction.WEEK_RESET,
      targetType: 'WEEK',
      targetId: `week:${current.id}`,
      weekId: current.id,
      before: { label: current.label, choicesCount, killsTrueCount },
      after: { nextWeekId: next.id, nextLabel: next.label, created },
      actorDisplay: getActorDisplay(), // << uses cookie actor
    },
  });

  return NextResponse.json({
    ok: true,
    currentWeekId: current.id,
    currentLabel,
    nextWeekId: next.id,
    nextLabel,
    created,
    closedCounts: {
      srChoices: choicesCount,
      bossesKilled: killsTrueCount,
    },
  });
}
