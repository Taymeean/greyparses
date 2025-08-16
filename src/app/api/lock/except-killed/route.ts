// src/app/api/lock/except-killed/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWeekStartNY, formatWeekLabelNY } from "@/lib/week";
import { AuditAction } from "@prisma/client";
import { getActorDisplay, isOfficer } from "@/lib/auth";

export async function POST() {
  // officer gate
  if (!isOfficer()) {
    return NextResponse.json({ error: "Officer only" }, { status: 403 });
  }

  // current week
  const start = getCurrentWeekStartNY();
  const label = formatWeekLabelNY(start);
  const week = await prisma.week.findUnique({ where: { label } });
  if (!week)
    return NextResponse.json(
      { error: "Current week not found" },
      { status: 500 },
    );

  // killed bosses this week
  const killed = await prisma.bossKill.findMany({
    where: { weekId: week.id, killed: true },
    select: { bossId: true },
  });
  const killedIds = killed.map((k) => k.bossId);

  // unlock logic
  let affected = 0;
  if (killedIds.length === 0) {
    const res = await prisma.sRChoice.updateMany({
      where: { weekId: week.id },
      data: { locked: false },
    });
    affected = res.count;
  } else {
    const res = await prisma.sRChoice.updateMany({
      where: {
        weekId: week.id,
        OR: [{ bossId: null }, { bossId: { notIn: killedIds } }],
      },
      data: { locked: false },
    });
    affected = res.count;
  }

  await prisma.auditLog.create({
    data: {
      action: AuditAction.SR_UNLOCKED_EXCEPT_KILLED,
      targetType: "WEEK",
      targetId: `week:${week.id}`,
      weekId: week.id,
      before: null,
      after: { unlocked: affected, killedBossIds: killedIds },
      actorDisplay: getActorDisplay(),
      meta: { unlocked: affected, killedBossIds: killedIds },
    },
  });

  return NextResponse.json({
    ok: true,
    unlocked: affected,
    killedBossIds: killedIds,
  });
}
