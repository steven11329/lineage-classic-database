import Crawler from '../bot/utils/Crawler';

async function start() {
  try {
    const crawler = new Crawler({
      loadItemPages: 14,
      loadItemRows: 30,
      loadMonsterPages: 5,
      loadMonsterRows: 30,
    });
    await crawler.scraping();
  } catch (error) {
    console.error('更新資料庫時發生錯誤:', error);
    process.exit(1);
  }
}

start();
