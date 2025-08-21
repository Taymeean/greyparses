// src/app/api/kills/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWeekStartNY, formatWeekLabelNY } from "@/lib/week";

export async function GET() {
  // find or create current week by NY label
  const start = getCurrentWeekStartNY();
  const label = formatWeekLabelNY(start);

  // Try to find existing current week
  let week = await prisma.week.findUnique({
    where: { label },
    select: { id: true, label: true, raidId: true },
  });

  // If missing, auto-create using the most recent week's raidId if possible,
  // otherwise fall back to the first raid in the DB.
  if (!week) {
    let raidId: number | null = null;

    const lastWeek = await prisma.week.findFirst({
      orderBy: { startDate: "desc" },
      select: { raidId: true },
    });
    if (lastWeek?.raidId) {
      raidId = lastWeek.raidId;
    } else {
      const anyRaid = await prisma.raid.findFirst({ select: { id: true } });
      raidId = anyRaid?.id ?? null;
    }

    if (raidId != null) {
      week = await prisma.week.create({
        data: { raidId, label, startDate: start },
        select: { id: true, label: true, raidId: true },
      });
    }
  }

  // Still nothing? Return empty but with the label so UI shows something sane.
  if (!week) {
    return NextResponse.json({ weekId: null, label, bosses: [] });
  }

  // Bosses for this raid
  const bosses = await prisma.boss.findMany({
    where: { raidId: week.raidId },
    orderBy: { id: "asc" },
    select: { id: true, name: true },
  });

  // Kills for this week
  const kills = await prisma.bossKill.findMany({
    where: { weekId: week.id },
    select: { bossId: true, killed: true },
  });
  const killedMap = new Map(kills.map((k) => [k.bossId, k.killed]));

  const rows = bosses.map((b) => ({
    id: b.id,
    name: b.name,
    killed: Boolean(killedMap.get(b.id)),
  }));

  return NextResponse.json({
    weekId: week.id,
    label: week.label,
    bosses: rows,
  });
}
