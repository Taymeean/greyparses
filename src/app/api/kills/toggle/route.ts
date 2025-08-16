import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentWeekStartNY, formatWeekLabelNY } from "@/lib/week";
import { isOfficer, getActorDisplay, readSession } from "@/lib/auth";
import { AuditAction } from "@prisma/client";

const Body = z.object({ bossId: z.number().int().positive() });

export async function POST(req: Request) {
  if (!isOfficer()) {
    return NextResponse.json({ error: "Officer only" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { bossId } = parsed.data;

  // Current week by NY label
  const start = getCurrentWeekStartNY();
  const label = formatWeekLabelNY(start);
  const week = await prisma.week.findUnique({
    where: { label },
    select: { id: true, raidId: true, label: true },
  });
  if (!week) {
    return NextResponse.json(
      { error: "current_week_missing" },
      { status: 404 },
    );
  }

  // Ensure boss exists for this raid
  const boss = await prisma.boss.findFirst({
    where: { id: bossId, raidId: week.raidId },
    select: { id: true, name: true },
  });
  if (!boss) {
    return NextResponse.json(
      { error: "invalid_boss_for_raid" },
      { status: 404 },
    );
  }

  // Toggle killed
  const existing = await prisma.bossKill.findUnique({
    where: { weekId_bossId: { weekId: week.id, bossId } },
  });

  let before = { killed: false };
  let after = { killed: true };
  let updated;

  if (!existing) {
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

  // Audit
  const s = readSession();
  await prisma.auditLog.create({
    data: {
      action: AuditAction.BOSS_KILL_TOGGLED,
      targetType: "BOSS_KILL",
      targetId: `week:${week.id}/boss:${bossId}`,
      weekId: week.id,
      before,
      after,
      actorDisplay: getActorDisplay(),
      meta: {
        display: `Boss kill toggled • ${boss.name} • ${after.killed ? "killed" : "alive"} • week ${week.label}`,
        actorPlayerId: s?.playerId ?? null,
        bossId,
      },
    },
  });

  return NextResponse.json({ ok: true, bossId, killed: updated.killed });
}
