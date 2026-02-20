import type { Message } from 'discord.js';
import { updateDatabase } from '../../database/update';
import { buildErrorEmbed } from '../utils/embedBuilder';
import { EmbedBuilder } from 'discord.js';
import logger from '../utils/logger';

/**
 * 處理更新資料庫指令
 *
 * @param message Discord 訊息物件
 */
export async function handleUpdateDatabase(message: Message): Promise<void> {
  try {
    // 立即回覆，告知開始更新
    const startEmbed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle('🔄 開始更新資料庫')
      .setDescription(
        '正在執行爬蟲程式，更新天堂遊戲資料...\n\n⏳ 這可能需要幾分鐘時間，請稍候。'
      )
      .setTimestamp();

    const reply = await message.reply({ embeds: [startEmbed] });

    // 執行資料庫更新（這會花一些時間）
    logger.info('開始執行資料庫更新...');
    const resultMessage = await updateDatabase();

    // 更新完成後編輯訊息
    const successEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('✅ 資料庫更新完成')
      .setDescription(resultMessage)
      .setTimestamp();

    await reply.edit({ embeds: [successEmbed] });
  } catch (error) {
    logger.error('Error in handleUpdateDatabase:', error);

    // 更新失敗
    const errorEmbed = buildErrorEmbed(
      `更新資料庫時發生錯誤：\n${error instanceof Error ? error.message : '未知錯誤'}`
    );

    try {
      await message.reply({ embeds: [errorEmbed] });
    } catch (replyError) {
      logger.error('Failed to send error message:', replyError);
    }
  }
}
