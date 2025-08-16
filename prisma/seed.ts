// prisma/seed.ts
import { PrismaClient, ArmorType } from "@prisma/client";

const prisma = new PrismaClient();

function currentWeekLabelNY() {
  // Build a Date in New York time so the "last Tuesday" math is correct
  const now = new Date();
  const nyNow = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const day = nyNow.getDay(); // 0=Sun ... 2=Tue
  const diff = day >= 2 ? day - 2 : 6 + day; // days since last Tuesday
  const lastTue = new Date(nyNow);
  lastTue.setDate(nyNow.getDate() - diff);

  const label =
    "Week of " +
    lastTue.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  return label;
}

async function main() {
  // Raid
  const raid = await prisma.raid.upsert({
    where: { name: "Manaforge Omega" },
    update: {},
    create: { name: "Manaforge Omega" },
  });

  // Classes
  const classes: Array<{
    name: string;
    armorType: ArmorType;
    tierPrefix: string;
  }> = [
    { name: "Mage", armorType: "CLOTH", tierPrefix: "Mystic" },
    { name: "Priest", armorType: "CLOTH", tierPrefix: "Venerated" },
    { name: "Warlock", armorType: "CLOTH", tierPrefix: "Dreadful" },
    { name: "Druid", armorType: "LEATHER", tierPrefix: "Mystic" },
    { name: "Demon Hunter", armorType: "LEATHER", tierPrefix: "Dreadful" },
    { name: "Monk", armorType: "LEATHER", tierPrefix: "Zenith" },
    { name: "Rogue", armorType: "LEATHER", tierPrefix: "Zenith" },
    { name: "Hunter", armorType: "MAIL", tierPrefix: "Mystic" },
    { name: "Evoker", armorType: "MAIL", tierPrefix: "Zenith" },
    { name: "Shaman", armorType: "MAIL", tierPrefix: "Venerated" },
    { name: "Death Knight", armorType: "PLATE", tierPrefix: "Dreadful" },
    { name: "Paladin", armorType: "PLATE", tierPrefix: "Venerated" },
    { name: "Warrior", armorType: "PLATE", tierPrefix: "Zenith" },
  ];

  for (const c of classes) {
    await prisma.class.upsert({
      where: { name: c.name },
      update: { armorType: c.armorType, tierPrefix: c.tierPrefix },
      create: c,
    });
  }

  // Bosses (use composite unique: raidId + name)
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
      where: { raidId_name: { raidId: raid.id, name } },
      update: {},
      create: { raidId: raid.id, name },
    });
  }

  // Current week
  const label = currentWeekLabelNY();
  await prisma.week.upsert({
    where: { label },
    update: {},
    create: {
      raidId: raid.id,
      label,
      startDate: new Date(),
    },
  });

  console.log(`Seeded: raid, bosses, classes, current week → ${label}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
