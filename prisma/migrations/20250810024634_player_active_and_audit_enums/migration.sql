/*
  Warnings:

  - You are about to drop the `Invite` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - The primary key for the `LootDrop` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `LootDrop` table. All the data in the column will be lost.
  - You are about to drop the column `at` on the `SRLog` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[raidId,name]` on the table `Boss` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "AuditLog_targetType_targetId_idx";

-- DropIndex
DROP INDEX "AuditLog_weekId_createdAt_idx";

-- DropIndex
DROP INDEX "AuditLog_createdAt_idx";

-- DropIndex
DROP INDEX "Boss_name_key";

-- DropIndex
DROP INDEX "Invite_token_key";

-- DropIndex
DROP INDEX "LootItem_name_key";

-- DropIndex
DROP INDEX "Session_token_key";

-- DropIndex
DROP INDEX "User_playerId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Invite";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Session";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "User";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LootDrop" (
    "lootItemId" INTEGER NOT NULL,
    "bossId" INTEGER NOT NULL,

    PRIMARY KEY ("lootItemId", "bossId"),
    CONSTRAINT "LootDrop_lootItemId_fkey" FOREIGN KEY ("lootItemId") REFERENCES "LootItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LootDrop_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "Boss" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LootDrop" ("bossId", "lootItemId") SELECT "bossId", "lootItemId" FROM "LootDrop";
DROP TABLE "LootDrop";
ALTER TABLE "new_LootDrop" RENAME TO "LootDrop";
CREATE INDEX "LootDrop_bossId_idx" ON "LootDrop"("bossId");
CREATE TABLE "new_Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "classId" INTEGER NOT NULL,
    CONSTRAINT "Player_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("classId", "id", "name", "role") SELECT "classId", "id", "name", "role" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");
CREATE TABLE "new_SRLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "lootItemId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SRLog_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SRLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SRLog_lootItemId_fkey" FOREIGN KEY ("lootItemId") REFERENCES "LootItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SRLog" ("id", "lootItemId", "playerId", "weekId") SELECT "id", "lootItemId", "playerId", "weekId" FROM "SRLog";
DROP TABLE "SRLog";
ALTER TABLE "new_SRLog" RENAME TO "SRLog";
CREATE INDEX "SRLog_weekId_idx" ON "SRLog"("weekId");
CREATE INDEX "SRLog_playerId_idx" ON "SRLog"("playerId");
CREATE INDEX "SRLog_lootItemId_idx" ON "SRLog"("lootItemId");
CREATE TABLE "new_Week" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "raidId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Week_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Week" ("id", "label", "raidId", "startDate") SELECT "id", "label", "raidId", "startDate" FROM "Week";
DROP TABLE "Week";
ALTER TABLE "new_Week" RENAME TO "Week";
CREATE UNIQUE INDEX "Week_label_key" ON "Week"("label");
CREATE INDEX "Week_raidId_idx" ON "Week"("raidId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AuditLog_weekId_createdAt_id_idx" ON "AuditLog"("weekId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "Boss_raidId_idx" ON "Boss"("raidId");

-- CreateIndex
CREATE UNIQUE INDEX "Boss_raidId_name_key" ON "Boss"("raidId", "name");

-- CreateIndex
CREATE INDEX "BossKill_weekId_idx" ON "BossKill"("weekId");

-- CreateIndex
CREATE INDEX "BossKill_bossId_idx" ON "BossKill"("bossId");

-- CreateIndex
CREATE INDEX "LootItem_type_idx" ON "LootItem"("type");

-- CreateIndex
CREATE INDEX "LootItem_name_idx" ON "LootItem"("name");

-- CreateIndex
CREATE INDEX "SRChoice_weekId_idx" ON "SRChoice"("weekId");

-- CreateIndex
CREATE INDEX "SRChoice_playerId_idx" ON "SRChoice"("playerId");

-- CreateIndex
CREATE INDEX "SRChoice_lootItemId_idx" ON "SRChoice"("lootItemId");

-- CreateIndex
CREATE INDEX "SRChoice_bossId_idx" ON "SRChoice"("bossId");
