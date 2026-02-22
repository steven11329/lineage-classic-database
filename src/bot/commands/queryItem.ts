import type { Message } from 'discord.js';
import { buildItemDropEmbed, buildErrorEmbed } from '../utils/embedBuilder';
import logger from '../utils/logger';
import Database from '../utils/Database';

/**
 * 處理物品查詢指令
 *
 * @param message Discord 訊息物件
 * @param db 資料庫實例
 * @param query 查詢的物品名稱
 */
export async function handleQueryItem(
  message: Message,
  db: Database,
  query: string
): Promise<void> {
  try {
    // 先嘗試完全匹配
    let results = db.queryItemDropsExact(query);

    // 如果沒有結果，嘗試模糊搜尋
    if (results.length === 0) {
      results = db.queryItemDropsFuzzy(query);
    }

    // 建立 Discord Embed 回應
    const embeds = buildItemDropEmbed(query, results);

    // 回覆訊息
    await message.reply({ embeds });
  } catch (error) {
    logger.error('Error in handleQueryItem:', error);
    const errorEmbed = buildErrorEmbed('查詢物品時發生錯誤，請稍後再試。');
    await message.reply({ embeds: [errorEmbed] });
  }
}
