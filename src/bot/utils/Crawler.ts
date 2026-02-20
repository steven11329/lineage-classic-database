import puppeteer from 'puppeteer-core';
import { Item, Monster } from '../../types';
import logger from './logger';

class Crawler {
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
    this.loadMonsterPages = options.loadMonsterPages ?? 0;
    this.loadItemPages = options.loadItemPages ?? 0;
    this.loadMonsterRows = options.loadMonsterRows ?? 1;
    this.loadItemRows = options.loadItemRows ?? 1;
  }

  async scrapingMonster(): Promise<Map<string, Monster>> {
    let id: string = '';
    const url = 'https://lineageclassic.plaync.com/zh-tw/info/monster?page=';
    let browser;
    const isArm = process.arch === 'arm' || process.arch === 'arm64';
    const isWin = process.platform === 'win32' || process.platform === 'darwin';
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
    const monster: Map<string, Monster> = new Map();

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
        let dropItems: string[] = [];
        let imageUrl: string = '';
        let link: string = '';

        if (button) {
          name =
            (await button
              ?.$('strong.name')
              .then((el) =>
                el?.evaluate((node) => node.textContent?.trim())
              )) ?? '';
          dropItems = await row
            .$$('div.tablecell')
            .then(async (cells) => {
              return cells[5];
            })
            .then(async (cell) => {
              let items = await cell.evaluate((node) => {
                return node.textContent?.trim().split(',') || [];
              });
              return items.map((item) => item.trim());
            });
          imageUrl = await row
            .$$('button.btn-item > img.thumb')
            .then((node) => {
              return (
                node[0]?.evaluate((img) => img.getAttribute('src') ?? '') ?? ''
              );
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
        monster.set(id, { id, name, dropItems, imageUrl, link });
      }
    }

    await browser.close();
    return monster;
  }

  async scrapingItem(): Promise<Map<string, Item>> {
    let id: string = '';
    const url = 'https://lineageclassic.plaync.com/zh-tw/info/item?page=';
    let browser;
    const isArm = process.arch === 'arm' || process.arch === 'arm64';
    const isWin = process.platform === 'win32' || process.platform === 'darwin';
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
    const item: Map<string, Item> = new Map();

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
        item.set(name, { id, name, description, imageUrl, link, dropFrom: [] });
      }
    }

    await browser.close();
    return item;
  }
}

export default Crawler;
