// src/app/api/loot/[id]/bosses/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getParam(ctx: unknown, key: string): string | null {
  const params = (ctx as { params?: Record<string, string | string[]> }).params ?? {};
  const raw = params[key];
  if (raw == null) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

export async function GET(_req: Request, ctx: unknown) {
  const idStr = getParam(ctx, "id");
  const lootItemId = Number(idStr);
  if (!Number.isInteger(lootItemId)) {
    return NextResponse.json({ error: "Invalid lootItem id" }, { status: 400 });
  }

  // Find boss IDs that drop this item
  const drops = await prisma.lootDrop.findMany({
    where: { lootItemId },
    select: { bossId: true },
  });
  const bossIds = Array.from(new Set(drops.map(d => d.bossId)));

  if (bossIds.length === 0) return NextResponse.json([]);

  const bosses = await prisma.boss.findMany({
    where: { id: { in: bossIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // SR page expects Boss[] (not wrapped)
  return NextResponse.json(bosses);
}
