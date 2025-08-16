// src/app/api/bosses/[id]/loot/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const bossId = Number(params.id);
  if (!Number.isInteger(bossId)) {
    return NextResponse.json({ error: "Invalid boss id" }, { status: 400 });
  }

  const boss = await prisma.boss.findUnique({
    where: { id: bossId },
    select: { id: true, name: true },
  });
  if (!boss)
    return NextResponse.json({ error: "Boss not found" }, { status: 404 });

  const drops = await prisma.lootDrop.findMany({
    where: { bossId },
    include: {
      lootItem: { select: { id: true, name: true, type: true, slot: true } },
    },
    orderBy: { lootItem: { name: "asc" } },
  });

  return NextResponse.json({
    boss,
    loot: drops.map((d) => d.lootItem),
  });
}
