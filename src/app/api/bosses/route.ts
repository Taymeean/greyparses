// src/app/api/bosses/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const bosses = await prisma.boss.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      raid: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(bosses);
}
