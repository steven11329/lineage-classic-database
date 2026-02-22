import { describe } from 'node:test';
import Crawler from '../bot/utils/Crawler';
import { expect, it } from 'vitest';

async function testCrawler(): Promise<boolean> {
  const crawler = new Crawler({
    loadMonsterPages: 1,
    loadMonsterRows: 1,
    loadItemPages: 1,
    loadItemRows: 7,
  });

  try {
    await crawler.scraping();
  } catch (error) {
    return false;
  }

  return true;
}

describe('Crawler', () => {
  it('should scrape items and monsters correctly', async () => {
    const result = await testCrawler();
    expect(result).toBe(true);
  });
});
