/* scripts/import-loot.cjs
   Usage: node scripts/import-loot.cjs seed/loot_items.csv

   CSV headers tolerated (case-insensitive): Item, Type, Slot, Boss
   Multiple bosses per row: use "/", "|" "&" or ";" between names. Do NOT use commas,
   so names like "Dimensius, the All-Devouring" stay intact.
*/

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Normalize CSV "Type" -> Prisma enum (case/space tolerant)
const TYPE_MAP = {
  ACCESSORIES: "ACCESSORIES",
  ACCESSORY: "ACCESSORIES",
  CLOTH: "CLOTH",
  LEATHER: "LEATHER",
  MAIL: "MAIL",
  PLATE: "PLATE",
  "TIER SET": "TIER_SET",
  TIER_SET: "TIER_SET",
  TIER: "TIER_SET",
  TOKEN: "TIER_SET",
  TRINKET: "TRINKET",
  WEAPON: "WEAPON",
};

function normType(s) {
  const key = String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
  return TYPE_MAP[key];
}

function detectDelimiter(text) {
  const firstLine = (text.split(/\r?\n/)[0] || "").trim();
  return firstLine.includes("\t") ? "\t" : ",";
}

// Keep boss names with commas intact
function splitBosses(bossField) {
  if (!bossField) return [];
  return String(bossField)
    .split(/[\/|;&]+/g) // not commas
    .map((s) => s.trim())
    .filter(Boolean);
}

function cleanName(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ");
}

function lowerKeys(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) out[k.toLowerCase()] = v;
  return out;
}

async function main() {
  const csvPath = process.argv[2] || "seed/loot_items.csv";
  const abs = path.resolve(csvPath);
  if (!fs.existsSync(abs)) {
    console.error(
      `File not found: ${abs}\nUsage: node scripts/import-loot.cjs path/to/loot.csv`,
    );
    process.exit(1);
  }

  // Preload bosses for case-insensitive matching
  const bosses = await prisma.boss.findMany({
    select: { id: true, name: true },
  });
  if (bosses.length === 0) {
    console.error("No bosses in DB. Seed Raid/Boss first.");
    process.exit(1);
  }
  const bossByName = new Map(bosses.map((b) => [b.name.toLowerCase(), b]));

  // Read + parse CSV
  const text = fs.readFileSync(abs, "utf8");
  const delimiter = detectDelimiter(text);
  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
  });

  let itemsUpserted = 0;
  let linksCreated = 0;
  let skipped = 0;
  let missingType = 0;
  let rowsWithNoBoss = 0;
  let bossNameMisses = 0;

  for (const row of rows) {
    const r = lowerKeys(row);
    const name = cleanName(r.item);
    if (!name) {
      skipped++;
      continue;
    }

    const typeEnum = normType(r.type);
    if (!typeEnum) {
      missingType++;
      console.warn(`Skipping "${name}" — invalid Type "${r.type ?? ""}"`);
      continue;
    }

    const slot = r.slot ? cleanName(r.slot) : null;
    const bossNames = splitBosses(r.boss);

    // Find-or-create LootItem by non-unique name
    const existing = await prisma.lootItem.findFirst({ where: { name } });
    const item = existing
      ? await prisma.lootItem.update({
          where: { id: existing.id },
          data: { type: typeEnum, slot },
          select: { id: true },
        })
      : await prisma.lootItem.create({
          data: { name, type: typeEnum, slot },
          select: { id: true },
        });
    itemsUpserted++;

    if (bossNames.length === 0) {
      rowsWithNoBoss++;
      continue;
    }

    // CSV is source of truth for this item: clear existing links
    await prisma.lootDrop.deleteMany({ where: { lootItemId: item.id } });

    // Build pairs for this item
    const pairs = [];
    for (const bnRaw of bossNames) {
      const bn = cleanName(bnRaw);
      const found = bossByName.get(bn.toLowerCase());
      if (!found) {
        bossNameMisses++;
        console.warn(`Boss not found for "${name}": "${bn}"`);
        continue;
      }
      pairs.push({ lootItemId: item.id, bossId: found.id });
    }

    if (pairs.length) {
      // Deduplicate and insert (Prisma v6 has no skipDuplicates)
      const unique = [];
      const seen = new Set();
      for (const p of pairs) {
        const key = `${p.lootItemId}:${p.bossId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(p);
      }
      await prisma.lootDrop.createMany({ data: unique });
      linksCreated += unique.length;
    }
  }

  console.log(
    `Import complete: items=${itemsUpserted}, links=${linksCreated}, skipped=${skipped}, ` +
      `missingType=${missingType}, rowsWithNoBoss=${rowsWithNoBoss}, bossNameMisses=${bossNameMisses}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
