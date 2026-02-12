const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function parseHtmlContent(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const monsterData = [];

    $('div.has-option.tablerow').each((index, row) => {
        const monsterName = $(row).find('button.btn-item > strong.name').text().trim();
        // console.log('Monster Name:', monsterName);

        if (monsterName) {
            const dropCell = $(row).find('div.tablecell').eq(5).text().trim();
            const dropItems = dropCell ? dropCell.split(',').map(item => item.trim()) : [];

            monsterData.push({
                monster: monsterName,
                drops: dropItems
            });
            // console.log('Drops:', dropItems);
        }
    });

    // console.log('Parsed Monster Data:', monsterData);
    return monsterData;
}

function transformToItemData(monsterData) {
    const itemData = {};

    monsterData.forEach(({ monster, drops }) => {
        drops.forEach(item => {
            if (item === '金幣') return; // Ignore '金幣'

            if (!itemData[item]) {
                itemData[item] = { name: item, monsters: [] };
            }

            itemData[item].monsters.push(monster);
        });
    });

    // console.log('Transformed Item Data:', Object.values(itemData));
    return Object.values(itemData);
}

function exportItemDataToCSV(itemData) {
    const csvRows = ['Item Name,Monsters'];

    itemData.forEach(({ name, monsters }) => {
        csvRows.push(`${name},"${monsters.join('; ')}"`);
    });

    const csvContent = csvRows.join('\n');
    const outputPath = path.join(__dirname, '../db/item.csv');

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, csvContent);

    console.log(`Item data exported to: ${outputPath}`);
}

async function fetchHtmlContentWithPuppeteer() {
    const baseUrl = 'https://lineageclassic.plaync.com/zh-tw/info/monster?page=';
    const browser = await puppeteer.launch();
    const aggregatedMonsterData = [];

    try {
        for (let page = 1; page <= 5; page++) {
            const url = `${baseUrl}${page}`;
            console.log(`Fetching data from: ${url}`);

            const pageInstance = await browser.newPage();
            await pageInstance.goto(url, { waitUntil: 'networkidle2' });
            const content = await pageInstance.content();

            // Extract only the <html>...</html> content
            const htmlContent = content.match(/<html[\s\S]*<\/html>/)?.[0];
            if (htmlContent) {
                const monsterData = parseHtmlContent(htmlContent);
                aggregatedMonsterData.push(...monsterData);
            } else {
                console.error(`No HTML content found for page ${page}`);
            }

            await pageInstance.close();
        }

        const itemData = transformToItemData(aggregatedMonsterData);
        exportItemDataToCSV(itemData);
    } catch (error) {
        console.error(`Error during Puppeteer scraping: ${error.message}`);
    } finally {
        await browser.close();
    }
}

fetchHtmlContentWithPuppeteer();