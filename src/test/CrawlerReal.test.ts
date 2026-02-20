import { describe } from 'node:test';
import Crawler from '../bot/utils/Crawler';
import { expect, it } from 'vitest';

async function testCrawler(): Promise<boolean> {
  const crawler = new Crawler({
    loadMonsterPages: 1,
    loadMonsterRows: 1,
    loadItemPages: 1,
    loadItemRows: 1,
  });
  const itemMap = await crawler.scrapingItem();
  const monsterMap = await crawler.scrapingMonster();
  let result = true;

  console.log(
    `爬取完成，獲得 ${itemMap.size} 個物品和 ${monsterMap.size} 個怪物`
  );
  console.log(`其中一個物品的資料:`);
  const firstItem = itemMap.values().next().value;
  if (firstItem) {
    console.log(`
      ID: ${firstItem.id}
      Name: ${firstItem.name}
      Description: ${firstItem.description}
      Image URL: ${firstItem.imageUrl}
      Link: ${firstItem.link}
      Drop From Monsters: ${firstItem.dropFrom.join(', ')}
     `);
    result && true;
  } else {
    result && false;
  }

  console.log(`其中一個怪物的資料:`);
  const firstMonster = monsterMap.values().next().value;
  if (firstMonster) {
    console.log(`
      ID: ${firstMonster.id}
      Name: ${firstMonster.name}
      Image URL: ${firstMonster.imageUrl}
      Link: ${firstMonster.link}
      Drop Items: ${firstMonster.dropItems.join(', ')}
     `);
    result && true;
  } else {
    result && false;
  }
  return result;
}

describe('Crawler', () => {
  it('should scrape items and monsters correctly', async () => {
    const result = await testCrawler();
    expect(result).toBe(true);
  });
});
