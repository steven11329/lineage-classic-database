import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import logger from '../bot/utils/logger';

let dbInstance: Database.Database | null = null;

/**
 * 初始化資料庫連接
 * @param dbPath 資料庫檔案路徑（選填，預設從環境變數或使用預設路徑）
 * @returns Database 實例
 */
export function initializeDatabase(dbPath?: string): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  // 使用提供的路徑、環境變數或預設路徑
  const resolvedPath =
    dbPath ||
    process.env.DB_PATH ||
    path.join(__dirname, '../db/lineage-classic.db');

  // 檢查 db 資料夾是否存在，不存在則建立
  const dbDir = path.dirname(resolvedPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`Created database directory: ${dbDir}`);
  }

  // 檢查 db 檔案是否存在，不存在則建立空檔案
  if (!fs.existsSync(resolvedPath)) {
    fs.writeFileSync(resolvedPath, '');
    logger.info(`Created empty database file: ${resolvedPath}`);
  }

  logger.info(`Initializing database at: ${resolvedPath}`);

  // // 以唯讀模式開啟資料庫（bot 只查詢，不修改資料）
  // dbInstance = new Database(resolvedPath, { readonly: true });
  dbInstance = new Database(resolvedPath);
  // 設定唯讀模式（額外保護）
  dbInstance.pragma('query_only = ON');

  logger.info('Database initialized successfully');

  return dbInstance;
}

/**
 * 取得資料庫實例
 * @returns Database 實例
 * @throws 如果資料庫尚未初始化
 */
export function getDatabase(): Database.Database {
  if (!dbInstance) {
    throw new Error(
      'Database not initialized. Call initializeDatabase() first.'
    );
  }
  return dbInstance;
}

/**
 * 關閉資料庫連接
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection closed');
  }
}
