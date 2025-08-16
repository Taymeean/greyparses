// src/lib/lootRules.ts
import { prisma } from "@/lib/db";
import type { LootItem, Class as ClassRow, LootType } from "@prisma/client";

const UNIVERSAL = new Set<LootType>(["ACCESSORIES", "TRINKET", "WEAPON"]);

export function isItemAllowedForClass(
  cls: ClassRow,
  item: LootItem,
): { allowed: boolean; isTier: boolean } {
  const armorMatch = item.type === cls.armorType;
  const isTier =
    item.type === "TIER_SET" &&
    item.name.toLowerCase().startsWith(cls.tierPrefix.toLowerCase());
  const universal = UNIVERSAL.has(item.type);
  return { allowed: armorMatch || isTier || universal, isTier };
}

export async function validateSRChoice(
  playerId: number,
  lootItemId?: number,
  bossId?: number,
): Promise<
  | { ok: true; isTier: boolean }
  | {
      ok: false;
      code:
        | "PLAYER_NOT_FOUND"
        | "ITEM_NOT_FOUND"
        | "INVALID_ITEM"
        | "INVALID_BOSS";
      message: string;
    }
> {
  // clearing SR is always allowed
  if (!lootItemId) return { ok: true, isTier: false };

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { class: true },
  });
  if (!player)
    return {
      ok: false,
      code: "PLAYER_NOT_FOUND",
      message: "Player not found.",
    };

  const item = await prisma.lootItem.findUnique({ where: { id: lootItemId } });
  if (!item)
    return {
      ok: false,
      code: "ITEM_NOT_FOUND",
      message: "Loot item not found.",
    };

  const { allowed, isTier } = isItemAllowedForClass(player.class, item);
  if (!allowed) {
    return {
      ok: false,
      code: "INVALID_ITEM",
      message: "Selected item is not valid for this class.",
    };
  }

  if (bossId) {
    const link = await prisma.lootDrop.findUnique({
      where: { lootItemId_bossId: { lootItemId, bossId } },
    });
    if (!link) {
      return {
        ok: false,
        code: "INVALID_BOSS",
        message: "Selected boss does not drop this item.",
      };
    }
  }

  return { ok: true, isTier };
}
