// src/app/api/week/current/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWeekStartNY, formatWeekLabelNY } from "@/lib/week";

export async function GET() {
  const start = getCurrentWeekStartNY();
  const label = formatWeekLabelNY(start);

  const week = await prisma.week.findUnique({
    where: { label },
    include: { raid: true },
  });

  return NextResponse.json({
    label,
    start,
    exists: Boolean(week),
    weekId: week?.id ?? null,
    raid: week?.raid?.name ?? null,
  });
}
