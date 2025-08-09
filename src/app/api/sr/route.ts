// src/app/api/sr/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentWeekStartNY, formatWeekLabelNY } from '@/lib/week';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const weekIdParam = url.searchParams.get('weekId');

  // Resolve target week
  let week:
    | { id: number; label: string }
    | null = null;

  if (weekIdParam) {
    const weekId = Number(weekIdParam);
    if (!Number.isInteger(weekId)) {
      return NextResponse.json({ error: 'Invalid weekId' }, { status: 400 });
    }
    const w = await prisma.week.findUnique({
      where: { id: weekId },
      select: { id: true, label: true },
    });
    if (!w) return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    week = w;
  } else {
    const start = getCurrentWeekStartNY();
    const label = formatWeekLabelNY(start);
    const w = await prisma.week.findUnique({
      where: { label },
      select: { id: true, label: true },
    });
    if (!w) return NextResponse.json({ error: 'Current week not found' }, { status: 500 });
    week = w;
  }

  // Fetch all players + their SR for this week
  const players = await prisma.player.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      role: true,
      class: { select: { id: true, name: true, armorType: true, tierPrefix: true } },
      srChoices: {
        where: { weekId: week.id },
        take: 1,
        select: {
          id: true,
          lootItem: { select: { id: true, name: true, type: true, slot: true } },
          boss: { select: { id: true, name: true } },
          isTier: true,
          locked: true,
          notes: true,
          updatedAt: true,
        },
      },
    },
  });

  const rows = players.map(p => {
    const choice = p.srChoices[0] ?? null;
    return {
      playerId: p.id,
      playerName: p.name,
      role: p.role,
      class: p.class,
      choice: choice && {
        id: choice.id,
        lootItem: choice.lootItem,
        boss: choice.boss,
        isTier: choice.isTier,
        locked: choice.locked,
        notes: choice.notes ?? '',
        updatedAt: choice.updatedAt,
      },
    };
  });

  return NextResponse.json({ weekId: week.id, label: week.label, rows });
}
