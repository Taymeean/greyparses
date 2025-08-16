// src/app/api/roster/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isOfficer } from "@/lib/auth";

const ROLES = new Set(["TANK", "HEALER", "MDPS", "RDPS"]);

function s(q: URLSearchParams, k: string) {
  const v = q.get(k);
  return v && v.trim() ? v.trim() : null;
}
function n(q: URLSearchParams, k: string) {
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
  const role = s(q, "role");
  const classId = n(q, "classId");
  const active = s(q, "active"); // "true" | "false" | null

  const where: any = {};
  if (query) where.name = { contains: query, mode: "insensitive" };
  if (role && ROLES.has(role)) where.role = role;
  if (typeof classId === "number") where.classId = classId;
  if (active === "true") where.active = true;
  if (active === "false") where.active = false;

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
