import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import Crawler from '../bot/utils/Crawler';
import logger from '../bot/utils/logger';

/**
 * 更新資料庫（執行爬蟲並寫入資料）
 *
 * @param dbPath 資料庫檔案路徑
 * @returns 更新結果訊息
 */
export async function updateDatabase(dbPath?: string): Promise<string> {
  const resolvedPath =
    dbPath ||
    process.env.DB_PATH ||
    path.join(__dirname, '../db/lineage-classic.db');

  logger.info(`開始更新資料庫: ${resolvedPath}`);

  // 開啟資料庫（讀寫模式）
  const dbDir = path.dirname(resolvedPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(resolvedPath);
  db.pragma('foreign_keys = ON');

  try {
    // 檢查並創建表
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('monster', 'item', 'monster_drops');`
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
        CREATE INDEX idx_monster_drops_item_id ON monster_drops(item_id, monster_id);
      `);
    }

    // 執行爬蟲
    logger.info('開始爬取資料...');
    const crawler = new Crawler({
      loadMonsterPages: 5,
      loadMonsterRows: Number.POSITIVE_INFINITY,
      loadItemPages: 14,
      loadItemRows: Number.POSITIVE_INFINITY,
    });

    logger.info('爬取物品資料...');
    const itemMap = await crawler.scrapingItem();
    logger.info(`成功爬取 ${itemMap.size} 個物品`);

    logger.info('爬取怪物資料...');
    const monsterMap = await crawler.scrapingMonster();
    logger.info(`成功爬取 ${monsterMap.size} 個怪物`);

    // 關聯物品和怪物的掉落資料
    for (const monster of monsterMap.values()) {
      const dropItemIds: Array<string> = [];
      for (const dropItem of monster.dropItems) {
        if (itemMap.has(dropItem)) {
          const item = itemMap.get(dropItem);
          if (item) {
            dropItemIds.push(item.id);
            item.dropFrom.push(monster.id);
          }
        }
      }
      monster.dropItems = dropItemIds;
    }

    // 準備所有 INSERT statements
    const insertItem = db.prepare(`
      INSERT OR REPLACE INTO item (id, name, description, imageUrl, link)
      VALUES (@id, @name, @description, @imageUrl, @link)
    `);

    const insertMonster = db.prepare(`
      INSERT OR REPLACE INTO monster (id, name, imageUrl, link)
      VALUES (@id, @name, @imageUrl, @link)
    `);

    const insertMonsterDrops = db.prepare(`
      INSERT OR REPLACE INTO monster_drops (monster_id, item_id)
      VALUES (@monster_id, @item_id)
    `);

    // 以單一 transaction 執行所有寫入，確保原子性並大幅提升效能
    logger.info('寫入資料到資料庫...');
    const writeAll = db.transaction(() => {
      for (const item of itemMap.values()) {
        insertItem.run({
          id: item.id,
          name: item.name,
          description: item.description ?? null,
          imageUrl: item.imageUrl ?? null,
          link: item.link ?? null,
        });
      }
      logger.info(`已寫入 ${itemMap.size} 個物品`);

      for (const monster of monsterMap.values()) {
        insertMonster.run({
          id: monster.id,
          name: monster.name,
          imageUrl: monster.imageUrl ?? null,
          link: monster.link ?? null,
        });
      }
      logger.info(`已寫入 ${monsterMap.size} 個怪物`);

      db.exec('DELETE FROM monster_drops');

      for (const monster of monsterMap.values()) {
        for (const itemId of monster.dropItems) {
          insertMonsterDrops.run({
            monster_id: monster.id,
            item_id: itemId,
          });
        }
      }
    });

    writeAll();

    db.close();

    const resultMessage = `✅ 資料庫更新完成！\n📦 物品數量: ${itemMap.size}\n👹 怪物數量: ${monsterMap.size}`;
    logger.info(resultMessage);
    return resultMessage;
  } catch (error) {
    db.close();
    const errorMessage = `❌ 資料庫更新失敗: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
}
