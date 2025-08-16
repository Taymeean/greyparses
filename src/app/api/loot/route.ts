// src/app/api/loot/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { filterLootForClass } from "@/lib/lootFilter";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const classIdParam = url.searchParams.get("classId");
  const classId = classIdParam ? Number(classIdParam) : NaN;
  if (!Number.isInteger(classId)) {
    return NextResponse.json(
      { error: "classId query param is required (number)" },
      { status: 400 },
    );
  }

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls)
    return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const items = await prisma.lootItem.findMany({
    select: { id: true, name: true, type: true },
  });

  const filtered = filterLootForClass(cls, items);
  return NextResponse.json(filtered);
}
