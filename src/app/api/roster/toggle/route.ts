// src/app/api/roster/toggle/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getActorDisplay, isOfficer } from "@/lib/auth";
import { AuditAction, TargetType } from "@prisma/client";

const Body = z.object({
  playerId: z.number().int().positive(),
  active: z.boolean(),
});

export async function POST(req: Request) {
  const officer = await isOfficer();
  if (!officer) {
    return NextResponse.json({ error: "Officer only" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { playerId, active } = parsed.data;

  const prev = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, name: true, active: true },
  });
  if (!prev) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (prev.active === active) {
    return NextResponse.json({
      ok: true,
      player: { id: prev.id, active: prev.active, name: prev.name },
    });
  }

  const updated = await prisma.player.update({
    where: { id: playerId },
    data: { active },
    select: { id: true, name: true, active: true },
  });

  // Optional audit: only if your enums include these members
  const actionKey = active ? "PLAYER_REACTIVATED" : "PLAYER_DEACTIVATED";
  const targetKey = "PLAYER";

  let action: AuditAction | undefined;
  let targetType: TargetType | undefined;

  if (actionKey in AuditAction) {
    action = AuditAction[actionKey as keyof typeof AuditAction];
  }
  if (targetKey in TargetType) {
    targetType = TargetType[targetKey as keyof typeof TargetType];
  }

  if (action && targetType) {
    await prisma.auditLog.create({
      data: {
        action,
        targetType,
        targetId: `player:${playerId}`,
        before: { active: prev.active },
        after: { active: updated.active },
        actorDisplay: await getActorDisplay(),
        meta: { playerName: updated.name },
      },
    });
  }

  return NextResponse.json({ ok: true, player: updated });
}
