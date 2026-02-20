import type { Message } from 'discord.js';
import type Database from 'better-sqlite3';
import {
  queryMonsterDropsExact,
  queryMonsterDropsFuzzy,
} from '../../database/queries';
import { buildMonsterDropEmbed, buildErrorEmbed } from '../utils/embedBuilder';
import logger from '../utils/logger';

/**
 * 處理怪物查詢指令
 *
 * @param message Discord 訊息物件
 * @param db 資料庫實例
 * @param query 查詢的怪物名稱
 */
export async function handleQueryMonster(
  message: Message,
  db: Database.Database,
  query: string
): Promise<void> {
  try {
    // 先嘗試完全匹配
    let results = queryMonsterDropsExact(db, query);

    // 如果沒有結果，嘗試模糊搜尋
    if (results.length === 0) {
      results = queryMonsterDropsFuzzy(db, query);
    }

    // 建立 Discord Embed 回應
    const embeds = buildMonsterDropEmbed(query, results);

    // 回覆訊息
    await message.reply({ embeds });
  } catch (error) {
    logger.error('Error in handleQueryMonster:', error);
    const errorEmbed = buildErrorEmbed('查詢怪物時發生錯誤，請稍後再試。');
    await message.reply({ embeds: [errorEmbed] });
  }
}
