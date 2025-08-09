-- CreateTable
CREATE TABLE "Class" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "armorType" TEXT NOT NULL,
    "tierPrefix" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    CONSTRAINT "Player_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Raid" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Boss" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "raidId" INTEGER NOT NULL,
    CONSTRAINT "Boss_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Week" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "raidId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    CONSTRAINT "Week_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LootItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "BossKill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekId" INTEGER NOT NULL,
    "bossId" INTEGER NOT NULL,
    "killed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BossKill_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BossKill_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "Boss" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SRChoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "lootItemId" INTEGER,
    "bossId" INTEGER,
    "isTier" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SRChoice_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SRChoice_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SRChoice_lootItemId_fkey" FOREIGN KEY ("lootItemId") REFERENCES "LootItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SRChoice_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "Boss" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SRLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "lootItemId" INTEGER NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SRLog_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SRLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SRLog_lootItemId_fkey" FOREIGN KEY ("lootItemId") REFERENCES "LootItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "playerId" INTEGER,
    CONSTRAINT "User_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" INTEGER,
    "actorDisplay" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "raidId" INTEGER,
    "weekId" INTEGER,
    "before" JSONB,
    "after" JSONB,
    "meta" JSONB
);

-- CreateIndex
CREATE UNIQUE INDEX "Class_name_key" ON "Class"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Raid_name_key" ON "Raid"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Boss_name_key" ON "Boss"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Week_label_key" ON "Week"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Week_startDate_key" ON "Week"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Week_raidId_startDate_key" ON "Week"("raidId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "LootItem_name_key" ON "LootItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BossKill_weekId_bossId_key" ON "BossKill"("weekId", "bossId");

-- CreateIndex
CREATE UNIQUE INDEX "SRChoice_weekId_playerId_key" ON "SRChoice"("weekId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_playerId_key" ON "User"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_weekId_createdAt_idx" ON "AuditLog"("weekId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
