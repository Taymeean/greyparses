import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWeekStartNY, formatWeekLabelNY } from "@/lib/week";

export async function GET() {
  // find current week by NY label
  const start = getCurrentWeekStartNY();
  const label = formatWeekLabelNY(start);

  const week = await prisma.week.findUnique({
    where: { label },
    select: { id: true, label: true, raidId: true },
  });

  if (!week) {
    // No current week? Return empty but clear label so UI shows something sane.
    return NextResponse.json({ weekId: null, label, bosses: [] });
  }

  const bosses = await prisma.boss.findMany({
    where: { raidId: week.raidId },
    orderBy: { id: "asc" },
    select: { id: true, name: true },
  });

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
