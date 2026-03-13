import Crawler from '../bot/utils/Crawler';

function parseArgs() {
  const args = process.argv.slice(2);
  let page: number | undefined;
  let row: number | undefined;
  let type: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('-page=')) {
      page = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('-row=')) {
      row = parseInt(arg.split('=')[1], 10);
    } else {
      type = arg;
    }
  }

  return { page, row, type };
}

async function start() {
  const { page, row, type } = parseArgs();
  const crawler = new Crawler();

  try {
    const hasSingleTarget = page !== undefined && row !== undefined;

    if (type === 'item') {
      hasSingleTarget
        ? await crawler.scrapingItemAt(page!, row!)
        : await crawler.scrapingItem();
    } else if (type === 'monster') {
      hasSingleTarget
        ? await crawler.scrapingMonsterAt(page!, row!)
        : await crawler.scrapingMonster();
    } else {
      await crawler.scrapingItem();
      await crawler.scrapingMonster();
    }
  } catch (error) {
    console.error('更新資料庫時發生錯誤:', error);
    process.exit(1);
  }
}

start();
