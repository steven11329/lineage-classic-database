---
name: update-db
description: 透過爬蟲程式爬天堂：經典版官方網頁更新 database。
---

# Reference
1. 資料庫位置在 `dist/db/lineage-classic.db`
2. 爬蟲程式路徑 `src/scripts/update-db.ts`
4. 爬蟲程式 Core `src/bot/utils/Crawler.ts`

# Feature
1. **爬取 Item** 透過爬蟲程式 Core 爬取 item
2. **爬取 Monster** 透過爬蟲程式 Core 爬取 monster
3. 可以指定 page & row 來針對單個 item 進行更新
4. 可以指定 page & row 來針對單個 monster 進行更新


# Example
1. Update item database `$node dist/scripts/update-db.js item`
2. Update monster database `$node dist/scripts/update-db.js monster`
3. Update both `$node dist/scripts/update-db.js`
4. Update 1 item `$node dist/scripts/update-db.js -page=1 -row=3 item`
5. Update 1 monster `$node dist/scripts/update-db.js -page=1 -row=3 monster`

# Test
1. 確保 Crawler.ts 可以執行完成
2. 分別撰寫爬取 item & monster 的測試
3. 可指定特定 page & row 進行測試，方便 debug 單筆資料（修改測試 case 的參數即可）

## 測試指令

```bash
# 測試完整第 1 頁
npx vitest run CrawlerReal

# 測試 monster 特定 page & row（修改 scrapingMonsterAt 的參數）
npx vitest run --reporter=verbose CrawlerReal -t "Scraping monster (page"

# 測試 item 特定 page & row（修改 scrapingItemAt 的參數）
npx vitest run --reporter=verbose CrawlerReal -t "Scraping item (page"
```

## Crawler function 說明

| Method | 說明 |
|---|---|
| `getPageRows(page, url, pageNum)` | 導航至指定頁並回傳所有 row elements |
| `openDetailPanel(page, button)` | 點擊開啟 detail panel，回傳當前 URL |
| `closeDetailPanel(page)` | 關閉 detail panel |
| `scrapeMonsterRow(page, rowEl)` | 爬取並寫入單一 monster row |
| `scrapeItemRow(page, rowEl)` | 爬取並寫入單一 item row |
| `scrapingMonsterAt(pageNum, rowIndex)` | 爬取指定 page + row 的 monster（含 browser 生命週期） |
| `scrapingItemAt(pageNum, rowIndex)` | 爬取指定 page + row 的 item（含 browser 生命週期） |