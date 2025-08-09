import { PrismaClient, LootType } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

function getCurrentWeekStartNY(): Date {
  const now = DateTime.now().setZone('America/New_York');
  const dow = now.weekday; // Mon=1..Sun=7
  const delta = dow >= 2 ? (dow - 2) : (7 - (2 - dow)); // last Tuesday
  return now.minus({ days: delta }).startOf('day').toJSDate();
}
function formatWeekLabelNY(d: Date): string {
  return 'Week of ' + DateTime.fromJSDate(d).setZone('America/New_York').toFormat('LLL d, yyyy');
}

async function main() {
  // Raid
  const raid = await prisma.raid.upsert({
    where: { name: 'Manaforge Omega' },
    update: {},
    create: { name: 'Manaforge Omega' },
  });

  // Bosses
  const bosses = [
    "Plexus Sentinel",
    "Loom'ithar",
    "Soulbinder Naazindhri",
    "Forgeweaver Araz",
    "The Soul Hunters",
    "Fractillus",
    "Nexus-King Salhadaar",
    "Dimensius, the All-Devouring",
  ];
  for (const name of bosses) {
    await prisma.boss.upsert({
      where: { name },
      update: {},
      create: { name, raidId: raid.id },
    });
  }

  // Classes
  const classes: Array<[string, LootType, string]> = [
    ['Mage', LootType.CLOTH, 'Mystic'],
    ['Priest', LootType.CLOTH, 'Venerated'],
    ['Warlock', LootType.CLOTH, 'Dreadful'],
    ['Druid', LootType.LEATHER, 'Mystic'],
    ['Demon Hunter', LootType.LEATHER, 'Dreadful'],
    ['Monk', LootType.LEATHER, 'Zenith'],
    ['Rogue', LootType.LEATHER, 'Zenith'],
    ['Hunter', LootType.MAIL, 'Mystic'],
    ['Evoker', LootType.MAIL, 'Zenith'],
    ['Shaman', LootType.MAIL, 'Venerated'],
    ['Death Knight', LootType.PLATE, 'Dreadful'],
    ['Paladin', LootType.PLATE, 'Venerated'],
    ['Warrior', LootType.PLATE, 'Zenith'],
  ];
  for (const [name, armorType, tierPrefix] of classes) {
    await prisma.class.upsert({
      where: { name },
      update: {},
      create: { name, armorType, tierPrefix },
    });
  }

  // Current week
  const start = getCurrentWeekStartNY();
  const label = formatWeekLabelNY(start);
  await prisma.week.upsert({
    where: { label },
    update: {},
    create: { raidId: raid.id, label, startDate: start },
  });

  console.log('Seeded: raid, bosses, classes, current week →', label);
}

main().finally(() => prisma.$disconnect());
