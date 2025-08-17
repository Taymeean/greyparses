// src/app/api/roster/player/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getActorDisplay, isOfficer } from "@/lib/auth";
import { AuditAction, TargetType, Role, Prisma } from "@prisma/client";

const Body = z
  .object({
    playerId: z.number().int().positive(),
    role: z.nativeEnum(Role).optional(),
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
  if (!prev) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Build a typed update payload (unchecked to allow direct classId write).
  const data: Partial<Prisma.PlayerUncheckedUpdateInput> = {};

  if (role != null && prev.role !== role) {
    data.role = role;
  }

  if (classId != null && prev.classId !== classId) {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true },
    });
    if (!cls) {
      return NextResponse.json({ error: "invalid_class" }, { status: 400 });
    }
    data.classId = classId;
  }

  if (Object.keys(data).length === 0) {
    // Nothing to change
    return NextResponse.json({ ok: true, player: prev, noChange: true });
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

  // Optional audit (only if your enums include these members).
  const actionKey = "PLAYER_UPDATED" as const;
  const targetKey = "PLAYER" as const;

  // Use a typed index to avoid `unknown`
  const action = (AuditAction as Record<string, AuditAction>)[actionKey] as
    | AuditAction
    | undefined;
  const targetType = (TargetType as Record<string, TargetType>)[targetKey] as
    | TargetType
    | undefined;

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

  return NextResponse.json({ ok: true, player: updated });
}
