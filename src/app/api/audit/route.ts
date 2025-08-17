// src/app/api/audit/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuditAction, TargetType, Prisma } from "@prisma/client";
import { isOfficer } from "@/lib/auth";

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
function enumHas<T extends object>(e: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(e, key);
}

export async function GET(req: Request) {
  if (!isOfficer()) {
    return NextResponse.json({ error: "Officer only" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const q = url.searchParams;

    const action = s(q, "action");
    const targetType = s(q, "targetType");
    const weekId = n(q, "weekId");
    const actor = s(q, "actor");
    const from = s(q, "from");
    const to = s(q, "to");

    const limit = Math.min(Math.max(n(q, "limit") ?? 50, 1), 200);
    const cursorId = n(q, "cursor");

    const where: Prisma.AuditLogWhereInput = {};
    if (action) {
      if (!enumHas(AuditAction, action)) {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
      where.action = action as AuditAction;
    }
    if (targetType) {
      if (!enumHas(TargetType, targetType)) {
        return NextResponse.json(
          { error: "Invalid targetType" },
          { status: 400 },
        );
      }
      where.targetType = targetType as TargetType;
    }
    if (typeof weekId === "number") where.weekId = weekId;
    if (actor) where.actorDisplay = { contains: actor };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    let cursorArgs: Pick<Prisma.AuditLogFindManyArgs, "cursor" | "skip"> = {};
    if (cursorId) {
      const exists = await prisma.auditLog.findUnique({
        where: { id: cursorId },
        select: { id: true },
      });
      if (exists) cursorArgs = { cursor: { id: cursorId }, skip: 1 };
    }

    const items = await prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...cursorArgs,
    });

    const nextCursor = items.length > limit ? items[limit].id : null;
    return NextResponse.json({ items: items.slice(0, limit), nextCursor });
  } catch (err: unknown) {
    console.error("AUDIT_LIST_ERROR", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
