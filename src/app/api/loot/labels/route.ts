import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
  if (ids.length === 0) return NextResponse.json({});

  const items = await prisma.lootItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });

  const map = Object.fromEntries(items.map((i) => [i.id, i.name]));
  return NextResponse.json(map);
}
