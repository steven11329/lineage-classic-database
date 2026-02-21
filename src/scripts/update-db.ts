import { updateDatabase } from '../database/update';

async function start() {
  try {
    await updateDatabase();
  } catch (error) {
    console.error('更新資料庫時發生錯誤:', error);
    process.exit(1);
  }
}

start();
