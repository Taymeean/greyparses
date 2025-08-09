// src/lib/lootFilter.ts
import type { LootItem, Class as ClassRow, LootType } from '@prisma/client';

const UNIVERSAL = new Set<LootType>(['ACCESSORIES', 'TRINKET', 'WEAPON']);

export function filterLootForClass(cls: ClassRow, items: LootItem[]): LootItem[] {
  return items
    .filter((it) => {
      if (UNIVERSAL.has(it.type)) return true;                 // Accessories/Trinket/Weapon
      if (it.type === cls.armorType) return true;               // Cloth/Leather/Mail/Plate
      if (it.type === 'TIER_SET') {                             // Tier Set + name starts with prefix
        return it.name.toLowerCase().startsWith(cls.tierPrefix.toLowerCase());
      }
      return false;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
