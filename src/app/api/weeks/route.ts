// src/app/api/weeks/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 12), 1), 52);

  const weeks = await prisma.week.findMany({
    orderBy: { startDate: 'desc' },
    take: limit,
    select: { id: true, label: true, startDate: true },
  });

  return NextResponse.json(weeks);
}
