import type { Message } from 'discord.js';
import type Database from 'better-sqlite3';
import { parseCommand } from '../utils/commandParser';
import { handleQueryItem } from '../commands/queryItem';
import { handleQueryMonster } from '../commands/queryMonster';
import { handleUpdateDatabase } from '../commands/updateDatabase';
import logger from '../utils/logger';

/**
 * 處理 Discord 訊息事件
 *
 * @param message Discord 訊息物件
 * @param db 資料庫實例
 */
export async function handleMessage(
  message: Message,
  db: Database.Database
): Promise<void> {
  const content = message.content.trim();

  // 解析指令
  const command = parseCommand(content);

  // 如果不是有效指令，忽略
  if (!command) {
    return;
  }

  // 根據指令類型執行對應的處理器
  switch (command.type) {
    case 'queryItem':
      await handleQueryItem(message, db, command.query!);
      break;
    case 'queryMonster':
      await handleQueryMonster(message, db, command.query!);
      break;
    case 'updateDatabase':
      await handleUpdateDatabase(message);
      break;
    default:
      // 未知的指令類型（理論上不會到這裡）
      logger.warn(`Unknown command type: ${command.type}`);
      break;
  }
}
