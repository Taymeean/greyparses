// src/app/api/lock/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentWeekStartNY, formatWeekLabelNY } from '@/lib/week';
import { AuditAction } from '@prisma/client';
import { getActorDisplay } from '@/lib/auth';

const BodySchema = z.object({
  lock: z.boolean(), // true = lock all, false = unlock all
});

export async function POST(req: Request) {
  // parse
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { lock } = parsed.data;

  // current week
  const start = getCurrentWeekStartNY();
  const label = formatWeekLabelNY(start);
  const week = await prisma.week.findUnique({ where: { label } });
  if (!week) return NextResponse.json({ error: 'Current week not found' }, { status: 500 });

  // flip all rows’ locked state for this week
  const result = await prisma.sRChoice.updateMany({
    where: { weekId: week.id },
    data: { locked: lock },
  });

  // audit
  await prisma.auditLog.create({
    data: {
      action: lock ? AuditAction.SR_LOCKED : AuditAction.SR_UNLOCKED,
      targetType: 'WEEK',
      targetId: `week:${week.id}`,
      weekId: week.id,
      before: null,
      after: { locked: lock, affected: result.count },
      actorDisplay: getActorDisplay(), // << uses cookie actor
      meta: { affected: result.count },
    },
  });

  return NextResponse.json({ ok: true, affected: result.count });
}
