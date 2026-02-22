import { EmbedBuilder } from 'discord.js';
import type { ItemDropResult, MonsterDropResult } from '../../types';

const DESC_LIMIT = 4000; // Discord description 上限 4096，保留 buffer

/**
 * 建立物品掉落查詢的 Discord Embed
 *
 * @param itemName 查詢的物品名稱
 * @param results 查詢結果
 * @returns Discord Embed 陣列（可能包含多個 embed）
 */
export function buildItemDropEmbed(
  itemName: string,
  results: ItemDropResult[]
): EmbedBuilder[] {
  if (results.length === 0) {
    return [
      new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('查詢結果')
        .setDescription(`找不到物品 **${itemName}** 的掉落資訊。`)
        .setTimestamp(),
    ];
  }

  // 按物品分組（支援模糊搜尋可能匹配多個物品）
  const groupedByItem = results.reduce(
    (acc, result) => {
      if (!acc[result.item_name]) {
        acc[result.item_name] = {
          imageUrl: result.item_image_url,
          link: result.item_link,
          monsters: [],
        };
      }
      acc[result.item_name].monsters.push({
        name: result.monster_name,
        link: result.monster_link,
        level: result.monster_level,
        isBlessed: result.is_blessed === 1,
        isCursed: result.is_cursed === 1,
      });
      return acc;
    },
    {} as Record<
      string,
      {
        imageUrl: string | null;
        link: string | null;
        monsters: Array<{
          name: string;
          link: string | null;
          level: number | null;
          isBlessed: boolean;
          isCursed: boolean;
        }>;
      }
    >
  );

  const embeds: EmbedBuilder[] = [];

  for (const [name, data] of Object.entries(groupedByItem)) {
    const embed = new EmbedBuilder()
      .setColor(0x00ae86) // 綠色
      .setTitle(`📦 ${name}`)
      .setTimestamp();

    if (data.link) {
      embed.setURL(data.link);
    }

    if (data.imageUrl) {
      embed.setThumbnail(data.imageUrl);
    }

    // 建立掉落怪物條列清單
    const lines: string[] = ['掉落怪物：'];
    let truncated = false;

    for (const monster of data.monsters) {
      // 查物視角：怪物掉落該物品，祝福/詛咒作後綴
      const levelStr = monster.level != null ? ` Lv${monster.level}` : '';
      const suffix = monster.isBlessed ? ' (祝福的)' : monster.isCursed ? ' (詛咒的)' : '';
      const line = monster.link
        ? `- [${monster.name}](${monster.link})${levelStr}${suffix}`
        : `- ${monster.name}${levelStr}${suffix}`;

      if (lines.join('\n').length + line.length + 1 > DESC_LIMIT) {
        truncated = true;
        break;
      }
      lines.push(line);
    }

    embed.setDescription(lines.join('\n'));

    if (truncated) {
      embed.setFooter({ text: `僅顯示部分結果，共 ${data.monsters.length} 個怪物` });
    }

    embeds.push(embed);
  }

  // Discord 一次最多送 10 個 embeds
  return embeds.slice(0, 10);
}

/**
 * 建立怪物掉落查詢的 Discord Embed
 *
 * @param monsterName 查詢的怪物名稱
 * @param results 查詢結果
 * @returns Discord Embed 陣列（可能包含多個 embed）
 */
export function buildMonsterDropEmbed(
  monsterName: string,
  results: MonsterDropResult[]
): EmbedBuilder[] {
  if (results.length === 0) {
    return [
      new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('查詢結果')
        .setDescription(`找不到怪物 **${monsterName}** 的掉落資訊。`)
        .setTimestamp(),
    ];
  }

  // 按怪物分組（支援模糊搜尋可能匹配多個怪物）
  // 以 monster_link 作為唯一鍵（同名但不同 ID 的怪物會有不同連結）
  const groupedByMonster = results.reduce(
    (acc, result) => {
      const key = result.monster_link ?? `${result.monster_name}|${result.monster_level}`;
      if (!acc[key]) {
        acc[key] = {
          name: result.monster_name,
          imageUrl: result.monster_image_url,
          link: result.monster_link,
          level: result.monster_level,
          items: [],
        };
      }
      acc[key].items.push({
        name: result.item_name,
        link: result.item_link,
        isBlessed: result.is_blessed === 1,
        isCursed: result.is_cursed === 1,
      });
      return acc;
    },
    {} as Record<
      string,
      {
        name: string;
        imageUrl: string | null;
        link: string | null;
        level: number | null;
        items: Array<{
          name: string;
          link: string | null;
          isBlessed: boolean;
          isCursed: boolean;
        }>;
      }
    >
  );

  const embeds: EmbedBuilder[] = [];

  for (const [, data] of Object.entries(groupedByMonster)) {
    const levelStr = data.level != null ? ` Lv${data.level}` : '';
    const embed = new EmbedBuilder()
      .setColor(0xff6b6b) // 紅色
      .setTitle(`👹 ${data.name}${levelStr}`)
      .setTimestamp();

    if (data.link) {
      embed.setURL(data.link);
    }

    if (data.imageUrl) {
      embed.setThumbnail(data.imageUrl);
    }

    // 建立掉落物品條列清單
    const lines: string[] = ['掉落物品：'];
    let truncated = false;

    for (const item of data.items) {
      // 查怪視角：怪物掉落的物品，祝福/詛咒作前綴
      const prefix = item.isBlessed ? '祝福的 ' : item.isCursed ? '詛咒的 ' : '';
      const line = item.link
        ? `- ${prefix}[${item.name}](${item.link})`
        : `- ${prefix}${item.name}`;

      if (lines.join('\n').length + line.length + 1 > DESC_LIMIT) {
        truncated = true;
        break;
      }
      lines.push(line);
    }

    embed.setDescription(lines.join('\n'));

    if (truncated) {
      embed.setFooter({ text: `僅顯示部分結果，共 ${data.items.length} 個物品` });
    }

    embeds.push(embed);
  }

  // Discord 一次最多送 10 個 embeds
  return embeds.slice(0, 10);
}

/**
 * 建立錯誤訊息 Embed
 *
 * @param message 錯誤訊息
 * @returns Discord Embed
 */
export function buildErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('❌ 錯誤')
    .setDescription(message)
    .setTimestamp();
}
