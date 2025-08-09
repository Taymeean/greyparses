-- AlterTable
ALTER TABLE "LootItem" ADD COLUMN "slot" TEXT;

-- CreateTable
CREATE TABLE "LootDrop" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lootItemId" INTEGER NOT NULL,
    "bossId" INTEGER NOT NULL,
    CONSTRAINT "LootDrop_lootItemId_fkey" FOREIGN KEY ("lootItemId") REFERENCES "LootItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LootDrop_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "Boss" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LootDrop_lootItemId_bossId_key" ON "LootDrop"("lootItemId", "bossId");
