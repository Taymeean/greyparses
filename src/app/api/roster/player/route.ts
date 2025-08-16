// src/app/api/roster/player/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getActorDisplay, isOfficer } from "@/lib/auth";
import { AuditAction, TargetType } from "@prisma/client";

const ROLES = new Set(["TANK", "HEALER", "MDPS", "RDPS"]);

const Body = z
  .object({
    playerId: z.number().int().positive(),
    role: z.string().optional(), // one of ROLES
    classId: z.number().int().positive().optional(),
  })
  .refine((b) => b.role != null || b.classId != null, {
    message: "Nothing to update",
  });

export async function PATCH(req: Request) {
  if (!isOfficer()) {
    return NextResponse.json({ error: "Officer only" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { playerId, role, classId } = parsed.data;

  const prev = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      name: true,
      role: true,
      classId: true,
      active: true,
      class: { select: { id: true, name: true } },
    },
  });
  if (!prev) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: any = {};

  if (role != null) {
    if (!ROLES.has(role))
      return NextResponse.json({ error: "invalid_role" }, { status: 400 });
    if (prev.role !== role) data.role = role;
  }
  if (classId != null) {
    if (prev.classId !== classId) {
      const cls = await prisma.class.findUnique({
        where: { id: classId },
        select: { id: true },
      });
      if (!cls)
        return NextResponse.json({ error: "invalid_class" }, { status: 400 });
      data.classId = classId;
    }
  }

  if (Object.keys(data).length === 0) {
    // nothing to change
    return NextResponse.json({
      ok: true,
      player: prev,
      noChange: true,
    });
  }

  const updated = await prisma.player.update({
    where: { id: playerId },
    data,
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

  // optional audit (guard if enum members are missing)
  try {
    const action = (AuditAction as any)["PLAYER_UPDATED"];
    const targetType = (TargetType as any)["PLAYER"];
    if (action && targetType) {
      await prisma.auditLog.create({
        data: {
          action,
          targetType,
          targetId: `player:${playerId}`,
          before: { role: prev.role, classId: prev.classId },
          after: { role: updated.role, classId: updated.class?.id ?? null },
          actorDisplay: getActorDisplay(),
          meta: { playerName: updated.name },
        },
      });
    }
  } catch {
    // ignore audit enum mismatches
  }

  return NextResponse.json({ ok: true, player: updated });
}
