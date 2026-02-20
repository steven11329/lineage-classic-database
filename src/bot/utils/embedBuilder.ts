import { EmbedBuilder } from 'discord.js';
import type {
  ItemDropResult,
  MonsterDropResult,
} from '../../database/queries';

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
  // 無結果時顯示錯誤訊息
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
        imageUrl: result.monster_image_url,
        link: result.monster_link,
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
          imageUrl: string | null;
          link: string | null;
        }>;
      }
    >
  );

  const embeds: EmbedBuilder[] = [];

  for (const [name, data] of Object.entries(groupedByItem)) {
    const embed = new EmbedBuilder()
      .setColor(0x00ae86) // 綠色
      .setTitle(`📦 ${name}`)
      .setDescription(`此物品可從以下怪物掉落：`)
      .setTimestamp();

    // 如果有連結，設定為標題的超連結
    if (data.link) {
      embed.setURL(data.link);
    }

    // 如果有圖片，設定為縮圖
    if (data.imageUrl) {
      embed.setThumbnail(data.imageUrl);
    }

    // 添加怪物列表（Discord 每個 embed 最多 25 個 field）
    const monstersToShow = data.monsters.slice(0, 25);
    monstersToShow.forEach((monster, index) => {
      const monsterInfo = monster.link
        ? `[查看詳情](${monster.link})`
        : '無連結';
      embed.addFields({
        name: `${index + 1}. ${monster.name}`,
        value: monsterInfo,
        inline: true,
      });
    });

    // 如果超過 25 個，顯示提示
    if (data.monsters.length > 25) {
      embed.setFooter({
        text: `顯示前 25 個怪物，共 ${data.monsters.length} 個`,
      });
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
  // 無結果時顯示錯誤訊息
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
  const groupedByMonster = results.reduce(
    (acc, result) => {
      if (!acc[result.monster_name]) {
        acc[result.monster_name] = {
          imageUrl: result.monster_image_url,
          link: result.monster_link,
          items: [],
        };
      }
      acc[result.monster_name].items.push({
        name: result.item_name,
        imageUrl: result.item_image_url,
        link: result.item_link,
        description: result.item_description,
      });
      return acc;
    },
    {} as Record<
      string,
      {
        imageUrl: string | null;
        link: string | null;
        items: Array<{
          name: string;
          imageUrl: string | null;
          link: string | null;
          description: string | null;
        }>;
      }
    >
  );

  const embeds: EmbedBuilder[] = [];

  for (const [name, data] of Object.entries(groupedByMonster)) {
    const embed = new EmbedBuilder()
      .setColor(0xff6b6b) // 紅色
      .setTitle(`👹 ${name}`)
      .setDescription(`此怪物會掉落以下物品：`)
      .setTimestamp();

    // 如果有連結，設定為標題的超連結
    if (data.link) {
      embed.setURL(data.link);
    }

    // 如果有圖片，設定為縮圖
    if (data.imageUrl) {
      embed.setThumbnail(data.imageUrl);
    }

    // 添加物品列表（Discord 每個 embed 最多 25 個 field）
    const itemsToShow = data.items.slice(0, 25);
    itemsToShow.forEach((item, index) => {
      const itemInfo = item.link ? `[查看詳情](${item.link})` : '無連結';
      const description = item.description
        ? `\n${item.description.substring(0, 50)}${item.description.length > 50 ? '...' : ''}`
        : '';
      embed.addFields({
        name: `${index + 1}. ${item.name}`,
        value: `${itemInfo}${description}`,
        inline: true,
      });
    });

    // 如果超過 25 個，顯示提示
    if (data.items.length > 25) {
      embed.setFooter({
        text: `顯示前 25 個物品，共 ${data.items.length} 個`,
      });
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
