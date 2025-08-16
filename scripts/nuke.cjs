// scripts/nuke.cjs
/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MODE = (process.argv[2] || "").toLowerCase(); // "logs" | "week" | "all"

if (!["logs", "week", "all"].includes(MODE)) {
  console.error(`Usage: node scripts/nuke.cjs [logs|week|all]

  logs  = delete AuditLog + SRLog only
  week  = delete SRChoice + BossKill + Week + AuditLog + SRLog
  all   = delete SRChoice + BossKill + Week + AuditLog + SRLog + (optionally invites if you add a model)
`);
  process.exit(1);
}

async function main() {
  console.log(`Nuking mode: ${MODE}`);

  if (MODE === "logs") {
    const a = await prisma.auditLog.deleteMany({});
    const s = await prisma.sRLog.deleteMany({});
    console.log(`Deleted: auditLog=${a.count}, sRLog=${s.count}`);
  }

  if (MODE === "week") {
    // children first, then parent tables
    const s1 = await prisma.sRChoice.deleteMany({});
    const s2 = await prisma.bossKill.deleteMany({});
    const s3 = await prisma.auditLog.deleteMany({});
    const s4 = await prisma.sRLog.deleteMany({});
    const s5 = await prisma.week.deleteMany({});
    console.log(
      `Deleted: sRChoice=${s1.count}, bossKill=${s2.count}, auditLog=${s3.count}, sRLog=${s4.count}, week=${s5.count}`,
    );
  }

  if (MODE === "all") {
    // Full non-structural wipe. Keeps raids/bosses/classes/loot/players.
    const s1 = await prisma.sRChoice.deleteMany({});
    const s2 = await prisma.bossKill.deleteMany({});
    const s3 = await prisma.auditLog.deleteMany({});
    const s4 = await prisma.sRLog.deleteMany({});
    const s5 = await prisma.week.deleteMany({});
    console.log(
      `Deleted: sRChoice=${s1.count}, bossKill=${s2.count}, auditLog=${s3.count}, sRLog=${s4.count}, week=${s5.count}`,
    );
  }

  // Optional: reset autoincrement counters in SQLite so IDs start small.
  // This is cosmetic; safe to skip if sqlite_sequence doesn't exist.
  try {
    const tables =
      MODE === "logs"
        ? ["AuditLog", "SRLog"]
        : ["SRChoice", "BossKill", "AuditLog", "SRLog", "Week"];
    const names = tables.map((t) => `'${t}'`).join(",");
    await prisma.$executeRawUnsafe(
      `DELETE FROM sqlite_sequence WHERE name IN (${names})`,
    );
    // Vacuum to reclaim file space. No-op if using WAL mode.
    await prisma.$executeRawUnsafe(`VACUUM`);
    console.log("Reset sequences and vacuumed.");
  } catch (e) {
    console.warn("Sequence reset skipped:", e?.message || e);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
