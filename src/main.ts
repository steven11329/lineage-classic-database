import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import './Crawler';
import Crawler from './Crawler';
import { Item } from './types';

async function run() {
  const dbPath = path.join(__dirname, './db/lineage-classic.db');
  const dbDir = path.dirname(dbPath);

  // 檢查並創建目錄
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created directory: ${dbDir}`);
  }
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // 檢查表是否存在
  const tables = db
    .prepare(
      `
    SELECT name FROM sqlite_master WHERE type='table' AND name IN ('monster', 'item', 'monster_drops');
  `
    )
    .all() as Array<{ name: string }>;
  const existingTables = new Set(tables.map((table) => table.name));

  if (!existingTables.has('monster')) {
    db.exec(`
      CREATE TABLE monster (
        id TEXT PRIMARY KEY, 
        name TEXT NOT NULL,
        imageUrl TEXT,
        link TEXT
      );
    `);
  }

  if (!existingTables.has('item')) {
    db.exec(`
      CREATE TABLE item (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        imageUrl TEXT,
        link TEXT
      );
    `);
  }

  if (!existingTables.has('monster_drops')) {
    db.exec(`
      CREATE TABLE monster_drops (
        monster_id TEXT,
        item_id TEXT,
        PRIMARY KEY (monster_id, item_id),
        FOREIGN KEY (monster_id) REFERENCES monster (id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES item (id) ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
  }

  // const crawler = new Crawler();
  // const itemMap = await crawler.scrapingItem();
  // const monsterMap = await crawler.scrapingMonster();

  // for (let monster of monsterMap.values()) {
  //   const deopItemIds: Array<string> = [];
  //   for (let dropItem of monster.dropItems) {
  //     if (itemMap.has(dropItem)) {
  //       const item = itemMap.get(dropItem);
  //       if (item) {
  //         deopItemIds.push(item.id);
  //         item.dropFrom.push(monster.id);
  //       }
  //     }
  //   }
  //   monster.dropItems = deopItemIds;
  // }

  // const insertItem = db.prepare(`
  //   INSERT OR REPLACE INTO item (id, name, description, imageUrl, link)
  //   VALUES (@id, @name, @description, @imageUrl, @link)
  // `);

  // for (const item of itemMap.values()) {
  //   insertItem.run({
  //     id: item.id,
  //     name: item.name,
  //     description: item.description ?? null,
  //     imageUrl: item.imageUrl ?? null,
  //     link: item.link ?? null,
  //   });
  // }

  // const insertMonster = db.prepare(`
  //   INSERT OR REPLACE INTO monster (id, name, imageUrl, link)
  //   VALUES (@id, @name, @imageUrl, @link)
  // `);

  // for (const monster of monsterMap.values()) {
  //   insertMonster.run({
  //     id: monster.id,
  //     name: monster.name,
  //     imageUrl: monster.imageUrl ?? null,
  //     link: monster.link ?? null,
  //   });
  // }

  // const insertMonsterDrops = db.prepare(`
  //   INSERT OR REPLACE INTO monster_drops (monster_id, item_id)
  //   VALUES (@monster_id, @item_id)
  // `);

  // for (const monster of monsterMap.values()) {

  //   for (const itemId of monster.dropItems) {
  //     insertMonsterDrops.run({
  //       monster_id: monster.id,
  //       item_id: itemId,
  //     });
  //   }
  // }

  // const stmt = db.prepare(`
  //   SELECT monster.id AS monster_id, monster.name AS monster_name, monster.link AS monster_link, monster.imageUrl AS monster_imageUrl, item.id AS item_id, item.name AS item_name, item.link AS item_link
  //   FROM monster
  //   JOIN monster_drops ON monster.id = monster_drops.monster_id
  //   JOIN item ON monster_drops.item_id = item.id
  //   WHERE monster.name = ?
  // `);

  // const demonItems = stmt.all('妖魔') as Array<{
  //   monster_id: string;
  //   monster_name: string;
  //   monster_imageUrl: string;
  //   monster_link: string;
  //   item_id: string;
  //   item_name: string;
  //   item_link: string;
  // }>;

  // // 分組顯示每個妖魔的掉落物品
  // const groupedByMonster = demonItems.reduce(
  //   (acc, item) => {
  //     if (!acc[item.monster_id]) {
  //       acc[item.monster_id] = {
  //         monster_name: item.monster_name,
  //         monster_link: item.monster_link,
  //         monster_imageUrl: item.monster_imageUrl,
  //         items: [],
  //       };
  //     }
  //     acc[item.monster_id].items.push({
  //       id: item.item_id,
  //       name: item.item_name,
  //       imageUrl: item.monster_imageUrl,
  //       link: item.item_link,
  //     });
  //     return acc;
  //   },
  //   {} as Record<
  //     string,
  //     {
  //       monster_name: string;
  //       monster_link: string;
  //       monster_imageUrl: string;
  //       items: Array<{ id: string; name: string; imageUrl: string; link: string }>;
  //     }
  //   >
  // );

  // console.log('妖魔會掉落的物品:');
  // for (const [monsterId, data] of Object.entries(groupedByMonster)) {
  //   console.log(`Monster ID: ${monsterId}`);
  //   console.log(`Monster Name: ${data.monster_name}`);
  //   console.log(`Monster Image URL: ${data.monster_imageUrl}`);
  //   console.log(`Monster Link: ${data.monster_link}`);
  //   data.items.forEach((item) => {
  //     console.log(`Item ID: ${item.id}`);
  //     console.log(`Item Name: ${item.name}`);
  //     console.log(`Item Link: ${item.link}`);
  //   });
  //   console.log('-------------------------');
  // }

  const itemStmt = db.prepare(`
    SELECT item.name AS item_name, monster.name AS monster_name, monster.imageUrl AS monster_imageUrl, monster.link AS monster_link
    FROM item
    JOIN monster_drops ON item.id = monster_drops.item_id
    JOIN monster ON monster_drops.monster_id = monster.id
    WHERE item.name LIKE ?
  `);

  const partialItemName = '%高品質鑽石%'; // 替換為要模糊查詢的物品名稱
  const monstersDroppingItem = itemStmt.all(partialItemName) as Array<{
    item_name: string;
    monster_name: string;
    monster_imageUrl: string | null;
    monster_link: string | null;
  }>;

  console.log(`模糊查詢物品名稱包含: ${partialItemName}`);
  monstersDroppingItem.forEach((monster) => {
    console.log(`Monster Name: ${monster.monster_name}`);
    console.log(`Monster Image URL: ${monster.monster_imageUrl ?? '無'}`);
    console.log(`Monster Link: ${monster.monster_link ?? '無'}`);
  });

  db.close();
}

run();
