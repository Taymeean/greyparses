import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readSession, getActorDisplay } from "@/lib/auth";
import { getCurrentWeekStartNY, formatWeekLabelNY } from "@/lib/week";

const LOG_NOTES_MAX = 128;

const NOTES_MAX = 80 as const;
const Body = z.object({
  playerId: z.number().int().positive(),
  lootItemId: z.number().int().positive().nullable().optional(), // allow clearing
  bossId: z.number().int().positive().nullable().optional(),
  // SRChoice can keep a bigger cap; SRLog will clamp to 128
  notes: z.string().max(NOTES_MAX).optional(),
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
  const player = await prisma.player.findUnique({
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
  if (!player || !player.active) {
    return NextResponse.json({ error: "invalid_player" }, { status: 404 });
  }

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

    // Compute Tier flag
    isTier =
      itemType === TIER_TYPE ||
      (tierPrefix && loot.name.startsWith(tierPrefix));
  } else {
    // clearing SR -> isTier false
    isTier = false;
  }

  // 6) Validate boss (if provided)
  let boss: { id: number; name: string } | null = null;
  if (bossId !== null) {
    boss = await prisma.boss.findUnique({
      where: { id: bossId },
      select: { id: true, name: true, raidId: true },
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

  // 8) Transaction: upsert SR choice, sync SR log, audit
  const result = await prisma.$transaction(async (tx) => {
    // previous SR (for before)
    const prev = await tx.sRChoice.findUnique({
      where: { weekId_playerId: { weekId: week.id, playerId } },
      select: { lootItemId: true, bossId: true, notes: true, isTier: true },
    });

    // upsert SRChoice
    const updated = await tx.sRChoice.upsert({
      where: { weekId_playerId: { weekId: week.id, playerId } },
      update: {
        lootItemId,
        bossId,
        notes:
          typeof notes === "string" ? notes.slice(0, NOTES_MAX) : undefined,
        isTier,
      },
      create: {
        weekId: week.id,
        playerId,
        lootItemId,
        bossId,
        notes:
          typeof notes === "string" ? notes.slice(0, NOTES_MAX) : undefined,
        isTier,
      },
    });

    // SRLog mirrors current SR for the week (unique week+player)
    if (updated.lootItemId == null) {
      await tx.sRLog.deleteMany({ where: { weekId: week.id, playerId } });
    } else {
      const logNotes =
        typeof updated.notes === "string" && updated.notes.length > 0
          ? updated.notes.slice(0, LOG_NOTES_MAX)
          : null;

      await tx.sRLog.upsert({
        where: { weekId_playerId: { weekId: week.id, playerId } },
        update: {
          lootItemId: updated.lootItemId,
          isTier, // derived above, not client-provided
          notes: logNotes,
        },
        create: {
          weekId: week.id,
          playerId,
          lootItemId: updated.lootItemId,
          isTier,
          notes: logNotes,
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

    const before = prev
      ? {
          lootItemId: prev.lootItemId,
          bossId: prev.bossId,
          notes: prev.notes,
          isTier: prev.isTier,
        }
      : null;

    const after = {
      lootItemId: updated.lootItemId,
      bossId: updated.bossId,
      notes: updated.notes,
      isTier: updated.isTier,
    };

    const sess = readSession();

    await tx.auditLog.create({
      data: {
        action: "SR_CHOICE_SET",
        targetType: "SR_CHOICE",
        targetId: `week:${week.id}/player:${playerId}`,
        weekId: week.id,
        before,
        after,
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
