import { describe, it, expect, vi, beforeEach } from 'vitest';
import Crawler from '../bot/utils/Crawler.js';

// Mock puppeteer
vi.mock('puppeteer', () => {
  return {
    default: {
      launch: vi.fn(),
    },
  };
});

import puppeteer from 'puppeteer-core';

function createMockElement(overrides: Record<string, any> = {}) {
  return {
    $: vi.fn().mockResolvedValue(null),
    $$: vi.fn().mockResolvedValue([]),
    evaluate: vi.fn(),
    asLocator: vi.fn().mockReturnValue({ click: vi.fn() }),
    ...overrides,
  };
}

function createMockPage(overrides: Record<string, any> = {}) {
  return {
    goto: vi.fn(),
    waitForSelector: vi.fn().mockResolvedValue(null),
    $$: vi.fn().mockResolvedValue([]),
    $: vi.fn().mockResolvedValue(null),
    waitForNavigation: vi.fn().mockResolvedValue(null),
    url: vi.fn().mockReturnValue(''),
    ...overrides,
  };
}

function createMockBrowser(page: ReturnType<typeof createMockPage>) {
  return {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn(),
  };
}

describe('Crawler', () => {
  let crawler: Crawler;

  beforeEach(() => {
    vi.clearAllMocks();
    crawler = new Crawler();
  });

  describe('scrapingMonster', () => {
    it('should return an empty map when no rows are found', async () => {
      const mockPage = createMockPage();
      const mockBrowser = createMockBrowser(mockPage);
      vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

      const result = await crawler.scrapingMonster();

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should navigate to all 5 pages', async () => {
      const mockPage = createMockPage();
      const mockBrowser = createMockBrowser(mockPage);
      vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

      await crawler.scrapingMonster();

      expect(mockPage.goto).toHaveBeenCalledTimes(5);
      for (let i = 1; i <= 5; i++) {
        expect(mockPage.goto).toHaveBeenCalledWith(
          `https://lineageclassic.plaync.com/zh-tw/info/monster?page=${i}`
        );
      }
    });

    it('should scrape monster data correctly', async () => {
      const mockNameEl = {
        evaluate: vi.fn().mockResolvedValue('哥布林'),
      };

      const mockImgEl = {
        evaluate: vi.fn().mockResolvedValue('https://example.com/goblin.png'),
      };

      const mockDropCell = {
        evaluate: vi.fn().mockReturnValue(['短劍', ' 木盾']),
      };

      const mockButton = createMockElement({
        $: vi.fn().mockResolvedValue(mockNameEl),
        asLocator: vi.fn().mockReturnValue({
          click: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const mockCloseButton = createMockElement({
        asLocator: vi.fn().mockReturnValue({
          click: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const mockRow = createMockElement({
        $: vi.fn().mockResolvedValue(mockButton),
        $$: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'div.tablecell') {
            return Promise.resolve([
              null,
              null,
              null,
              null,
              null,
              mockDropCell,
            ]);
          }
          if (selector === 'button.btn-item > img.thumb') {
            return Promise.resolve([mockImgEl]);
          }
          return Promise.resolve([]);
        }),
      });

      const mockPage = createMockPage({
        $$: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'div.has-option.tablerow') {
            return Promise.resolve([mockRow]);
          }
          return Promise.resolve([]);
        }),
        url: vi
          .fn()
          .mockReturnValue(
            'https://lineageclassic.plaync.com/zh-tw/info/monster?detail=monster12345'
          ),
        $: vi.fn().mockResolvedValue(mockCloseButton),
      });

      // Only return rows on page 1, empty on others
      let callCount = 0;
      mockPage.$$ = vi.fn().mockImplementation((selector: string) => {
        if (selector === 'div.has-option.tablerow') {
          callCount++;
          if (callCount === 1) return Promise.resolve([mockRow]);
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      const mockBrowser = createMockBrowser(mockPage);
      vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

      const result = await crawler.scrapingMonster();

      expect(result.size).toBe(1);
      const monster = result.get('12345');
      expect(monster).toBeDefined();
      expect(monster!.name).toBe('哥布林');
      expect(monster!.dropItems).toEqual(['短劍', '木盾']);
      expect(monster!.imageUrl).toBe('https://example.com/goblin.png');
      expect(monster!.link).toBe(
        'https://lineageclassic.plaync.com/zh-tw/info/monster?detail=monster12345'
      );
    });

    it('should skip rows without a button', async () => {
      const mockRow = createMockElement({
        $: vi.fn().mockResolvedValue(null), // no button
      });

      let callCount = 0;
      const mockPage = createMockPage({
        $$: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'div.has-option.tablerow') {
            callCount++;
            if (callCount === 1) return Promise.resolve([mockRow]);
            return Promise.resolve([]);
          }
          return Promise.resolve([]);
        }),
      });

      const mockBrowser = createMockBrowser(mockPage);
      vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

      const result = await crawler.scrapingMonster();

      // row still sets with empty id since button is null
      expect(result.size).toBe(1);
      const monster = result.get('');
      expect(monster).toBeDefined();
      expect(monster!.name).toBe('');
    });

    it('should handle waitForSelector timeout gracefully', async () => {
      const mockPage = createMockPage({
        waitForSelector: vi.fn().mockRejectedValue(new Error('Timeout')),
      });
      const mockBrowser = createMockBrowser(mockPage);
      vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

      const result = await crawler.scrapingMonster();

      expect(result).toBeInstanceOf(Map);
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should close browser even after errors in scraping', async () => {
      const mockPage = createMockPage();
      const mockBrowser = createMockBrowser(mockPage);
      vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

      await crawler.scrapingMonster();

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('scrapingItem', () => {
    it('should return an empty map when no rows are found', async () => {
      const mockPage = createMockPage();
      const mockBrowser = createMockBrowser(mockPage);
      vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

      const result = await crawler.scrapingItem();

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should navigate to all 14 pages', async () => {
      const mockPage = createMockPage();
      const mockBrowser = createMockBrowser(mockPage);
      vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

      await crawler.scrapingItem();

      expect(mockPage.goto).toHaveBeenCalledTimes(14);
      for (let i = 1; i <= 14; i++) {
        expect(mockPage.goto).toHaveBeenCalledWith(
          `https://lineageclassic.plaync.com/zh-tw/info/item?page=${i}`
        );
      }
    });

    it('should scrape item data correctly', async () => {
      const mockNameEl = {
        evaluate: vi.fn().mockResolvedValue('力量手套'),
      };

      const mockImgEl = {
        evaluate: vi.fn().mockResolvedValue('https://example.com/glove.png'),
      };

      const mockDescCell = {
        evaluate: vi.fn().mockResolvedValue('增加力量的手套'),
      };

      const mockButton = createMockElement({
        $: vi.fn().mockResolvedValue(mockNameEl),
        asLocator: vi.fn().mockReturnValue({
          click: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const mockCloseButton = createMockElement({
        asLocator: vi.fn().mockReturnValue({
          click: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const mockRow = createMockElement({
        $: vi.fn().mockResolvedValue(mockButton),
        $$: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'div.tablecell') {
            return Promise.resolve([null, null, null, mockDescCell]);
          }
          if (selector === 'button.btn-item > img.thumb') {
            return Promise.resolve([mockImgEl]);
          }
          return Promise.resolve([]);
        }),
      });

      let callCount = 0;
      const mockPage = createMockPage({
        $$: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'div.has-option.tablerow') {
            callCount++;
            if (callCount === 1) return Promise.resolve([mockRow]);
            return Promise.resolve([]);
          }
          return Promise.resolve([]);
        }),
        url: vi
          .fn()
          .mockReturnValue(
            'https://lineageclassic.plaync.com/zh-tw/info/item?detail=item67890'
          ),
        $: vi.fn().mockResolvedValue(mockCloseButton),
      });

      const mockBrowser = createMockBrowser(mockPage);
      vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

      const result = await crawler.scrapingItem();

      expect(result.size).toBe(1);
      const item = result.get('力量手套');
      expect(item).toBeDefined();
      expect(item!.name).toBe('力量手套');
      expect(item!.id).toBe('67890');
      expect(item!.description).toBe('增加力量的手套');
      expect(item!.imageUrl).toBe('https://example.com/glove.png');
      expect(item!.link).toBe(
        'https://lineageclassic.plaync.com/zh-tw/info/item?detail=item67890'
      );
      expect(item!.dropFrom).toEqual([]);
    });

    it('should handle missing close button', async () => {
      const mockNameEl = {
        evaluate: vi.fn().mockResolvedValue('短劍'),
      };

      const mockImgEl = {
        evaluate: vi.fn().mockResolvedValue('https://example.com/sword.png'),
      };

      const mockDescCell = {
        evaluate: vi.fn().mockResolvedValue('基本的劍'),
      };

      const mockButton = createMockElement({
        $: vi.fn().mockResolvedValue(mockNameEl),
        asLocator: vi.fn().mockReturnValue({
          click: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const mockRow = createMockElement({
        $: vi.fn().mockResolvedValue(mockButton),
        $$: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'div.tablecell') {
            return Promise.resolve([null, null, null, mockDescCell]);
          }
          if (selector === 'button.btn-item > img.thumb') {
            return Promise.resolve([mockImgEl]);
          }
          return Promise.resolve([]);
        }),
      });

      let callCount = 0;
      const mockPage = createMockPage({
        $$: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'div.has-option.tablerow') {
            callCount++;
            if (callCount === 1) return Promise.resolve([mockRow]);
            return Promise.resolve([]);
          }
          return Promise.resolve([]);
        }),
        url: vi
          .fn()
          .mockReturnValue(
            'https://lineageclassic.plaync.com/zh-tw/info/item?detail=item11111'
          ),
        $: vi.fn().mockResolvedValue(null), // no close button
      });

      const mockBrowser = createMockBrowser(mockPage);
      vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

      const result = await crawler.scrapingItem();

      expect(result.size).toBe(1);
      expect(result.get('短劍')).toBeDefined();
    });

    it('should close browser after scraping', async () => {
      const mockPage = createMockPage();
      const mockBrowser = createMockBrowser(mockPage);
      vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

      await crawler.scrapingItem();

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });
  });
});
