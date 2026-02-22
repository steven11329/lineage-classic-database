import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import logger from './logger';
import { ItemDropResult, MonsterDropResult } from '../../types';

export default class Database {
  private _db: BetterSqlite3.Database | null = null;

  constructor(options: { dbPath: string; isReadOnly?: boolean }) {
    const { dbPath, isReadOnly } = options;
    this._initialize(dbPath, isReadOnly);
  }

  /**
   * 初始化資料庫連接
   * @param dbPath 資料庫檔案路徑（選填，預設從環境變數或使用預設路徑）
   * @returns BetterSqlite3.Database 實例
   */
  private _initialize(
    dbPath: string,
    isReadOnly: boolean = true
  ): BetterSqlite3.Database {
    if (this._db) {
      return this._db;
    }

    // 檢查 db 資料夾是否存在，不存在則建立
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info(`Created database directory: ${dbDir}`);
    }

    // 檢查 db 檔案是否存在，不存在則建立空檔案
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, '');
      logger.info(`Created empty database file: ${dbPath}`);
    }

    logger.info(`Initializing database at: ${dbPath}`);

    this._db = new BetterSqlite3(dbPath, { readonly: isReadOnly });
    this._db.pragma('foreign_keys = ON');
    // 設定唯讀模式（額外保護）
    if (isReadOnly) {
      this._db.pragma('query_only = ON');
    } else {
      // 檢查並創建表
      const tables = this._db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('monster', 'item', 'monster_drops');`
        )
        .all() as Array<{ name: string }>;
      const existingTables = new Set(tables.map((table) => table.name));
      this._createDatabase(existingTables);
    }

    logger.info('Database initialized successfully');

    return this._db;
  }

  private _createDatabase(existingTables: Set<string>): void {
    if (!this._db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    // Migration: drop monster_drops if columns are missing or PK doesn't include is_blessed/is_cursed
    if (existingTables.has('monster_drops')) {
      const columns = this._db
        .prepare('PRAGMA table_info(monster_drops)')
        .all() as Array<{ name: string; pk: number }>;
      const columnNames = new Set(columns.map((c) => c.name));
      const pkColumnNames = new Set(columns.filter((c) => c.pk > 0).map((c) => c.name));
      if (
        !columnNames.has('is_blessed') ||
        !columnNames.has('is_cursed') ||
        !pkColumnNames.has('is_blessed') ||
        !pkColumnNames.has('is_cursed')
      ) {
        this._db.exec('DROP TABLE IF EXISTS monster_drops');
        existingTables.delete('monster_drops');
      }
    }

    if (!existingTables.has('monster')) {
      this._db.exec(`
        CREATE TABLE monster (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          imageUrl TEXT,
          link TEXT,
          level INTEGER
        );
        CREATE INDEX idx_monster_name ON monster(name);
        CREATE INDEX idx_monster_level_name ON monster(level, name);
      `);
    } else {
      this._db.exec(`
        CREATE INDEX IF NOT EXISTS idx_monster_name ON monster(name);
        CREATE INDEX IF NOT EXISTS idx_monster_level_name ON monster(level, name);
      `);
    }

    if (!existingTables.has('item')) {
      this._db.exec(`
        CREATE TABLE item (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          imageUrl TEXT,
          link TEXT
        );
        CREATE INDEX idx_item_name ON item(name);
      `);
    } else {
      this._db.exec(`CREATE INDEX IF NOT EXISTS idx_item_name ON item(name);`);
    }

    if (!existingTables.has('monster_drops')) {
      this._db.exec(`
        CREATE TABLE monster_drops (
          monster_id TEXT,
          item_id TEXT,
          is_blessed INTEGER NOT NULL DEFAULT 0,
          is_cursed INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (monster_id, item_id, is_blessed, is_cursed),
          FOREIGN KEY (monster_id) REFERENCES monster (id) ON UPDATE CASCADE ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES item (id) ON UPDATE CASCADE ON DELETE CASCADE
        );
        CREATE INDEX idx_monster_drops_item_id ON monster_drops(item_id, monster_id);
      `);
    }
  }

  /**
   * 關閉資料庫連接
   */
  close(): void {
    if (this._db) {
      this._db.close();
      this._db = null;
      logger.info('Database connection closed');
    }
  }

  /**
   * UPSERT monster_drops 資料一筆
   */
  upsertMonsterDrop(
    monsterId: string,
    itemId: string,
    isBlessed: boolean,
    isCursed: boolean
  ): void {
    const db = this._db;
    if (!db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO monster_drops (monster_id, item_id, is_blessed, is_cursed)
      VALUES (@monster_id, @item_id, @is_blessed, @is_cursed)
    `);
    stmt.run({
      monster_id: monsterId,
      item_id: itemId,
      is_blessed: isBlessed ? 1 : 0,
      is_cursed: isCursed ? 1 : 0,
    });
  }

  /**
   * UPSERT item 資料一筆
   */
  upsertItem(
    id: string,
    name: string,
    description: string | null,
    imageUrl: string,
    link: string
  ): void {
    const db = this._db;
    if (!db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO item (id, name, description, imageUrl, link)
      VALUES (@id, @name, @description, @imageUrl, @link)
    `);
    stmt.run({ id, name, description, imageUrl, link });
  }

  /**
   * UPSERT monster 資料一筆
   */
  upsertMonster(info: {
    id: string;
    name: string;
    imageUrl: string;
    link: string;
    level: number;
  }): void {
    const db = this._db;
    if (!db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO monster (id, name, imageUrl, link, level)
      VALUES (@id, @name, @imageUrl, @link, @level)
    `);
    stmt.run(info);
  }

  /**
   * 查詢物品（完全匹配）
   * @param itemName 物品名稱
   * @returns 物品列表
   */
  queryItemsExact(itemName: string): { id: string; name: string }[] {
    const db = this._db;
    if (!db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    const stmt = db.prepare(`SELECT id, name FROM item WHERE item.name = ?`);

    return stmt.all(itemName) as { id: string; name: string }[];
  }

  /**
   * 查詢物品從哪些怪物掉落（完全匹配）
   * @param itemName 物品名稱
   * @returns 掉落該物品的怪物列表
   */
  queryItemDropsExact(itemName: string): ItemDropResult[] {
    const db = this._db;
    if (!db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    const stmt = db.prepare(`
      SELECT
        item.name AS item_name,
        item.imageUrl AS item_image_url,
        item.link AS item_link,
        monster.name AS monster_name,
        monster.imageUrl AS monster_image_url,
        monster.link AS monster_link,
        monster.level AS monster_level,
        monster_drops.is_blessed,
        monster_drops.is_cursed
      FROM item
      JOIN monster_drops ON item.id = monster_drops.item_id
      JOIN monster ON monster_drops.monster_id = monster.id
      WHERE item.name = ?
      ORDER BY monster.level ASC, monster.name ASC
      LIMIT 100
    `);

    return stmt.all(itemName) as ItemDropResult[];
  }

  /**
   * 查詢物品從哪些怪物掉落（模糊搜尋）
   * @param itemName 物品名稱（部分匹配）
   * @returns 掉落該物品的怪物列表
   */
  queryItemDropsFuzzy(itemName: string): ItemDropResult[] {
    const db = this._db;
    if (!db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    const stmt = db.prepare(`
      SELECT
        item.name AS item_name,
        item.imageUrl AS item_image_url,
        item.link AS item_link,
        monster.name AS monster_name,
        monster.imageUrl AS monster_image_url,
        monster.link AS monster_link,
        monster.level AS monster_level,
        monster_drops.is_blessed,
        monster_drops.is_cursed
      FROM item
      JOIN monster_drops ON item.id = monster_drops.item_id
      JOIN monster ON monster_drops.monster_id = monster.id
      WHERE item.name LIKE ?
      ORDER BY item.name ASC, monster.level ASC, monster.name ASC
      LIMIT 100
    `);

    return stmt.all(`%${itemName}%`) as ItemDropResult[];
  }

  /**
   * 查詢怪物會掉落哪些物品（完全匹配）
   * @param monsterName 怪物名稱
   * @returns 該怪物掉落的物品列表
   */
  queryMonsterDropsExact(monsterName: string): MonsterDropResult[] {
    const db = this._db;
    if (!db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    const stmt = db.prepare(`
      SELECT
        monster.name AS monster_name,
        monster.imageUrl AS monster_image_url,
        monster.link AS monster_link,
        monster.level AS monster_level,
        item.name AS item_name,
        item.imageUrl AS item_image_url,
        item.link AS item_link,
        item.description AS item_description,
        monster_drops.is_blessed,
        monster_drops.is_cursed
      FROM monster
      JOIN monster_drops ON monster.id = monster_drops.monster_id
      JOIN item ON monster_drops.item_id = item.id
      WHERE monster.name = ?
      ORDER BY item.name ASC
      LIMIT 100
    `);

    return stmt.all(monsterName) as MonsterDropResult[];
  }

  /**
   * 查詢怪物會掉落哪些物品（模糊搜尋）
   * @param monsterName 怪物名稱（部分匹配）
   * @returns 該怪物掉落的物品列表
   */
  queryMonsterDropsFuzzy(monsterName: string): MonsterDropResult[] {
    const db = this._db;
    if (!db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    const stmt = db.prepare(`
      SELECT
        monster.name AS monster_name,
        monster.imageUrl AS monster_image_url,
        monster.link AS monster_link,
        monster.level AS monster_level,
        item.name AS item_name,
        item.imageUrl AS item_image_url,
        item.link AS item_link,
        item.description AS item_description,
        monster_drops.is_blessed,
        monster_drops.is_cursed
      FROM monster
      JOIN monster_drops ON monster.id = monster_drops.monster_id
      JOIN item ON monster_drops.item_id = item.id
      WHERE monster.name LIKE ?
      ORDER BY monster.name ASC, item.name ASC
      LIMIT 100
    `);

    return stmt.all(`%${monsterName}%`) as MonsterDropResult[];
  }
}
