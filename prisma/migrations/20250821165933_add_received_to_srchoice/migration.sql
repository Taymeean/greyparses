-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SRChoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "lootItemId" INTEGER,
    "bossId" INTEGER,
    "isTier" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "received" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SRChoice_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SRChoice_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SRChoice_lootItemId_fkey" FOREIGN KEY ("lootItemId") REFERENCES "LootItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SRChoice_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "Boss" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SRChoice" ("bossId", "id", "isTier", "locked", "lootItemId", "notes", "playerId", "updatedAt", "weekId") SELECT "bossId", "id", "isTier", "locked", "lootItemId", "notes", "playerId", "updatedAt", "weekId" FROM "SRChoice";
DROP TABLE "SRChoice";
ALTER TABLE "new_SRChoice" RENAME TO "SRChoice";
CREATE INDEX "SRChoice_weekId_idx" ON "SRChoice"("weekId");
CREATE INDEX "SRChoice_playerId_idx" ON "SRChoice"("playerId");
CREATE INDEX "SRChoice_lootItemId_idx" ON "SRChoice"("lootItemId");
CREATE INDEX "SRChoice_bossId_idx" ON "SRChoice"("bossId");
CREATE UNIQUE INDEX "SRChoice_weekId_playerId_key" ON "SRChoice"("weekId", "playerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
