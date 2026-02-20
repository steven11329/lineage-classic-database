import { Client, GatewayIntentBits } from 'discord.js';
import type Database from 'better-sqlite3';
import { handleMessage } from './handlers/messageHandler';
import logger from './utils/logger';

/**
 * 初始化並配置 Discord Client
 *
 * @param db 資料庫實例
 * @returns 配置好的 Discord Client
 */
export function initializeClient(db: Database.Database): Client {
  // 建立 Discord Client，設定需要的 Gateway Intents
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds, // 存取伺服器資訊
      GatewayIntentBits.GuildMessages, // 接收伺服器訊息
      GatewayIntentBits.MessageContent, // 讀取訊息內容（需在 Discord Developer Portal 啟用）
    ],
  });

  // 當 bot 準備就緒時觸發
  client.once('clientReady', () => {
    if (client.user) {
      logger.info(`✅ Discord bot 已上線！`);
      logger.info(`📝 登入為: ${client.user.tag}`);
      logger.info(`🤖 Bot ID: ${client.user.id}`);
      logger.info(`🔗 已連接到 ${client.guilds.cache.size} 個伺服器`);
    }
  });

  // 監聽訊息事件
  client.on('messageCreate', async (message) => {
    // 忽略 bot 自己的訊息（避免無限循環）
    if (message.author.bot) {
      return;
    }

    // 檢查訊息是否 mention 了 bot（必須 @ bot 才會回應）
    if (!client.user || !message.mentions.has(client.user.id)) {
      return;
    }

    try {
      await handleMessage(message, db);
    } catch (error) {
      logger.error('❌ 處理訊息時發生錯誤:', error);
      try {
        await message.reply('處理指令時發生錯誤，請稍後再試。');
      } catch (replyError) {
        logger.error('❌ 回覆錯誤訊息失敗:', replyError);
      }
    }
  });

  // 處理錯誤事件
  client.on('error', (error) => {
    logger.error('❌ Discord Client 錯誤:', error);
  });

  // 處理警告事件
  client.on('warn', (warning) => {
    logger.warn('⚠️  Discord Client 警告:', warning);
  });

  return client;
}
