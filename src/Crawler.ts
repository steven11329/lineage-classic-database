import puppeteer from 'puppeteer';
import { Item, Monster } from './types';

class Crawler {
  async scrapingMonster(): Promise<Map<string, Monster>> {
    let id: string = '';
    const url = 'https://lineageclassic.plaync.com/zh-tw/info/monster?page=';
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const monster: Map<string, Monster> = new Map();

    for (let i = 1; i <= 5; i++) {
      await page.goto(url + i);

      await page
        .waitForSelector('div.has-option.tablerow', { timeout: 30000 })
        .catch(() => {
          console.error('Selector not found within timeout');
        });

      const rows = await page.$$('div.has-option.tablerow');

      for (let j = 0; j < rows.length; j++) {
        console.log(`Monster page ${i}, row ${j} loading...`);
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
          await page.waitForNavigation({ timeout: 30000 }).catch(() => {
            console.error('Navigation timeout after clicking the button');
          });
          link = page.url();
          id = link.split('detail=monster')[1];
          await page
            .waitForSelector('div.gameinfo-detail__title>button.btn-close', {
              timeout: 5000,
            })
            .catch(() => {
              console.log('Selector not found within timeout');
            });
          const closeButton = await page.$(
            'div.gameinfo-detail__title>button.btn-close'
          );
          if (closeButton) {
            await closeButton.asLocator().click();
            await page.waitForNavigation({ timeout: 5000 }).catch(() => {
              console.error('Navigation timeout after clicking the button');
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
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const item: Map<string, Item> = new Map();

    for (let i = 1; i <= 14; i++) {
      await page.goto(url + i);

      await page
        .waitForSelector('div.has-option.tablerow', { timeout: 30000 })
        .catch(() => {
          console.error('Selector not found within timeout');
        });

      const rows = await page.$$('div.has-option.tablerow');

      for (let j = 0; j < rows.length; j++) {
        console.log(`Item page ${i}, row ${j} loading...`);
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
          await button.asLocator().click();
          await page.waitForNavigation({ timeout: 30000 }).catch(() => {
            console.error('Navigation timeout after clicking the button');
          });
          link = page.url();
          id = link.split('detail=item')[1];
          await page
            .waitForSelector('div.gameinfo-detail__title>button.btn-close', {
              timeout: 5000,
            })
            .catch(() => {
              console.log('Selector not found within timeout');
            });
          const closeButton = await page.$(
            'div.gameinfo-detail__title>button.btn-close'
          );
          if (closeButton) {
            await closeButton.asLocator().click();
            await page.waitForNavigation({ timeout: 5000 }).catch(() => {
              console.error('Navigation timeout after clicking the button');
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
