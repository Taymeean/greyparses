// src/app/api/kills/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentWeekStartNY, formatWeekLabelNY } from '@/lib/week';

export async function GET() {
  // find current week
  const start = getCurrentWeekStartNY();
  const label = formatWeekLabelNY(start);
  const week = await prisma.week.findUnique({
    where: { label },
    include: { raid: true },
  });
  if (!week) return NextResponse.json({ error: 'Current week not found' }, { status: 500 });

  // fetch *all* bosses for this raid, then overlay week kills
  const [bosses, kills] = await Promise.all([
    prisma.boss.findMany({
      where: { raidId: week.raidId },
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.bossKill.findMany({
      where: { weekId: week.id },
      select: { bossId: true, killed: true },
    }),
  ]);
  const killMap = new Map(kills.map(k => [k.bossId, k.killed]));
  const rows = bosses.map(b => ({
    bossId: b.id,
    bossName: b.name,
    killed: killMap.get(b.id) ?? false,
  }));

  return NextResponse.json({ weekId: week.id, label, raid: week.raid.name, rows });
}
