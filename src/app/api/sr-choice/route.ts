// src/app/api/sr-choice/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentWeekStartNY, formatWeekLabelNY } from '@/lib/week';
import { validateSRChoice } from '@/lib/lootRules';
import { getActorDisplay } from '@/lib/auth';
import { AuditAction } from '@prisma/client';

const BodySchema = z.object({
  playerId: z.number().int().positive(),
  lootItemId: z.number().int().positive().optional(), // omit to clear SR
  bossId: z.number().int().positive().optional(),     // optional
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  // 1) parse + validate body
  let json: unknown = null;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { playerId, lootItemId, bossId, notes } = parsed.data;

  // 2) find current week by label
  const start = getCurrentWeekStartNY();
  const label = formatWeekLabelNY(start);
  const week = await prisma.week.findUnique({ where: { label } });
  if (!week) {
    return NextResponse.json({ error: 'Current week not found. Seed/init first.' }, { status: 500 });
  }

  // 3) read existing choice (for lock + before/after diff)
  const existing = await prisma.sRChoice.findUnique({
    where: { weekId_playerId: { weekId: week.id, playerId } },
  });
  if (existing?.locked) {
    return NextResponse.json({ error: 'SR is locked for this player.' }, { status: 403 });
  }

  // 4) guardrails: class rules (armor/tier/universal) + boss drop linkage
  const validation = await validateSRChoice(playerId, lootItemId, bossId);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message, code: validation.code }, { status: 400 });
  }
  const isTier = validation.isTier;

  // 5) upsert + conditional SRLog + AuditLog
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.sRChoice.upsert({
      where: { weekId_playerId: { weekId: week.id, playerId } },
      update: {
        lootItemId: lootItemId ?? null,
        bossId: bossId ?? null,
        notes: typeof notes === 'string' ? notes : undefined,
        isTier,
      },
      create: {
        weekId: week.id,
        playerId,
        lootItemId: lootItemId ?? null,
        bossId: bossId ?? null,
        notes: typeof notes === 'string' ? notes : undefined,
        isTier,
      },
    });

    // only log when loot item actually changes to a non-empty value
    const itemChanged = existing?.lootItemId !== lootItemId && !!lootItemId;
    if (itemChanged) {
      await tx.sRLog.create({
        data: {
          weekId: week.id,
          playerId,
          lootItemId: lootItemId!,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        action: AuditAction.SR_CHOICE_SET,
        targetType: 'SR_CHOICE',
        targetId: `week:${week.id}/player:${playerId}`,
        weekId: week.id,
        before: existing
          ? {
              lootItemId: existing.lootItemId ?? null,
              bossId: existing.bossId ?? null,
              notes: existing.notes ?? null,
              isTier: existing.isTier,
            }
          : null,
        after: {
          lootItemId: lootItemId ?? null,
          bossId: bossId ?? null,
          notes: notes ?? null,
          isTier,
        },
        actorDisplay: getActorDisplay(), // << now uses cookie actor
      },
    });

    return updated;
  });

  return NextResponse.json({ ok: true, choice: result });
}
