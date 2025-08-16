PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
);
INSERT INTO _prisma_migrations VALUES('c222cfc2-44a4-4a8b-b817-436f3f9ceb6f','bcb17405ee424cfe027b9f8f3a6290794ef2ab07a9acf428391a339da66a22c2',1754752035858,'20250809150715_init',NULL,NULL,1754752035747,1);
INSERT INTO _prisma_migrations VALUES('a9fa07e1-20af-49c5-af16-aa2cda44f443','7cdc43d39595c482cf8382c4895d1d7df0df13735bcb3b7327e313f7b36896f7',1754758949104,'20250809170229_add_loot_slot_and_drops',NULL,NULL,1754758949084,1);
INSERT INTO _prisma_migrations VALUES('91245af8-6856-434b-85f9-62958bfb8a03','8473a5ad828ca9966fc6931c7ac4ab93e1bd955b178678b225d5851b15e32bff',1754793994995,'20250810024634_player_active_and_audit_enums',NULL,NULL,1754793994808,1);
INSERT INTO _prisma_migrations VALUES('53b971f4-43ec-49b0-8dc9-7004fc7a7abf','1604fe53e4c0605ae3a10b70e1b2824ac56c622e48c45e7c2a89b470224b30e9',NULL,'20250816132051_srlog_step1_add_optional_updated_at',replace('A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250816132051_srlog_step1_add_optional_updated_at\n\nDatabase error code: 2067\n\nDatabase error:\nUNIQUE constraint failed: SRLog.weekId, SRLog.playerId\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250816132051_srlog_step1_add_optional_updated_at"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250816132051_srlog_step1_add_optional_updated_at"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236','\n',char(10)),1755350795542,1755350451371,0);
INSERT INTO _prisma_migrations VALUES('8705c162-c16b-4a33-b902-4f1ec9174004','e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',1755351059574,'20250816132051_srlog_step1_add_optional_updated_at','',NULL,1755351059574,0);
CREATE TABLE IF NOT EXISTS "Class" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "armorType" TEXT NOT NULL,
    "tierPrefix" TEXT NOT NULL
);
INSERT INTO Class VALUES(1,'Mage','CLOTH','Mystic');
INSERT INTO Class VALUES(2,'Priest','CLOTH','Venerated');
INSERT INTO Class VALUES(3,'Warlock','CLOTH','Dreadful');
INSERT INTO Class VALUES(4,'Druid','LEATHER','Mystic');
INSERT INTO Class VALUES(5,'Demon Hunter','LEATHER','Dreadful');
INSERT INTO Class VALUES(6,'Monk','LEATHER','Zenith');
INSERT INTO Class VALUES(7,'Rogue','LEATHER','Zenith');
INSERT INTO Class VALUES(8,'Hunter','MAIL','Mystic');
INSERT INTO Class VALUES(9,'Evoker','MAIL','Zenith');
INSERT INTO Class VALUES(10,'Shaman','MAIL','Venerated');
INSERT INTO Class VALUES(11,'Death Knight','PLATE','Dreadful');
INSERT INTO Class VALUES(12,'Paladin','PLATE','Venerated');
INSERT INTO Class VALUES(13,'Warrior','PLATE','Zenith');
CREATE TABLE IF NOT EXISTS "Raid" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);
INSERT INTO Raid VALUES(1,'Manaforge Omega');
CREATE TABLE IF NOT EXISTS "Boss" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "raidId" INTEGER NOT NULL,
    CONSTRAINT "Boss_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO Boss VALUES(1,'Plexus Sentinel',1);
INSERT INTO Boss VALUES(2,'Loom''ithar',1);
INSERT INTO Boss VALUES(3,'Soulbinder Naazindhri',1);
INSERT INTO Boss VALUES(4,'Forgeweaver Araz',1);
INSERT INTO Boss VALUES(5,'The Soul Hunters',1);
INSERT INTO Boss VALUES(6,'Fractillus',1);
INSERT INTO Boss VALUES(7,'Nexus-King Salhadaar',1);
INSERT INTO Boss VALUES(8,'Dimensius, the All-Devouring',1);
CREATE TABLE IF NOT EXISTS "LootItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL
, "slot" TEXT);
INSERT INTO LootItem VALUES(1,'Band of the Shattered Soul','ACCESSORIES','Accessories: Finger');
INSERT INTO LootItem VALUES(2,'Chrysalis of Sundered Souls','ACCESSORIES','Accessories: Neck');
INSERT INTO LootItem VALUES(3,'Logic Gate: Alpha','ACCESSORIES','Accessories: Finger');
INSERT INTO LootItem VALUES(4,'Logic Gate: Omega','ACCESSORIES','Accessories: Finger');
INSERT INTO LootItem VALUES(5,'Salhadaar''s Folly','ACCESSORIES','Accessories: Neck');
INSERT INTO LootItem VALUES(6,'Bloodwrath''s Gnarled Claws','CLOTH','Cloth Armor: Hands');
INSERT INTO LootItem VALUES(7,'Conjoined Glass Bracers','CLOTH','Cloth Armor: Wrist');
INSERT INTO LootItem VALUES(8,'Forgeweaver''s Journal Holster','CLOTH','Cloth Armor: Waist');
INSERT INTO LootItem VALUES(9,'Frock of Spirit''s Reunion','CLOTH','Cloth Armor: Chest');
INSERT INTO LootItem VALUES(10,'Interloper''s Silken Striders','CLOTH','Cloth Armor: Feet');
INSERT INTO LootItem VALUES(11,'Laced Lair-Steppers','CLOTH','Cloth Armor: Feet');
INSERT INTO LootItem VALUES(12,'Mounted Manacannons','CLOTH','Cloth Armor: Shoulder');
INSERT INTO LootItem VALUES(13,'Sandals of Scarred Servitude','CLOTH','Cloth Armor: Feet');
INSERT INTO LootItem VALUES(14,'Singed Sievecuffs','CLOTH','Cloth Armor: Wrist');
INSERT INTO LootItem VALUES(15,'Singularity Cincture','CLOTH','Cloth Armor: Waist');
INSERT INTO LootItem VALUES(16,'Stellar Navigation Slacks','CLOTH','Cloth Armor: Legs');
INSERT INTO LootItem VALUES(17,'Twilight Tyrant''s Veil','CLOTH','Cloth Armor: Helm');
INSERT INTO LootItem VALUES(18,'Atomic Phasebelt','LEATHER','Leather Armor: Waist');
INSERT INTO LootItem VALUES(19,'Bindings of Lost Essence','LEATHER','Leather Armor: Wrist');
INSERT INTO LootItem VALUES(20,'Darksorrow''s Corrupted Carapace','LEATHER','Leather Armor: Chest');
INSERT INTO LootItem VALUES(21,'Deathbound Shoulderpads','LEATHER','Leather Armor: Shoulder');
INSERT INTO LootItem VALUES(22,'Elite Shadowguard Legwraps','LEATHER','Leather Armor: Legs');
INSERT INTO LootItem VALUES(23,'Interloper''s Reinforced Sandals','LEATHER','Leather Armor: Feet');
INSERT INTO LootItem VALUES(24,'Irradiated Impurity Filter','LEATHER','Leather Armor: Head');
INSERT INTO LootItem VALUES(25,'Kinetic Dunerunners','LEATHER','Leather Armor: Feet');
INSERT INTO LootItem VALUES(26,'Laboratory Test Slippers','LEATHER','Leather Armor: Feet');
INSERT INTO LootItem VALUES(27,'Reaper''s Dreadbelt','LEATHER','Leather Armor: Waist');
INSERT INTO LootItem VALUES(28,'Time-Compressed Wristguards','LEATHER','Leather Armor: Wrist');
INSERT INTO LootItem VALUES(29,'Winged Gamma Handlers','LEATHER','Leather Armor: Hands');
INSERT INTO LootItem VALUES(30,'Arcanotech Wrist-Matrix','MAIL','Mail Armor: Wrist');
INSERT INTO LootItem VALUES(31,'Bite of the Astral Wastes','MAIL','Mail Armor: Helm');
INSERT INTO LootItem VALUES(32,'Chambersieve Waistcoat','MAIL','Mail Armor: Legs');
INSERT INTO LootItem VALUES(33,'Clasp of Furious Freedom','MAIL','Mail Armor: Waist');
INSERT INTO LootItem VALUES(34,'Claws of Failed Resistance','MAIL','Mail Armor: Shoulder');
INSERT INTO LootItem VALUES(35,'Colossal Lifetether','MAIL','Mail Armor: Waist');
INSERT INTO LootItem VALUES(36,'Deathspindle Talons','MAIL','Mail Armor: Feet');
INSERT INTO LootItem VALUES(37,'Greaves of Shattered Space','MAIL','Mail Armor: Feet');
INSERT INTO LootItem VALUES(38,'Harvested Attendant''s Uniform','MAIL','Mail Armor: Mail');
INSERT INTO LootItem VALUES(39,'Interloper''s Chain Boots','MAIL','Mail Armor: Feet');
INSERT INTO LootItem VALUES(40,'Pactbound Vambraces','MAIL','Mail Armor: Wrist');
INSERT INTO LootItem VALUES(41,'Royal Voidscale Gauntlets','MAIL','Mail Armor: Hands');
INSERT INTO LootItem VALUES(42,'Artoshion''s Abyssal Stare','PLATE','Plate Armor: Plate');
INSERT INTO LootItem VALUES(43,'Beacons of False Righteousness','PLATE','Plate Armor: Shoulder');
INSERT INTO LootItem VALUES(44,'Breached Containment Guards','PLATE','Plate Armor: Hands');
INSERT INTO LootItem VALUES(45,'Darkrider Sabatons','PLATE','Plate Armor: Feet');
INSERT INTO LootItem VALUES(46,'Discarded Nutrient Shackles','PLATE','Plate Armor: Wrist');
INSERT INTO LootItem VALUES(47,'Fresh Ethereal Fetters','PLATE','Plate Armor: Waist');
INSERT INTO LootItem VALUES(48,'Interloper''s Plated Sabatons','PLATE','Plate Armor: Feet');
INSERT INTO LootItem VALUES(49,'Manaforged Displacement Chassis','PLATE','Plate Armor: Chest');
INSERT INTO LootItem VALUES(50,'Shrapnel-Fused Legguards','PLATE','Plate Armor: Legs');
INSERT INTO LootItem VALUES(51,'Sterilized Expulsion Boots','PLATE','Plate Armor: Feet');
INSERT INTO LootItem VALUES(52,'Ultradense Fission Girdle','PLATE','Plate Armor: Waist');
INSERT INTO LootItem VALUES(53,'Yoke of Enveloping Hatred','PLATE','Plate Armor: Wrist');
INSERT INTO LootItem VALUES(54,'Dreadful Binding Agent','TIER_SET','Tier: Hands');
INSERT INTO LootItem VALUES(55,'Dreadful Foreboding Beaker','TIER_SET','Tier: Helm');
INSERT INTO LootItem VALUES(56,'Dreadful Silken Offering','TIER_SET','Tier: Legs');
INSERT INTO LootItem VALUES(57,'Dreadful Voidglass Contaminant','TIER_SET','Tier: Chest');
INSERT INTO LootItem VALUES(58,'Dreadful Yearning Cursemark','TIER_SET','Tier: Shoulder');
INSERT INTO LootItem VALUES(59,'Hungering Void Curio','TIER_SET','Tier Set Curio');
INSERT INTO LootItem VALUES(60,'Mystic Binding Agent','TIER_SET','Tier: Hands');
INSERT INTO LootItem VALUES(61,'Mystic Foreboding Beaker','TIER_SET','Tier: Helm');
INSERT INTO LootItem VALUES(62,'Mystic Silken Offering','TIER_SET','Tier: Legs');
INSERT INTO LootItem VALUES(63,'Mystic Voidglass Contaminant','TIER_SET','Tier: Chest');
INSERT INTO LootItem VALUES(64,'Mystic Yearning Cursemark','TIER_SET','Tier: Shoulder');
INSERT INTO LootItem VALUES(65,'Venerated Binding Agent','TIER_SET','Tier: Hands');
INSERT INTO LootItem VALUES(66,'Venerated Foreboding Beaker','TIER_SET','Tier: Helm');
INSERT INTO LootItem VALUES(67,'Venerated Silken Offering','TIER_SET','Tier: Legs');
INSERT INTO LootItem VALUES(68,'Venerated Voidglass Contaminant','TIER_SET','Tier: Chest');
INSERT INTO LootItem VALUES(69,'Venerated Yearning Cursemark','TIER_SET','Tier: Shoulder');
INSERT INTO LootItem VALUES(70,'Zenith Binding Agent','TIER_SET','Tier: Hands');
INSERT INTO LootItem VALUES(71,'Zenith Foreboding Beaker','TIER_SET','Tier: Helm');
INSERT INTO LootItem VALUES(72,'Zenith Silken Offering','TIER_SET','Tier: Legs');
INSERT INTO LootItem VALUES(73,'Zenith Voidglass Contaminant','TIER_SET','Tier: Chest');
INSERT INTO LootItem VALUES(74,'Zenith Yearning Cursemark','TIER_SET','Tier: Shoulder');
INSERT INTO LootItem VALUES(75,'All-Devouring Nucleus','TRINKET','Trinket');
INSERT INTO LootItem VALUES(76,'Araz''s Ritual Forge','TRINKET','Trinket');
INSERT INTO LootItem VALUES(77,'Astral Antenna','TRINKET','Trinket');
INSERT INTO LootItem VALUES(78,'Brand of Ceaseless Ire','TRINKET','Trinket');
INSERT INTO LootItem VALUES(79,'Diamantine Voidcore','TRINKET','Trinket');
INSERT INTO LootItem VALUES(80,'Eradicating Arcanocore','TRINKET','Trinket');
INSERT INTO LootItem VALUES(81,'Loom''ithar''s Living Silk','TRINKET','Trinket');
INSERT INTO LootItem VALUES(82,'Naazindhri''s Mystic Lash','TRINKET','Trinket');
INSERT INTO LootItem VALUES(83,'Nexus-King''s Command','TRINKET','Trinket');
INSERT INTO LootItem VALUES(84,'Perfidious Projector','TRINKET','Trinket');
INSERT INTO LootItem VALUES(85,'Screams of a Forgotten Sky','TRINKET','Trinket');
INSERT INTO LootItem VALUES(86,'Sigil of the Cosmic Hunt','TRINKET','Trinket');
INSERT INTO LootItem VALUES(87,'Soulbinder''s Embrace','TRINKET','Trinket');
INSERT INTO LootItem VALUES(88,'Unyielding Netherprism','TRINKET','Trinket');
INSERT INTO LootItem VALUES(89,'Collapsing Phaseblades','WEAPON','One-Hand: Warglaives');
INSERT INTO LootItem VALUES(90,'Ergospheric Cudgel','WEAPON','One-Hand: Mace');
INSERT INTO LootItem VALUES(91,'Event Horizon','WEAPON','Off-Hand: Shield');
INSERT INTO LootItem VALUES(92,'Factory-Issue Plexhammer','WEAPON','One-Hand: Mace');
INSERT INTO LootItem VALUES(93,'Fractillus'' Last Breath','WEAPON','Held In Off-Hand');
INSERT INTO LootItem VALUES(94,'Iris of the Dark Beyond','WEAPON','Held In Off-Hand');
INSERT INTO LootItem VALUES(95,'Lacerated Current Caster','WEAPON','Ranged: Crossbow');
INSERT INTO LootItem VALUES(96,'Marvel of Technomancy','WEAPON','Two-Hand: Staff');
INSERT INTO LootItem VALUES(97,'Maw of the Void','WEAPON','Two-Hand: Mace');
INSERT INTO LootItem VALUES(98,'Oath-Breaker''s Recompense','WEAPON','One-Hand: Axe');
INSERT INTO LootItem VALUES(99,'Obliteration Beamglaive','WEAPON','Two-Hand: Polearm');
INSERT INTO LootItem VALUES(100,'Overclocked Plexhammer','WEAPON','One-Hand: Mace');
INSERT INTO LootItem VALUES(101,'Photon Sabre Prime','WEAPON','Two-Hand: Sword');
INSERT INTO LootItem VALUES(102,'Piercing Strandbow','WEAPON','Ranged: Bow');
INSERT INTO LootItem VALUES(103,'Prodigious Gene Splicer','WEAPON','One-Hand: Dagger');
INSERT INTO LootItem VALUES(104,'Supermassive Starcrusher','WEAPON','Two-Hand: Mace');
INSERT INTO LootItem VALUES(105,'Unbound Training Claws','WEAPON','One-Hand: Fist Weapon');
INSERT INTO LootItem VALUES(106,'Vengeful Netherspike','WEAPON','One-Hand: Dagger');
INSERT INTO LootItem VALUES(107,'Voidglass Kris','WEAPON','One-Hand: Dagger');
INSERT INTO LootItem VALUES(108,'Voidglass Sovereign''s Blade','WEAPON','One-Hand: Sword');
INSERT INTO LootItem VALUES(109,'Voidglass Spire','WEAPON','Two-Hand: Staff');
INSERT INTO LootItem VALUES(110,'Ward of the Weaving-Beast','WEAPON','Off-Hand: Shield');
CREATE TABLE IF NOT EXISTS "BossKill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekId" INTEGER NOT NULL,
    "bossId" INTEGER NOT NULL,
    "killed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BossKill_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BossKill_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "Boss" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO BossKill VALUES(1,1,3,0);
INSERT INTO BossKill VALUES(9,1,4,0);
INSERT INTO BossKill VALUES(10,1,5,0);
CREATE TABLE IF NOT EXISTS "SRChoice" (
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
INSERT INTO SRChoice VALUES(1,1,1,19,3,0,0,'first pick',1754941851904);
INSERT INTO SRChoice VALUES(4,1,4,23,5,0,0,NULL,1754941851904);
INSERT INTO SRChoice VALUES(5,1,5,75,8,0,0,NULL,1754941851904);
INSERT INTO SRChoice VALUES(6,1,3,34,8,0,0,NULL,1754964265302);
CREATE TABLE IF NOT EXISTS "AuditLog" (
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
INSERT INTO AuditLog VALUES(1,1754761601628,NULL,'anonymous','SR_CHOICE_SET','SR_CHOICE','week:1/player:1',NULL,1,'null','{"lootItemId":19,"bossId":3,"notes":"first pick","isTier":false}',NULL);
INSERT INTO AuditLog VALUES(2,1754761709191,NULL,'anonymous','SR_CHOICE_SET','SR_CHOICE','week:1/player:1',NULL,1,'{"lootItemId":19,"bossId":3,"notes":"first pick","isTier":false}','{"lootItemId":17,"bossId":3,"notes":"first pick","isTier":false}',NULL);
INSERT INTO AuditLog VALUES(3,1754762085845,NULL,'anonymous','SR_CHOICE_SET','SR_CHOICE','week:1/player:1',NULL,1,'{"lootItemId":17,"bossId":3,"notes":"first pick","isTier":false}','{"lootItemId":19,"bossId":3,"notes":"first pick","isTier":false}',NULL);
INSERT INTO AuditLog VALUES(4,1754762359029,NULL,'anonymous','BOSS_KILL_TOGGLED','BOSS_KILL','week:1/boss:3',NULL,1,'null','{"killed":true}',NULL);
INSERT INTO AuditLog VALUES(5,1754762617321,NULL,'anonymous','SR_LOCKED','WEEK','week:1',NULL,1,'null','{"locked":true,"affected":1}','{"affected":1}');
INSERT INTO AuditLog VALUES(6,1754762634103,NULL,'anonymous','BOSS_KILL_TOGGLED','BOSS_KILL','week:1/boss:3',NULL,1,'{"killed":true}','{"killed":true}',NULL);
INSERT INTO AuditLog VALUES(7,1754762841481,NULL,'anonymous','BOSS_KILL_TOGGLED','BOSS_KILL','week:1/boss:3',NULL,1,'{"killed":true}','{"killed":false}',NULL);
INSERT INTO AuditLog VALUES(8,1754762943284,NULL,'anonymous','SR_UNLOCKED_EXCEPT_KILLED','WEEK','week:1',NULL,1,NULL,'{"unlocked":1,"killedBossIds":[]}','{"unlocked":1,"killedBossIds":[]}');
INSERT INTO AuditLog VALUES(9,1754763033169,NULL,'anonymous','SR_LOCKED','WEEK','week:1',NULL,1,'null','{"locked":true,"affected":1}','{"affected":1}');
INSERT INTO AuditLog VALUES(10,1754763040130,NULL,'anonymous','BOSS_KILL_TOGGLED','BOSS_KILL','week:1/boss:3',NULL,1,'{"killed":false}','{"killed":true}',NULL);
INSERT INTO AuditLog VALUES(11,1754763054872,NULL,'anonymous','BOSS_KILL_TOGGLED','BOSS_KILL','week:1/boss:3',NULL,1,'{"killed":true}','{"killed":false}',NULL);
INSERT INTO AuditLog VALUES(12,1754763066998,NULL,'anonymous','BOSS_KILL_TOGGLED','BOSS_KILL','week:1/boss:3',NULL,1,'{"killed":false}','{"killed":true}',NULL);
INSERT INTO AuditLog VALUES(13,1754763073576,NULL,'anonymous','SR_UNLOCKED_EXCEPT_KILLED','WEEK','week:1',NULL,1,NULL,'{"unlocked":0,"killedBossIds":[3]}','{"unlocked":0,"killedBossIds":[3]}');
INSERT INTO AuditLog VALUES(14,1754763085543,NULL,'anonymous','BOSS_KILL_TOGGLED','BOSS_KILL','week:1/boss:3',NULL,1,'{"killed":true}','{"killed":false}',NULL);
INSERT INTO AuditLog VALUES(15,1754763398961,NULL,'anonymous','WEEK_RESET','WEEK','week:1',NULL,1,'{"label":"Week of Aug 5, 2025","choicesCount":1,"killsTrueCount":0}','{"nextWeekId":2,"nextLabel":"Week of Aug 12, 2025","created":true}',NULL);
INSERT INTO AuditLog VALUES(16,1754767212280,NULL,'anonymous','INVITE_CLAIMED','PLAYER','player:2',NULL,NULL,'null','{"name":"Skullblaster","role":"MDPS","classId":7}',NULL);
INSERT INTO AuditLog VALUES(17,1754790084289,NULL,'officer','SR_LOCKED','WEEK','week:1',NULL,1,'null','{"locked":true,"affected":1}','{"affected":1}');
INSERT INTO AuditLog VALUES(18,1754790377409,NULL,'officer','SR_LOCKED','WEEK','week:1',NULL,1,'null','{"locked":true,"affected":1}','{"affected":1}');
INSERT INTO AuditLog VALUES(19,1754790386773,NULL,'officer','BOSS_KILL_TOGGLED','BOSS_KILL','week:1/boss:3',NULL,1,'{"killed":false}','{"killed":true}',NULL);
INSERT INTO AuditLog VALUES(20,1754790394592,NULL,'officer','SR_UNLOCKED_EXCEPT_KILLED','WEEK','week:1',NULL,1,'null','{"unlocked":0,"killedBossIds":[3]}','{"unlocked":0,"killedBossIds":[3]}');
INSERT INTO AuditLog VALUES(21,1754791524991,NULL,'anonymous','INVITE_CLAIMED','PLAYER','player:3',NULL,NULL,'null','{"name":"Tayvok","role":"RDPS","classId":9}',NULL);
INSERT INTO AuditLog VALUES(22,1754794681662,NULL,'anonymous','INVITE_CLAIMED','PLAYER','player:4',NULL,NULL,'null','{"name":"Cryomonk","role":"HEALER","classId":6}',NULL);
INSERT INTO AuditLog VALUES(23,1754794773118,NULL,'officer','SR_CHOICE_SET','SR_CHOICE','week:1/player:4',NULL,1,'null','{"lootItemId":23,"bossId":5,"notes":null,"isTier":false}',NULL);
INSERT INTO AuditLog VALUES(24,1754795806683,NULL,'anonymous','INVITE_CLAIMED','PLAYER','player:5',NULL,NULL,'null','{"name":"Aceofffel","role":"TANK","classId":5}',NULL);
INSERT INTO AuditLog VALUES(25,1754795819705,NULL,'player:Aceofffel','SR_CHOICE_SET','SR_CHOICE','week:1/player:5',NULL,1,'null','{"lootItemId":75,"bossId":8,"notes":null,"isTier":false}',NULL);
INSERT INTO AuditLog VALUES(26,1754941526162,NULL,'officer','BOSS_KILL_TOGGLED','BOSS_KILL','week:1/boss:3',NULL,1,'{"killed":true}','{"killed":false}',NULL);
INSERT INTO AuditLog VALUES(27,1754941607986,NULL,'officer','BOSS_KILL_TOGGLED','BOSS_KILL','week:1/boss:4',NULL,1,'{"killed":false}','{"killed":true}',NULL);
INSERT INTO AuditLog VALUES(28,1754941611562,NULL,'officer','BOSS_KILL_TOGGLED','BOSS_KILL','week:1/boss:4',NULL,1,'{"killed":true}','{"killed":false}',NULL);
INSERT INTO AuditLog VALUES(29,1754941616695,NULL,'officer','BOSS_KILL_TOGGLED','BOSS_KILL','week:1/boss:5',NULL,1,'{"killed":false}','{"killed":true}',NULL);
INSERT INTO AuditLog VALUES(30,1754941847347,NULL,'officer','BOSS_KILL_TOGGLED','BOSS_KILL','week:1/boss:5',NULL,1,'{"killed":true}','{"killed":false}',NULL);
INSERT INTO AuditLog VALUES(31,1754941851994,NULL,'officer','SR_UNLOCKED_EXCEPT_KILLED','WEEK','week:1',NULL,1,'null','{"unlocked":3,"killedBossIds":[]}','{"unlocked":3,"killedBossIds":[]}');
INSERT INTO AuditLog VALUES(32,1754959370134,NULL,'officer','SR_CHOICE_SET','SR_CHOICE','week:1/player:3',NULL,1,'null','{"lootItemId":77,"bossId":2,"notes":null,"isTier":false}',NULL);
INSERT INTO AuditLog VALUES(33,1754960603960,NULL,'officer:Tayvok','SR_CHOICE_SET','SR_CHOICE','week:1/player:3',NULL,1,'{"lootItemId":77,"bossId":2,"notes":null,"isTier":false}','{"lootItemId":76,"bossId":4,"notes":null,"isTier":false}',NULL);
INSERT INTO AuditLog VALUES(34,1754960609806,NULL,'officer:Tayvok','SR_CHOICE_SET','SR_CHOICE','week:1/player:3',NULL,1,'{"lootItemId":76,"bossId":4,"notes":null,"isTier":false}','{"lootItemId":76,"bossId":4,"notes":null,"isTier":false}',NULL);
INSERT INTO AuditLog VALUES(35,1754960614226,NULL,'officer:Tayvok','SR_CHOICE_SET','SR_CHOICE','week:1/player:3',NULL,1,'{"lootItemId":76,"bossId":4,"notes":null,"isTier":false}','{"lootItemId":76,"bossId":4,"notes":null,"isTier":false}',NULL);
INSERT INTO AuditLog VALUES(36,1754964265861,NULL,'officer:Tayvok','SR_CHOICE_SET','SR_CHOICE','week:1/player:3',NULL,1,'{"lootItemId":76,"bossId":4,"notes":null,"isTier":false}','{"lootItemId":34,"bossId":8,"notes":null,"isTier":false}','{"display":"SR: Tayvok • Item: Claws of Failed Resistance • Boss: Dimensius, the All-Devouring","lootItemId":34,"bossId":8,"actorPlayerId":3}');
CREATE TABLE IF NOT EXISTS "LootDrop" (
    "lootItemId" INTEGER NOT NULL,
    "bossId" INTEGER NOT NULL,

    PRIMARY KEY ("lootItemId", "bossId"),
    CONSTRAINT "LootDrop_lootItemId_fkey" FOREIGN KEY ("lootItemId") REFERENCES "LootItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LootDrop_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "Boss" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO LootDrop VALUES(1,8);
INSERT INTO LootDrop VALUES(2,3);
INSERT INTO LootDrop VALUES(3,1);
INSERT INTO LootDrop VALUES(4,4);
INSERT INTO LootDrop VALUES(5,7);
INSERT INTO LootDrop VALUES(6,5);
INSERT INTO LootDrop VALUES(7,6);
INSERT INTO LootDrop VALUES(8,4);
INSERT INTO LootDrop VALUES(9,3);
INSERT INTO LootDrop VALUES(10,5);
INSERT INTO LootDrop VALUES(11,2);
INSERT INTO LootDrop VALUES(12,1);
INSERT INTO LootDrop VALUES(13,7);
INSERT INTO LootDrop VALUES(14,1);
INSERT INTO LootDrop VALUES(15,8);
INSERT INTO LootDrop VALUES(16,8);
INSERT INTO LootDrop VALUES(17,7);
INSERT INTO LootDrop VALUES(18,1);
INSERT INTO LootDrop VALUES(19,3);
INSERT INTO LootDrop VALUES(20,5);
INSERT INTO LootDrop VALUES(21,2);
INSERT INTO LootDrop VALUES(22,7);
INSERT INTO LootDrop VALUES(23,5);
INSERT INTO LootDrop VALUES(24,1);
INSERT INTO LootDrop VALUES(25,6);
INSERT INTO LootDrop VALUES(26,4);
INSERT INTO LootDrop VALUES(27,7);
INSERT INTO LootDrop VALUES(28,8);
INSERT INTO LootDrop VALUES(29,8);
INSERT INTO LootDrop VALUES(30,1);
INSERT INTO LootDrop VALUES(31,6);
INSERT INTO LootDrop VALUES(32,1);
INSERT INTO LootDrop VALUES(33,5);
INSERT INTO LootDrop VALUES(34,8);
INSERT INTO LootDrop VALUES(35,2);
INSERT INTO LootDrop VALUES(36,3);
INSERT INTO LootDrop VALUES(37,8);
INSERT INTO LootDrop VALUES(38,4);
INSERT INTO LootDrop VALUES(39,5);
INSERT INTO LootDrop VALUES(40,7);
INSERT INTO LootDrop VALUES(41,7);
INSERT INTO LootDrop VALUES(42,8);
INSERT INTO LootDrop VALUES(43,7);
INSERT INTO LootDrop VALUES(44,4);
INSERT INTO LootDrop VALUES(45,7);
INSERT INTO LootDrop VALUES(46,2);
INSERT INTO LootDrop VALUES(47,3);
INSERT INTO LootDrop VALUES(48,5);
INSERT INTO LootDrop VALUES(49,1);
INSERT INTO LootDrop VALUES(50,6);
INSERT INTO LootDrop VALUES(51,1);
INSERT INTO LootDrop VALUES(52,8);
INSERT INTO LootDrop VALUES(53,5);
INSERT INTO LootDrop VALUES(54,3);
INSERT INTO LootDrop VALUES(55,4);
INSERT INTO LootDrop VALUES(56,2);
INSERT INTO LootDrop VALUES(57,6);
INSERT INTO LootDrop VALUES(58,5);
INSERT INTO LootDrop VALUES(59,8);
INSERT INTO LootDrop VALUES(60,3);
INSERT INTO LootDrop VALUES(61,4);
INSERT INTO LootDrop VALUES(62,2);
INSERT INTO LootDrop VALUES(63,6);
INSERT INTO LootDrop VALUES(64,5);
INSERT INTO LootDrop VALUES(65,3);
INSERT INTO LootDrop VALUES(66,4);
INSERT INTO LootDrop VALUES(67,2);
INSERT INTO LootDrop VALUES(68,6);
INSERT INTO LootDrop VALUES(69,5);
INSERT INTO LootDrop VALUES(70,3);
INSERT INTO LootDrop VALUES(71,4);
INSERT INTO LootDrop VALUES(72,2);
INSERT INTO LootDrop VALUES(73,6);
INSERT INTO LootDrop VALUES(74,5);
INSERT INTO LootDrop VALUES(75,8);
INSERT INTO LootDrop VALUES(76,4);
INSERT INTO LootDrop VALUES(77,2);
INSERT INTO LootDrop VALUES(78,5);
INSERT INTO LootDrop VALUES(79,6);
INSERT INTO LootDrop VALUES(80,1);
INSERT INTO LootDrop VALUES(81,2);
INSERT INTO LootDrop VALUES(82,3);
INSERT INTO LootDrop VALUES(83,7);
INSERT INTO LootDrop VALUES(84,7);
INSERT INTO LootDrop VALUES(85,8);
INSERT INTO LootDrop VALUES(86,5);
INSERT INTO LootDrop VALUES(87,3);
INSERT INTO LootDrop VALUES(88,6);
INSERT INTO LootDrop VALUES(89,5);
INSERT INTO LootDrop VALUES(90,8);
INSERT INTO LootDrop VALUES(91,5);
INSERT INTO LootDrop VALUES(92,1);
INSERT INTO LootDrop VALUES(93,6);
INSERT INTO LootDrop VALUES(94,4);
INSERT INTO LootDrop VALUES(95,6);
INSERT INTO LootDrop VALUES(96,4);
INSERT INTO LootDrop VALUES(97,7);
INSERT INTO LootDrop VALUES(98,7);
INSERT INTO LootDrop VALUES(99,1);
INSERT INTO LootDrop VALUES(100,1);
INSERT INTO LootDrop VALUES(101,4);
INSERT INTO LootDrop VALUES(102,2);
INSERT INTO LootDrop VALUES(103,2);
INSERT INTO LootDrop VALUES(104,8);
INSERT INTO LootDrop VALUES(105,3);
INSERT INTO LootDrop VALUES(106,7);
INSERT INTO LootDrop VALUES(107,6);
INSERT INTO LootDrop VALUES(108,7);
INSERT INTO LootDrop VALUES(109,3);
INSERT INTO LootDrop VALUES(110,2);
CREATE TABLE IF NOT EXISTS "Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "classId" INTEGER NOT NULL,
    CONSTRAINT "Player_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO Player VALUES(1,'Test Rogue','MDPS',1,7);
INSERT INTO Player VALUES(2,'Skullblaster','MDPS',1,7);
INSERT INTO Player VALUES(3,'Tayvok','RDPS',1,9);
INSERT INTO Player VALUES(4,'Cryomonk','HEALER',1,6);
INSERT INTO Player VALUES(5,'Aceofffel','TANK',1,5);
INSERT INTO Player VALUES(6,'Ithurial','MDPS',1,12);
CREATE TABLE IF NOT EXISTS "Week" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "raidId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Week_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO Week VALUES(1,1,'Week of Aug 5, 2025',1754366400000);
INSERT INTO Week VALUES(2,1,'Week of Aug 12, 2025',1754971200000);
INSERT INTO Week VALUES(3,1,'Week of Aug 4, 2025',1754940002435);
CREATE TABLE IF NOT EXISTS "SRLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "lootItemId" INTEGER NOT NULL,
    "isTier" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    CONSTRAINT "SRLog_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SRLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SRLog_lootItemId_fkey" FOREIGN KEY ("lootItemId") REFERENCES "LootItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO SRLog VALUES(1,1,1,19,0,NULL,'2025-08-10 02:46:34','2025-08-10 02:46:34');
INSERT INTO SRLog VALUES(4,1,4,23,0,NULL,1754794772933,1754794772933);
INSERT INTO SRLog VALUES(5,1,5,75,0,NULL,1754795819449,1754795819449);
INSERT INTO SRLog VALUES(6,1,3,77,0,NULL,1754959369919,1754959369919);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('Raid',1);
INSERT INTO sqlite_sequence VALUES('Boss',8);
INSERT INTO sqlite_sequence VALUES('Class',26);
INSERT INTO sqlite_sequence VALUES('LootItem',110);
INSERT INTO sqlite_sequence VALUES('SRChoice',10);
INSERT INTO sqlite_sequence VALUES('AuditLog',36);
INSERT INTO sqlite_sequence VALUES('BossKill',10);
INSERT INTO sqlite_sequence VALUES('Player',6);
INSERT INTO sqlite_sequence VALUES('Week',3);
INSERT INTO sqlite_sequence VALUES('SRLog',8);
CREATE UNIQUE INDEX "Class_name_key" ON "Class"("name");
CREATE UNIQUE INDEX "Raid_name_key" ON "Raid"("name");
CREATE UNIQUE INDEX "BossKill_weekId_bossId_key" ON "BossKill"("weekId", "bossId");
CREATE UNIQUE INDEX "SRChoice_weekId_playerId_key" ON "SRChoice"("weekId", "playerId");
CREATE INDEX "LootDrop_bossId_idx" ON "LootDrop"("bossId");
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");
CREATE UNIQUE INDEX "Week_label_key" ON "Week"("label");
CREATE INDEX "Week_raidId_idx" ON "Week"("raidId");
CREATE INDEX "AuditLog_weekId_createdAt_id_idx" ON "AuditLog"("weekId", "createdAt", "id");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "Boss_raidId_idx" ON "Boss"("raidId");
CREATE UNIQUE INDEX "Boss_raidId_name_key" ON "Boss"("raidId", "name");
CREATE INDEX "BossKill_weekId_idx" ON "BossKill"("weekId");
CREATE INDEX "BossKill_bossId_idx" ON "BossKill"("bossId");
CREATE INDEX "LootItem_type_idx" ON "LootItem"("type");
CREATE INDEX "LootItem_name_idx" ON "LootItem"("name");
CREATE INDEX "SRChoice_weekId_idx" ON "SRChoice"("weekId");
CREATE INDEX "SRChoice_playerId_idx" ON "SRChoice"("playerId");
CREATE INDEX "SRChoice_lootItemId_idx" ON "SRChoice"("lootItemId");
CREATE INDEX "SRChoice_bossId_idx" ON "SRChoice"("bossId");
CREATE INDEX "SRLog_weekId_idx" ON "SRLog"("weekId");
CREATE INDEX "SRLog_playerId_idx" ON "SRLog"("playerId");
CREATE INDEX "SRLog_lootItemId_idx" ON "SRLog"("lootItemId");
CREATE INDEX "SRLog_createdAt_idx" ON "SRLog"("createdAt");
COMMIT;
