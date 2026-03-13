import { describe, expect, it } from 'vitest';
import Crawler from '../bot/utils/Crawler';

describe('Crawler', () => {
  it('Get item last page number', async () => {
    const crawler = new Crawler();
    const lastPageNumber = await crawler.getLastPageNumber(
      'https://lineageclassic.plaync.com/zh-tw/info/item'
    );
    expect(typeof lastPageNumber).toBe('number');
  });

  it('Scraping item (page 1)', async () => {
    const crawler = new Crawler();
    await expect(crawler.scrapingItem(1)).resolves.toBeUndefined();
  }, 60000);

  it('Scraping monster (page 1)', async () => {
    const crawler = new Crawler();
    await expect(crawler.scrapingMonster(1)).resolves.toBeUndefined();
  }, 60000);

  it('Scraping item (page 1, row 0)', async () => {
    const crawler = new Crawler();
    await expect(crawler.scrapingItemAt(1, 0)).resolves.toBeUndefined();
  }, 60000);

  it('Scraping monster (page 1, row 0)', async () => {
    const crawler = new Crawler();
    await expect(crawler.scrapingMonsterAt(1, 0)).resolves.toBeUndefined();
  }, 60000);
});
