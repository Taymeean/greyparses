// src/app/api/boss-kill/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentWeekStartNY, formatWeekLabelNY } from "@/lib/week";
import { Prisma, AuditAction } from "@prisma/client";
import { getActorDisplay, isOfficer } from "@/lib/auth";

const BodySchema = z.object({
  bossId: z.number().int().positive(),
  killed: z.boolean(),
});

export async function POST(req: Request) {
  // officer gate
  const officer = await isOfficer();
  if (!officer) {
    return NextResponse.json({ error: "Officer only" }, { status: 403 });
  }

  // parse body
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  const { bossId, killed } = parsed.data;

  // resolve current week
  const start = getCurrentWeekStartNY();
  const label = formatWeekLabelNY(start);
  const week = await prisma.week.findUnique({
    where: { label },
    include: { raid: true },
  });
  if (!week)
    return NextResponse.json(
      { error: "Current week not found" },
      { status: 500 },
    );

  // boss guard
  const boss = await prisma.boss.findUnique({ where: { id: bossId } });
  if (!boss)
    return NextResponse.json({ error: "Boss not found" }, { status: 404 });
  if (boss.raidId !== week.raidId) {
    return NextResponse.json(
      { error: "Boss not in current raid" },
      { status: 400 },
    );
  }

  // existing state
  const existing = await prisma.bossKill.findUnique({
    where: { weekId_bossId: { weekId: week.id, bossId } },
  });

  // upsert + audit
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.bossKill.upsert({
      where: { weekId_bossId: { weekId: week.id, bossId } },
      update: { killed },
      create: { weekId: week.id, bossId, killed },
    });

    await tx.auditLog.create({
      data: {
        action: AuditAction.BOSS_KILL_TOGGLED,
        targetType: "BOSS_KILL",
        targetId: `week:${week.id}/boss:${bossId}`,
        weekId: week.id,
        before: existing ? { killed: existing.killed } : Prisma.DbNull,
        after: { killed },
        actorDisplay: await getActorDisplay(),
        // If you want actor playerId here, reintroduce readSession() later.
        // For now, avoid the undefined variable `s`.
        // meta: { actorPlayerId: readSession()?.playerId ?? null },
      },
    });

    return updated;
  });

  return NextResponse.json({ ok: true, bossKill: result });
}
