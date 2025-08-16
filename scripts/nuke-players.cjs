// scripts/nuke-players.cjs
/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Usage: node scripts/nuke-players.cjs [all|inactive] [--purge-audit]
const MODE = (process.argv[2] || "all").toLowerCase(); // "all" | "inactive"
const PURGE_AUDIT = process.argv.includes("--purge-audit");

if (!["all", "inactive"].includes(MODE)) {
  console.error(`Usage: node scripts/nuke-players.cjs [all|inactive] [--purge-audit]

  all          Delete ALL players
  inactive     Delete ONLY inactive players
  --purge-audit  Also delete AuditLog rows with targetId='player:<id>'
`);
  process.exit(1);
}

async function main() {
  const wherePlayers = MODE === "inactive" ? { active: false } : {};
  const players = await prisma.player.findMany({
    where: wherePlayers,
    select: { id: true, name: true, active: true },
  });

  if (players.length === 0) {
    console.log("No matching players. Nothing to delete.");
    return;
  }

  const ids = players.map((p) => p.id);
  console.log(
    `Deleting ${players.length} player(s):`,
    players.map((p) => p.name).join(", ") || "(unnamed)",
  );

  await prisma.$transaction(async (tx) => {
    // child tables first
    const s1 = await tx.sRChoice.deleteMany({
      where: { playerId: { in: ids } },
    });
    const s2 = await tx.sRLog.deleteMany({ where: { playerId: { in: ids } } });

    // optional: targeted audit cleanup
    let s3 = { count: 0 };
    if (PURGE_AUDIT) {
      const targets = ids.map((id) => `player:${id}`);
      s3 = await tx.auditLog.deleteMany({
        where: { targetId: { in: targets } },
      });
    }

    // players
    const s4 = await tx.player.deleteMany({ where: { id: { in: ids } } });

    console.log(
      `Deleted: SRChoice=${s1.count}, SRLog=${s2.count}` +
        (PURGE_AUDIT ? `, AuditLog=${s3.count}` : "") +
        `, Player=${s4.count}`,
    );
  });

  // Reset sequences (cosmetic) and vacuum
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM sqlite_sequence WHERE name IN ('SRChoice','SRLog'${PURGE_AUDIT ? ",'AuditLog'" : ""},'Player')`,
    );
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
