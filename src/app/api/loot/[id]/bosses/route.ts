// src/app/api/loot/[id]/bosses/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const lootItemId = Number(id);  if (!Number.isInteger(lootItemId) || lootItemId <= 0) {
    return NextResponse.json(
      { error: "Invalid loot item id" },
      { status: 400 },
    );
  }

  // ensure item exists (optional, but nice)
  const item = await prisma.lootItem.findUnique({
    where: { id: lootItemId },
    select: { id: true },
  });
  if (!item)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const drops = await prisma.lootDrop.findMany({
    where: { lootItemId },
    include: { boss: { select: { id: true, name: true } } },
    orderBy: { bossId: "asc" },
  });

  const bosses = drops.map((d) => d.boss);
  return NextResponse.json(bosses);
}
