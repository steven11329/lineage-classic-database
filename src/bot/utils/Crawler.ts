import puppeteer from 'puppeteer-core';
import { Monster } from '../../types';
import logger from './logger';
import path from 'path';

import Database from './Database';

const blessedRegex = /^祝福的/;
const cursedRegex = /^詛咒的/;

class Crawler {
  private _db: Database;
  loadMonsterPages: number;
  loadMonsterRows: number;
  loadItemPages: number;
  loadItemRows: number;

  constructor(
    options: Partial<{
      loadMonsterPages: number;
      loadItemPages: number;
      loadMonsterRows: number;
      loadItemRows: number;
    }> = {}
  ) {
    this._db = new Database({
      dbPath: path.join('./dist/db/lineage-classic.db'),
      isReadOnly: false,
    });
    this.loadItemPages = options.loadItemPages ?? 0;
    this.loadItemRows = options.loadItemRows ?? 1;
    this.loadMonsterPages = options.loadMonsterPages ?? 0;
    this.loadMonsterRows = options.loadMonsterRows ?? 1;
  }

  async scraping() {
    await this._scrapingItem();
    await this._scrapingMonster();
  }

  private async _scrapingMonster() {
    let id: string = '';
    const url = 'https://lineageclassic.plaync.com/zh-tw/info/monster?page=';
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
    const page = await browser.newPage();

    for (let i = 1; i <= this.loadMonsterPages; i++) {
      await page.goto(url + i);

      await page
        .waitForSelector('div.has-option.tablerow', { timeout: 30000 })
        .catch(() => {
          logger.error('Selector not found within timeout');
        });

      const rows = await page.$$('div.has-option.tablerow');

      for (let j = 0; j < Math.min(rows.length, this.loadMonsterRows); j++) {
        logger.info(`Monster page ${i}, row ${j} loading...`);
        const row = rows[j];
        const button = await row.$('button.btn-item');
        let name: string = '';
        let imageUrl: string = '';
        let link: string = '';
        let isBlessed: boolean = false;
        let isCursed: boolean = false;
        let level: number = 0;

        if (button) {
          name =
            (await button
              ?.$('strong.name')
              .then((el) =>
                el?.evaluate((node) => node.textContent?.trim())
              )) ?? '';
          imageUrl = await row
            .$$('button.btn-item > img.thumb')
            .then((node) => {
              return (
                node[0]?.evaluate((img) => img.getAttribute('src') ?? '') ?? ''
              );
            });
          level = await row.$$('div.tablecell').then((node) => {
            return node[3]?.evaluate((node) => {
              const text = node.textContent?.trim() ?? '';
              const value = parseInt(text.trim());
              return isNaN(value) ? 0 : value;
            });
          });
          await button.asLocator().click();
          await page
            .waitForSelector('div.gameinfo-detail__title>button.btn-close', {
              timeout: 5000,
            })
            .catch(() => {
              logger.info('Detail panel not found within timeout');
            });
          link = page.url();
          id = link.split('detail=monster')[1];

          await page
            .waitForSelector(
              'li.drop-category.monster > div.value > p strong.link',
              {
                timeout: 5000,
              }
            )
            .catch(() => {
              logger.info('Detail panel not found within timeout');
            });
          const elements = await page.$$(
            'li.drop-category.monster > div.value > p strong.link'
          );

          this._db.upsertMonster({
            id,
            name,
            imageUrl,
            link,
            level,
          });
          await Promise.all(
            elements.map(async (el) => {
              let text = await el.evaluate(
                (node) => node.textContent?.trim() ?? ''
              );
              if (text) {
                isBlessed = false;
                isCursed = false;
                if (blessedRegex.test(text)) {
                  isBlessed = true;
                  text = text.replace(blessedRegex, '').trim();
                } else if (cursedRegex.test(text)) {
                  isCursed = true;
                  text = text.replace(cursedRegex, '').trim();
                }
                const result = await this._db.queryItemsExact(text);
                if (result.length > 0) {
                  this._db.upsertMonsterDrop(
                    id,
                    result[0].id,
                    isBlessed,
                    isCursed
                  );
                } else {
                  logger.warn(
                    `道具 "${text}" 查詢不到資料。略過更新怪物掉落資料。`
                  );
                }
              }
            })
          );

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
      }
    }

    await browser.close();
  }

  private async _scrapingItem() {
    let id: string = '';
    const url = 'https://lineageclassic.plaync.com/zh-tw/info/item?page=';
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
    const page = await browser.newPage();

    for (let i = 1; i <= this.loadItemPages; i++) {
      await page.goto(url + i);

      await page
        .waitForSelector('div.has-option.tablerow', { timeout: 30000 })
        .catch(() => {
          logger.error('Selector not found within timeout');
        });

      const rows = await page.$$('div.has-option.tablerow');

      for (let j = 0; j < Math.min(rows.length, this.loadItemRows); j++) {
        logger.info(`Item page ${i}, row ${j} loading...`);
        const row = rows[j];
        const button = await row.$('button.btn-item');
        let name: string = '';
        let description: string = '';
        let imageUrl: string = '';
        let link: string = '';

        description = await row.$$('div.tablecell').then(async (cells) => {
          return cells[3].evaluate((node) => node.textContent?.trim() ?? '');
        });

        if (button) {
          name =
            (await button
              ?.$('strong.name')
              .then((el) =>
                el?.evaluate((node) => node.textContent?.trim())
              )) ?? '';
          imageUrl = await row
            .$$('button.btn-item > img.thumb')
            .then((node) => {
              return (
                node[0]?.evaluate((img) => img.getAttribute('src') ?? '') ?? ''
              );
            });
          // logger.info(`Item name: ${name}, description: ${description}, imageUrl: ${imageUrl}`);
          await button.asLocator().click();
          await page
            .waitForSelector('div.gameinfo-detail__title>button.btn-close', {
              timeout: 5000,
            })
            .catch(() => {
              logger.info('Detail panel not found within timeout');
            });
          link = page.url();
          // logger.info(`Item link: ${link}`);
          id = link.split('detail=item')[1];
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
        this._db.upsertItem(id, name, description, imageUrl, link);
      }
    }

    await browser.close();
  }
}

export default Crawler;
