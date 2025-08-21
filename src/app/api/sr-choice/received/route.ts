// src/app/api/sr-choice/received/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentWeekStartNY, formatWeekLabelNY } from "@/lib/week";
import { isOfficer, getActorDisplay } from "@/lib/auth";
import { AuditAction, Prisma } from "@prisma/client";

const Body = z.object({
  playerId: z.number().int().positive(),
  received: z.boolean(),
});

export async function POST(req: Request) {
  // officer gate
  const officer = await isOfficer();
  if (!officer) {
    return NextResponse.json({ error: "Officer only" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { playerId, received } = parsed.data;

  // resolve current week
  const label = formatWeekLabelNY(getCurrentWeekStartNY());
  const week = await prisma.week.findUnique({
    where: { label },
    select: { id: true, label: true, raidId: true },
  });
  if (!week) {
    return NextResponse.json({ error: "current_week_missing" }, { status: 404 });
  }

  // ensure player exists and is part of roster
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, name: true, active: true },
  });
  if (!player) {
    return NextResponse.json({ error: "player_not_found" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    // read previous row if any (for audit)
    const prev = await tx.sRChoice.findUnique({
      where: { weekId_playerId: { weekId: week.id, playerId } },
      select: {
        lootItemId: true,
        bossId: true,
        isTier: true,
        notes: true,
        received: true,
      },
    });

    // upsert row with new received value
    const updated = await tx.sRChoice.upsert({
      where: { weekId_playerId: { weekId: week.id, playerId } },
      update: { received },
      create: {
        weekId: week.id,
        playerId,
        received,
        // leave lootItemId/bossId/notes unset; they can remain null
      },
      select: {
        lootItemId: true,
        bossId: true,
        isTier: true,
        notes: true,
        received: true,
      },
    });

    const beforeJson:
      | Prisma.InputJsonValue
      | Prisma.NullableJsonNullValueInput = prev
      ? {
          lootItemId: prev.lootItemId ?? null,
          bossId: prev.bossId ?? null,
          isTier: prev.isTier,
          notes: prev.notes ?? null,
          received: prev.received,
        }
      : Prisma.DbNull;

    const afterJson: Prisma.InputJsonValue = {
      lootItemId: updated.lootItemId ?? null,
      bossId: updated.bossId ?? null,
      isTier: updated.isTier,
      notes: updated.notes ?? null,
      received: updated.received,
    };

    await tx.auditLog.create({
      data: {
        action: AuditAction.SR_ITEM_RECEIVED_TOGGLED,
        targetType: "SR_CHOICE",
        targetId: `week:${week.id}/player:${playerId}`,
        weekId: week.id,
        before: beforeJson,
        after: afterJson,
        actorDisplay: await getActorDisplay(),
        meta: {
          display: `Received toggled • ${player.name} • ${updated.received ? "true" : "false"} • ${week.label}`,
          playerName: player.name,
          received: updated.received,
        },
      },
    });

    return updated;
  });

  return NextResponse.json({ ok: true, received: result.received });
}
