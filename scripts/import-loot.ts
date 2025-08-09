// scripts/import-loot.ts
import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { PrismaClient, LootType } from '@prisma/client';

const prisma = new PrismaClient();

// Map CSV "Type" -> Prisma enum
const TYPE_MAP: Record<string, LootType> = {
  'Accessories': 'ACCESSORIES',
  'Cloth': 'CLOTH',
  'Leather': 'LEATHER',
  'Mail': 'MAIL',
  'Plate': 'PLATE',
  'Tier Set': 'TIER_SET',
  'Trinket': 'TRINKET',
  'Weapon': 'WEAPON',
};

type Row = {
  Item: string;
  Type?: string;
  Slot?: string;
  Boss?: string;
};

function detectDelimiter(text: string): ',' | '\t' {
  const firstLine = (text.split(/\r?\n/)[0] ?? '').trim();
  return firstLine.includes('\t') ? '\t' : ',';
}

// DO NOT split on commas (keeps "Dimensius, the All-Devouring" intact).
// If multiple bosses, separate with "/", "|" or "&" in your sheet.
function splitBosses(bossField?: string): string[] {
  if (!bossField) return [];
  return bossField
    .split(/[\/|&]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function cleanName(s: string) {
  return s.trim().replace(/\s+/g, ' ');
}

async function main() {
  const filePath = 'seed/loot_items.csv';
  if (!fs.existsSync(filePath)) {
    console.error(`Missing ${filePath}. Put your CSV/TSV there with headers: Item,Type,Slot,Boss`);
    process.exit(1);
  }

  const text = fs.readFileSync(filePath, 'utf8');
  const delimiter = detectDelimiter(text);

  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
  }) as Row[];

  // Preload bosses (case-insensitive lookup)
  const bosses = await prisma.boss.findMany({ select: { id: true, name: true } });
  const bossByName = new Map(bosses.map((b) => [b.name.toLowerCase(), b]));

  let itemsUpserted = 0;
  let linksCreated = 0;
  let skipped = 0;
  let missingType = 0;
  let rowsWithNoBoss = 0;
  let bossNameMisses = 0;

  for (const r of rows) {
    const nameRaw = r.Item ?? '';
    const name = cleanName(nameRaw);
    if (!name) {
      skipped++;
      continue;
    }

    const tStr = (r.Type ?? '').trim();
    const typeEnum = TYPE_MAP[tStr];
    if (!typeEnum) {
      missingType++;
      console.warn(`Skipping "${name}" — invalid Type "${tStr}" (expected: Accessories/Cloth/Leather/Mail/Plate/Tier Set/Trinket/Weapon)`);
      continue;
    }

    const slot = r.Slot ? cleanName(r.Slot) : null;

    // Upsert item with slot
    const item = await prisma.lootItem.upsert({
      where: { name },
      update: { type: typeEnum, slot },
      create: { name, type: typeEnum, slot },
    });
    itemsUpserted++;

    // Link bosses
    const bossNames = splitBosses(r.Boss);
    if (bossNames.length === 0) {
      rowsWithNoBoss++;
      continue;
    }

    // Clear old links so CSV is source of truth
    await prisma.lootDrop.deleteMany({ where: { lootItemId: item.id } });

    for (const bnRaw of bossNames) {
      const bn = cleanName(bnRaw);
      const found = bossByName.get(bn.toLowerCase());
      if (!found) {
        bossNameMisses++;
        console.warn(`Boss not found for "${name}": "${bn}"`);
        continue;
      }
      await prisma.lootDrop.upsert({
        where: { lootItemId_bossId: { lootItemId: item.id, bossId: found.id } },
        update: {},
        create: { lootItemId: item.id, bossId: found.id },
      });
      linksCreated++;
    }
  }

  console.log(
    `Import done. items≈${itemsUpserted}, links=${linksCreated}, skipped=${skipped}, ` +
      `missingType=${missingType}, rowsWithNoBoss=${rowsWithNoBoss}, bossNameMisses=${bossNameMisses}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
