// src/app/api/classes/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const classes = await prisma.class.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, armorType: true, tierPrefix: true },
  });
  return NextResponse.json(classes);
}
