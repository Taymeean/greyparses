// src/app/api/roster/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isOfficer } from "@/lib/auth";
import { Prisma, Role as PrismaRole } from "@prisma/client";

const ROLES = new Set<PrismaRole>(["TANK", "HEALER", "MDPS", "RDPS"]);

function s(q: URLSearchParams, k: string): string | null {
  const v = q.get(k);
  return v && v.trim() ? v.trim() : null;
}
function n(q: URLSearchParams, k: string): number | null {
  const v = q.get(k);
  if (!v) return null;
  const num = Number(v);
  return Number.isInteger(num) ? num : null;
}

export async function GET(req: Request) {
  if (!isOfficer()) {
    return NextResponse.json({ error: "Officer only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams;

  const query = s(q, "q");
  const roleStr = s(q, "role");
  const role =
    roleStr && ROLES.has(roleStr as PrismaRole)
      ? (roleStr as PrismaRole)
      : undefined;
  const classId = n(q, "classId");
  const active = s(q, "active"); // "true" | "false" | null

  const where: Prisma.PlayerWhereInput = {
    ...(query ? { name: { contains: query } } : {}),
    ...(role ? { role } : {}),
    ...(typeof classId === "number" ? { classId } : {}),
    ...(active === "true" ? { active: true } : {}),
    ...(active === "false" ? { active: false } : {}),
  };

  const rows = await prisma.player.findMany({
    where,
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
      class: {
        select: { id: true, name: true, armorType: true, tierPrefix: true },
      },
    },
  });

  return NextResponse.json(rows);
}
