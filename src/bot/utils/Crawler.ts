import puppeteer from 'puppeteer';
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
    const isWinOrMac =
      process.platform === 'win32' || process.platform === 'darwin';
    if (isWinOrMac) {
      browser = await puppeteer.launch();
    } else if (isArm) {
      browser = await puppeteer.launch({
        // 關鍵：指向系統安裝的 Chromium
        executablePath: '/usr/bin/chromium-browser',
        // RPi 上通常需要這些參數來穩定運行
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
    } else {
      browser = await puppeteer.launch();
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
    const isWinOrMac =
      process.platform === 'win32' || process.platform === 'darwin';
    if (isWinOrMac) {
      browser = await puppeteer.launch();
    } else if (isArm) {
      browser = await puppeteer.launch({
        // 關鍵：指向系統安裝的 Chromium
        executablePath: '/usr/bin/chromium-browser',
        // RPi 上通常需要這些參數來穩定運行
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
    } else {
      browser = await puppeteer.launch();
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
