// src/app/api/players/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      role: true,
      class: { select: { id: true, name: true, armorType: true, tierPrefix: true } },
    },
  });
  return NextResponse.json(players);
}
