// src/app/api/reset-week/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentWeekStartNY,
  formatWeekLabelNY,
  getNextWeekStartFrom,
} from "@/lib/week";
import { AuditAction } from "@prisma/client";
import { getActorDisplay, isOfficer } from "@/lib/auth";

export async function POST() {
  // officer gate
  if (!isOfficer()) {
    return NextResponse.json({ error: "Officer only" }, { status: 403 });
  }

  // Current (closing) week by label
  const currentStart = getCurrentWeekStartNY();
  const currentLabel = formatWeekLabelNY(currentStart);

  const current = await prisma.week.findUnique({
    where: { label: currentLabel },
    select: { id: true, raidId: true, startDate: true, label: true },
  });

  if (!current) {
    return NextResponse.json(
      { error: "Current week not found. Seed/init first." },
      { status: 500 },
    );
  }

  // Snapshot counts for audit
  const [choicesCount, killsTrueCount] = await Promise.all([
    prisma.sRChoice.count({ where: { weekId: current.id } }),
    prisma.bossKill.count({ where: { weekId: current.id, killed: true } }),
  ]);

  // Compute / ensure next week exists
  const nextStart = getNextWeekStartFrom(current.startDate);
  const nextLabel = formatWeekLabelNY(nextStart);

  let created = false;

  let nextWeek = await prisma.week.findUnique({
    where: { label: nextLabel },
    select: { id: true, label: true, startDate: true },
  });

  if (!nextWeek) {
    nextWeek = await prisma.week.create({
      data: { raidId: current.raidId, label: nextLabel, startDate: nextStart },
      select: { id: true, label: true, startDate: true },
    });
    created = true;
  }

  // Audit the reset
  await prisma.auditLog.create({
    data: {
      action: AuditAction.WEEK_RESET,
      targetType: "WEEK",
      targetId: `week:${current.id}`,
      weekId: current.id,
      before: { label: current.label, choicesCount, killsTrueCount },
      after: {
        nextWeekId: nextWeek.id,
        nextLabel: nextWeek.label,
        created,
      },
      actorDisplay: getActorDisplay(),
    },
  });

  return NextResponse.json({
    ok: true,
    currentWeekId: current.id,
    currentLabel,
    nextWeekId: nextWeek.id,
    nextLabel: nextWeek.label,
    created,
    closedCounts: { srChoices: choicesCount, bossesKilled: killsTrueCount },
  });
}
