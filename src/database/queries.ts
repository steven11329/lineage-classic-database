import type Database from 'better-sqlite3';

/**
 * 物品掉落查詢結果
 */
export interface ItemDropResult {
  item_name: string;
  item_image_url: string | null;
  item_link: string | null;
  monster_name: string;
  monster_image_url: string | null;
  monster_link: string | null;
}

/**
 * 怪物掉落查詢結果
 */
export interface MonsterDropResult {
  monster_name: string;
  monster_image_url: string | null;
  monster_link: string | null;
  item_name: string;
  item_image_url: string | null;
  item_link: string | null;
  item_description: string | null;
}

/**
 * 查詢物品從哪些怪物掉落（完全匹配）
 * @param db Database 實例
 * @param itemName 物品名稱
 * @returns 掉落該物品的怪物列表
 */
export function queryItemDropsExact(
  db: Database.Database,
  itemName: string
): ItemDropResult[] {
  const stmt = db.prepare(`
    SELECT
      item.name AS item_name,
      item.imageUrl AS item_image_url,
      item.link AS item_link,
      monster.name AS monster_name,
      monster.imageUrl AS monster_image_url,
      monster.link AS monster_link
    FROM item
    JOIN monster_drops ON item.id = monster_drops.item_id
    JOIN monster ON monster_drops.monster_id = monster.id
    WHERE item.name = ?
    ORDER BY monster.name
  `);

  return stmt.all(itemName) as ItemDropResult[];
}

/**
 * 查詢物品從哪些怪物掉落（模糊搜尋）
 * @param db Database 實例
 * @param itemName 物品名稱（部分匹配）
 * @returns 掉落該物品的怪物列表
 */
export function queryItemDropsFuzzy(
  db: Database.Database,
  itemName: string
): ItemDropResult[] {
  const stmt = db.prepare(`
    SELECT
      item.name AS item_name,
      item.imageUrl AS item_image_url,
      item.link AS item_link,
      monster.name AS monster_name,
      monster.imageUrl AS monster_image_url,
      monster.link AS monster_link
    FROM item
    JOIN monster_drops ON item.id = monster_drops.item_id
    JOIN monster ON monster_drops.monster_id = monster.id
    WHERE item.name LIKE ?
    ORDER BY item.name, monster.name
    LIMIT 100
  `);

  return stmt.all(`%${itemName}%`) as ItemDropResult[];
}

/**
 * 查詢怪物會掉落哪些物品（完全匹配）
 * @param db Database 實例
 * @param monsterName 怪物名稱
 * @returns 該怪物掉落的物品列表
 */
export function queryMonsterDropsExact(
  db: Database.Database,
  monsterName: string
): MonsterDropResult[] {
  const stmt = db.prepare(`
    SELECT
      monster.name AS monster_name,
      monster.imageUrl AS monster_image_url,
      monster.link AS monster_link,
      item.name AS item_name,
      item.imageUrl AS item_image_url,
      item.link AS item_link,
      item.description AS item_description
    FROM monster
    JOIN monster_drops ON monster.id = monster_drops.monster_id
    JOIN item ON monster_drops.item_id = item.id
    WHERE monster.name = ?
    ORDER BY item.name
  `);

  return stmt.all(monsterName) as MonsterDropResult[];
}

/**
 * 查詢怪物會掉落哪些物品（模糊搜尋）
 * @param db Database 實例
 * @param monsterName 怪物名稱（部分匹配）
 * @returns 該怪物掉落的物品列表
 */
export function queryMonsterDropsFuzzy(
  db: Database.Database,
  monsterName: string
): MonsterDropResult[] {
  const stmt = db.prepare(`
    SELECT
      monster.name AS monster_name,
      monster.imageUrl AS monster_image_url,
      monster.link AS monster_link,
      item.name AS item_name,
      item.imageUrl AS item_image_url,
      item.link AS item_link,
      item.description AS item_description
    FROM monster
    JOIN monster_drops ON monster.id = monster_drops.monster_id
    JOIN item ON monster_drops.item_id = item.id
    WHERE monster.name LIKE ?
    ORDER BY monster.name, item.name
    LIMIT 100
  `);

  return stmt.all(`%${monsterName}%`) as MonsterDropResult[];
}
