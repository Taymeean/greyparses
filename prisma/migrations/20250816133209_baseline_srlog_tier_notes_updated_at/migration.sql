/*
  Warnings:

  - Added the required column `updatedAt` to the `SRLog` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SRLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "lootItemId" INTEGER NOT NULL,
    "isTier" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SRLog_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SRLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SRLog_lootItemId_fkey" FOREIGN KEY ("lootItemId") REFERENCES "LootItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SRLog" ("createdAt", "id", "lootItemId", "playerId", "weekId") SELECT "createdAt", "id", "lootItemId", "playerId", "weekId" FROM "SRLog";
DROP TABLE "SRLog";
ALTER TABLE "new_SRLog" RENAME TO "SRLog";
CREATE INDEX "SRLog_weekId_idx" ON "SRLog"("weekId");
CREATE INDEX "SRLog_playerId_idx" ON "SRLog"("playerId");
CREATE INDEX "SRLog_lootItemId_idx" ON "SRLog"("lootItemId");
CREATE INDEX "SRLog_createdAt_idx" ON "SRLog"("createdAt");
CREATE UNIQUE INDEX "SRLog_weekId_playerId_key" ON "SRLog"("weekId", "playerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
