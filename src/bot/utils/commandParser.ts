/**
 * 指令類型
 */
export type CommandType = 'queryItem' | 'queryMonster';

/**
 * 解析後的指令
 */
export interface ParsedCommand {
  type: CommandType;
  query?: string; // query 改為可選，因為 updateDatabase 不需要 query
}

/**
 * 解析使用者輸入的指令
 * 支援格式：
 * - "@Bot 查物 [物品名稱]"
 * - "@Bot 查詢 [物品名稱]"（同 查物）
 * - "@Bot 查怪 [怪物名稱]"
 *
 * @param content 使用者訊息內容
 * @returns 解析後的指令，如果不是有效指令則返回 null
 *
 * @example
 * parseCommand("<@123456789> 查物 鑽石") // { type: 'queryItem', query: '鑽石' }
 * parseCommand("<@123456789> 查詢 鑽石") // { type: 'queryItem', query: '鑽石' }
 * parseCommand("<@123456789> 查怪 妖魔") // { type: 'queryMonster', query: '妖魔' }
 * parseCommand("hello") // null
 */
export function parseCommand(content: string): ParsedCommand | null {
  // 移除所有 Discord mention 標記 (<@USER_ID> 或 <@!USER_ID>)
  const trimmedContent = content.replace(/<@!?\d+>/g, '').trim();

  // 查詢物品（偵測 "查物 " 或 "查詢 " 關鍵字）
  if (trimmedContent.startsWith('查物 ') || trimmedContent.startsWith('查詢 ')) {
    const query = trimmedContent.substring(3).trim();
    if (query.length === 0) {
      return null; // 沒有提供查詢內容
    }
    return { type: 'queryItem', query };
  }

  // 查怪（偵測 "查怪 " 關鍵字）
  if (trimmedContent.startsWith('查怪 ')) {
    const query = trimmedContent.substring(3).trim();
    if (query.length === 0) {
      return null; // 沒有提供查詢內容
    }
    return { type: 'queryMonster', query };
  }

  // 不是有效指令
  return null;
}
