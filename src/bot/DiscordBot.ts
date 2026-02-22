import { config } from 'dotenv';
import { initializeClient } from './client';
import Database from './utils/Database';
import logger from './utils/logger';

// 載入環境變數
config();

export default class DiscordBot {
  private _db: Database | null = null;

  /**
   * 啟動 Discord bot
   */
  async startBot() {
    try {
      logger.info('🚀 啟動 Discord bot...');

      // 驗證環境變數
      if (!process.env.DISCORD_TOKEN) {
        throw new Error(
          '❌ DISCORD_TOKEN 未設定！請在 .env 檔案中設定 Discord bot token。'
        );
      }

      // 初始化資料庫
      logger.info('📂 初始化資料庫...');
      const db = new Database({
        dbPath: process.env.DB_PATH || './dist/db/lineage-classic.db',
        isReadOnly: true,
      });
      this._db = db;

      // 初始化 Discord Client
      logger.info('🔧 初始化 Discord Client...');
      const client = initializeClient(db);

      // 登入 Discord
      logger.info('🔑 正在登入 Discord...');
      await client.login(process.env.DISCORD_TOKEN);

      logger.info('✅ Discord bot 啟動完成！');
      logger.info(
        '💡 提示：在 Discord 輸入 "查詢 物品名稱" 或 "查怪 怪物名稱" 來使用'
      );
    } catch (error) {
      logger.error('❌ 啟動 Discord bot 失敗:', error);
      process.exit(1);
    }

    // 處理未捕獲的 Promise rejection
    process.on('unhandledRejection', (error) => {
      logger.error('❌ 未處理的 Promise rejection:', error);
    });

    // 處理 Ctrl+C (SIGINT)
    process.on('SIGINT', () => {
      logger.info('\n⚠️  收到 SIGINT 信號，正在關閉...');
      this._db?.close();
      logger.info('👋 Discord bot 已關閉');
      process.exit(0);
    });

    // 處理 SIGTERM
    process.on('SIGTERM', () => {
      logger.info('\n⚠️  收到 SIGTERM 信號，正在關閉...');
      this._db?.close();
      logger.info('👋 Discord bot 已關閉');
      process.exit(0);
    });
  }
}
