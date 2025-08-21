// src/app/api/player/reactivate/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isOfficer, getActorDisplay } from "@/lib/auth";
import { AuditAction } from "@prisma/client";

const Body = z
  .object({
    playerId: z.number().int().positive().optional(),
    name: z.string().min(2).max(24).optional(),
  })
  .refine((d) => d.playerId || d.name, { message: "Provide playerId or name" });

export async function POST(req: Request) {
  const officer = await isOfficer();
  if (!officer) {
    return NextResponse.json({ error: "Officer only" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { playerId, name } = parsed.data;

  const player = await prisma.player.findFirst({
    where: playerId ? { id: playerId } : { name: name! },
    select: { id: true, active: true },
  });
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (player.active) {
    return NextResponse.json({ ok: true, reactivated: false });
  }

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: { active: true },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.PLAYER_REACTIVATED,
      targetType: "PLAYER",
      targetId: `player:${updated.id}`,
      weekId: null,
      before: { active: false },
      after: { active: true },
      actorDisplay: await getActorDisplay(), // officer
    },
  });

  return NextResponse.json({ ok: true, reactivated: true });
}
