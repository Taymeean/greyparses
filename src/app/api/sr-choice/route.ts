// src/app/api/sr-choice/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readSession, getActorDisplay } from "@/lib/auth";
import { getCurrentWeekStartNY, formatWeekLabelNY } from "@/lib/week";
import { Prisma } from "@prisma/client";

const LOG_NOTES_MAX = 96 as const;

const Body = z.object({
  playerId: z.number().int().positive(),
  lootItemId: z.number().int().positive().nullable().optional(), // allow clearing
  bossId: z.number().int().positive().nullable().optional(),
  notes: z.string().max(LOG_NOTES_MAX).optional(),
});

const UNIVERSAL_TYPES = new Set(["ACCESSORIES", "TRINKET", "WEAPON"]);
const ARMOR_TYPES = new Set(["CLOTH", "LEATHER", "MAIL", "PLATE"]);
const TIER_TYPE = "TIER_SET";

export async function POST(req: Request) {
  // 1) Parse
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { playerId, lootItemId: rawLoot, bossId: rawBoss, notes } = parsed.data;
  const lootItemId = rawLoot ?? null;
  const bossId = rawBoss ?? null;

  // 2) Current week (must already exist; created by Reset Week)
  const label = formatWeekLabelNY(getCurrentWeekStartNY());
  const week = await prisma.week.findUnique({
    where: { label },
    select: { id: true, raidId: true },
  });
  if (!week)
    return NextResponse.json(
      { error: "current_week_missing" },
      { status: 404 },
    );

  // 3) Player & class
  const p = await prisma.player.findUnique({
    where: { id: playerId },
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
  if (!p || !p.active) {
    return NextResponse.json({ error: "invalid_player" }, { status: 404 });
  }
  const player = p; // narrowed non-null

  // 4) If an SR row exists and is locked, block edits
  const existingRow = await prisma.sRChoice.findUnique({
    where: { weekId_playerId: { weekId: week.id, playerId } },
    select: { locked: true },
  });
  if (existingRow?.locked) {
    return NextResponse.json({ error: "locked" }, { status: 403 });
  }

  // 5) Validate loot item (if provided), compute isTier
  let loot: {
    id: number;
    name: string;
    type: string;
    slot: string | null;
  } | null = null;
  let isTier = false;

  if (lootItemId !== null) {
    loot = await prisma.lootItem.findUnique({
      where: { id: lootItemId },
      select: { id: true, name: true, type: true, slot: true },
    });
    if (!loot) {
      return NextResponse.json({ error: "invalid_item" }, { status: 400 });
    }

    // Class guardrails
    const itemType = (loot.type || "").toUpperCase();
    const playerArmor = (player.class?.armorType || "").toUpperCase();
    const tierPrefix = (player.class?.tierPrefix || "").trim();

    const allowed =
      UNIVERSAL_TYPES.has(itemType) ||
      (ARMOR_TYPES.has(itemType) && itemType === playerArmor) ||
      itemType === TIER_TYPE ||
      (tierPrefix && loot.name.startsWith(tierPrefix));

    if (!allowed) {
      return NextResponse.json(
        { error: "item_not_usable_by_class" },
        { status: 400 },
      );
    }

    // Strict boolean: compute Tier flag
    isTier =
      itemType === TIER_TYPE ||
      (!!tierPrefix && loot.name.startsWith(tierPrefix));
  } else {
    // clearing SR -> isTier false
    isTier = false;
  }

  // 6) Validate boss (if provided)
  let boss: { id: number; name: string; raidId: number } | null = null;
  if (bossId !== null) {
    boss = await prisma.boss.findUnique({
      where: { id: bossId },
      select: { id: true, name: true, raidId: true }, // include raidId for cross-raid guard
    });
    if (!boss || boss.raidId !== week.raidId) {
      return NextResponse.json({ error: "invalid_boss" }, { status: 400 });
    }
  }

  // 7) Optional: if both boss & item given, ensure this boss drops the item
  if (boss && loot) {
    const drop = await prisma.lootDrop.findFirst({
      where: { bossId: boss.id, lootItemId: loot.id },
      select: { bossId: true },
    });
    if (!drop) {
      return NextResponse.json(
        { error: "boss_does_not_drop_item" },
        { status: 400 },
      );
    }
  }

  // 8) Transaction: upsert SR choice, log, audit
  const result = await prisma.$transaction(async (tx) => {
    // previous SR (for before)
    const prev = await tx.sRChoice.findUnique({
      where: { weekId_playerId: { weekId: week.id, playerId } },
      select: { lootItemId: true, bossId: true, notes: true, isTier: true },
    });

    // upsert
    const updated = await tx.sRChoice.upsert({
      where: { weekId_playerId: { weekId: week.id, playerId } },
      update: {
        lootItemId,
        bossId,
        notes: typeof notes === "string" ? notes : undefined,
        isTier,
      },
      create: {
        weekId: week.id,
        playerId,
        lootItemId,
        bossId,
        notes: typeof notes === "string" ? notes : undefined,
        isTier,
      },
    });

    // SR log (lightweight snapshot)
    // SR log (only if there is an item; SRLog.lootItemId is non-nullable)
    if (updated.lootItemId != null) {
      await tx.sRLog.create({
        data: {
          weekId: week.id,
          playerId,
          lootItemId: updated.lootItemId,
        },
      });
    }

    // Human-readable audit line
    function buildDisplay() {
      const who = player.name ?? `player:${playerId}`;
      if (!updated.lootItemId && !updated.bossId && !updated.notes)
        return `SR: ${who} cleared`;
      const bits: string[] = [`SR: ${who}`];
      if (loot) bits.push(`Item: ${loot.name}`);
      if (boss) bits.push(`Boss: ${boss.name}`);
      if (updated.isTier) bits.push("Tier");
      if (typeof updated.notes === "string" && updated.notes.trim())
        bits.push(`Notes: ${updated.notes.trim()}`);
      return bits.join(" • ");
    }

    const beforeJson:
      | Prisma.InputJsonValue
      | Prisma.NullableJsonNullValueInput = prev
      ? {
          lootItemId: prev.lootItemId ?? null,
          bossId: prev.bossId ?? null,
          notes: prev.notes ?? null,
          isTier: prev.isTier,
        }
      : Prisma.DbNull;

    const afterJson: Prisma.InputJsonValue = {
      lootItemId: updated.lootItemId ?? null,
      bossId: updated.bossId ?? null,
      notes: updated.notes ?? null,
      isTier: updated.isTier,
    };

    const sess = readSession();

    await tx.auditLog.create({
      data: {
        action: "SR_CHOICE_SET",
        targetType: "SR_CHOICE",
        targetId: `week:${week.id}/player:${playerId}`,
        weekId: week.id,
        before: beforeJson,
        after: afterJson,
        actorDisplay: getActorDisplay(),
        meta: {
          display: buildDisplay(),
          lootItemId: updated.lootItemId ?? null,
          bossId: updated.bossId ?? null,
          actorPlayerId: sess?.playerId ?? null,
        },
      },
    });

    return updated;
  });

  return NextResponse.json({ ok: true, choice: result });
}
