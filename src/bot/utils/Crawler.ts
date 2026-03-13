import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer-core';
import { Monster } from '../../types';
import logger from './logger';
import path from 'path';
import fs from 'fs';

import Database from './Database';

const blessedRegex = /^祝福的/;
const cursedRegex = /^詛咒的/;

class Crawler {
  private _db: Database;

  constructor() {
    this._db = new Database({
      dbPath: path.join('./dist/db/lineage-classic.db'),
      isReadOnly: false,
    });
  }

  async _getBrowser(): Promise<Browser> {
    let browser;
    const isArm = process.arch === 'arm' || process.arch === 'arm64';
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    if (isWin) {
      browser = await puppeteer.launch({
        // Windows 的路徑請注意反斜線，或使用兩條反斜線轉義
        executablePath:
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true, // 或 "new"
      });
    } else if (isMac) {
      browser = await puppeteer.launch({
        executablePath:
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true, // 或 "new"
      });
    } else if (isArm) {
      browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    } else {
      throw new Error('Unsupported platform: ' + process.platform);
    }

    return browser;
  }

  async getLastPageNumber(url: string): Promise<number> {
    const browser = await this._getBrowser();
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForSelector('div.pagination-list', { timeout: 30000 });

    const el = await page.$('div.pagination-total>strong');
    if (!el) {
      await browser.close();
      throw Error('Total page number not found.');
    }

    const n = await el.evaluate((node) => parseInt(node.innerText.trim(), 10));
    await browser.close();
    return n;
  }

  async getPageRows(
    page: Page,
    url: string,
    pageNum: number
  ): Promise<ElementHandle[]> {
    await page.goto(`${url}?page=${pageNum}`);
    await page
      .waitForSelector('div.has-option.tablerow', { timeout: 30000 })
      .catch(() => {
        logger.error('Selector not found within timeout');
      });
    return page.$$('div.has-option.tablerow');
  }

  async openDetailPanel(page: Page, button: ElementHandle): Promise<string> {
    await button.asLocator().click();
    await page
      .waitForSelector('div.gameinfo-detail__title>button.btn-close', {
        timeout: 5000,
      })
      .catch(() => {
        logger.info('Detail panel not found within timeout');
      });
    return page.url();
  }

  async closeDetailPanel(page: Page): Promise<void> {
    const closeButton = await page.$(
      'div.gameinfo-detail__title>button.btn-close'
    );
    if (closeButton) {
      await closeButton.asLocator().click();
      await page
        .waitForSelector('div.gameinfo-detail__title>button.btn-close', {
          hidden: true,
          timeout: 5000,
        })
        .catch(() => {
          logger.info('Detail panel did not close within timeout');
        });
    }
  }

  async scrapeMonsterRow(page: Page, row: ElementHandle): Promise<void> {
    const button = await row.$('button.btn-item');
    if (!button) return;

    const name =
      (await button
        ?.$('strong.name')
        .then((el) => el?.evaluate((node) => node.textContent?.trim()))) ?? '';
    const imageUrl = await row
      .$$('button.btn-item > img.thumb')
      .then((node) => {
        return node[0]?.evaluate((img) => img.getAttribute('src') ?? '') ?? '';
      });
    const level = await row.$$('div.tablecell').then((node) => {
      return node[3]?.evaluate((node) => {
        const text = node.textContent?.trim() ?? '';
        const value = parseInt(text.trim());
        return isNaN(value) ? 0 : value;
      });
    });

    logger.info(`Monster ${name}`);
    const link = await this.openDetailPanel(page, button);
    const id = link.split('detail=monster')[1];

    await page
      .waitForSelector('li.drop-category.monster > div.value > p strong.link', {
        timeout: 5000,
      })
      .catch(() => {
        logger.info('Detail panel not found within timeout');
      });
    const elements = await page.$$(
      'li.drop-category.monster > div.value > p strong.link'
    );

    this._db.upsertMonster({ id, name, imageUrl, link, level });

    await Promise.all(
      elements.map(async (el) => {
        let text = await el.evaluate((node) => node.textContent?.trim() ?? '');
        if (text) {
          let isBlessed = false;
          let isCursed = false;
          if (blessedRegex.test(text)) {
            isBlessed = true;
            text = text.replace(blessedRegex, '').trim();
          } else if (cursedRegex.test(text)) {
            isCursed = true;
            text = text.replace(cursedRegex, '').trim();
          }
          const result = await this._db.queryItemsExact(text);
          if (result.length > 0) {
            this._db.upsertMonsterDrop(id, result[0].id, isBlessed, isCursed);
          } else {
            logger.warn(`道具 "${text}" 查詢不到資料。略過更新怪物掉落資料。`);
          }
        }
      })
    );

    await this.closeDetailPanel(page);
  }

  async scrapeItemRow(page: Page, row: ElementHandle): Promise<void> {
    const button = await row.$('button.btn-item');
    if (!button) return;

    const description = await row.$$('div.tablecell').then((cells) => {
      return cells[3].evaluate((node) => node.textContent?.trim() ?? '');
    });

    const name =
      (await button
        ?.$('strong.name')
        .then((el) => el?.evaluate((node) => node.textContent?.trim()))) ?? '';
    const imageUrl = await row
      .$$('button.btn-item > img.thumb')
      .then((node) => {
        return node[0]?.evaluate((img) => img.getAttribute('src') ?? '') ?? '';
      });

    logger.info(`Item ${name}`);
    const link = await this.openDetailPanel(page, button);
    const id = link.split('detail=item')[1];

    await this.closeDetailPanel(page);
    this._db.upsertItem(id, name, description, imageUrl, link);
  }

  async scrapingMonsterAt(pageNum: number, rowIndex: number): Promise<void> {
    const url = 'https://lineageclassic.plaync.com/zh-tw/info/monster';
    const browser = await this._getBrowser();
    const page = await browser.newPage();
    logger.info(`Monster page ${pageNum}, row ${rowIndex} loading...`);
    const rows = await this.getPageRows(page, url, pageNum);
    await this.scrapeMonsterRow(page, rows[rowIndex]);
    await browser.close();
  }

  async scrapingItemAt(pageNum: number, rowIndex: number): Promise<void> {
    const url = 'https://lineageclassic.plaync.com/zh-tw/info/item';
    const browser = await this._getBrowser();
    const page = await browser.newPage();
    logger.info(`Item page ${pageNum}, row ${rowIndex} loading...`);
    const rows = await this.getPageRows(page, url, pageNum);
    await this.scrapeItemRow(page, rows[rowIndex]);
    await browser.close();
  }

  async scrapingMonster(maxPages?: number) {
    const url = 'https://lineageclassic.plaync.com/zh-tw/info/monster';
    const browser = await this._getBrowser();
    const page = await browser.newPage();
    const totalPageNumber = await this.getLastPageNumber(url);
    const lastPage = maxPages
      ? Math.min(maxPages, totalPageNumber)
      : totalPageNumber;

    for (let i = 1; i <= lastPage; i++) {
      const rows = await this.getPageRows(page, url, i);
      for (let j = 0; j < rows.length; j++) {
        logger.info(`Monster page ${i}, row ${j} loading...`);
        await this.scrapeMonsterRow(page, rows[j]);
      }
    }

    await browser.close();
    logger.info('Scraping Monster Finished.');
  }

  async scrapingItem(maxPages?: number) {
    const url = 'https://lineageclassic.plaync.com/zh-tw/info/item';
    const browser = await this._getBrowser();
    const page = await browser.newPage();
    const totalPageNumber = await this.getLastPageNumber(url);
    const lastPage = maxPages
      ? Math.min(maxPages, totalPageNumber)
      : totalPageNumber;

    for (let i = 1; i <= lastPage; i++) {
      const rows = await this.getPageRows(page, url, i);
      for (let j = 0; j < rows.length; j++) {
        logger.info(`Item page ${i}, row ${j} loading...`);
        await this.scrapeItemRow(page, rows[j]);
      }
    }

    await browser.close();
    logger.info('Scraping Item Finished.');
  }
}

export default Crawler;
