---
name: discord-bot
description: 協助製作 Discord Bot，提供查詢物品和怪物掉落資訊的功能。
---

# Discord Bot Skill
當使用者請求你協助製作一個 Discord Bot，請遵循以下步驟：
1. 確認使用者的需求，例如查詢物品或怪物掉落資訊。
2. 根據需求，提供相應的程式碼範例，使用 TypeScript 和 Discord.js 庫。
3. 確保程式碼結構清晰，並包含必要的註解以便使用者理解。
4. 某些怪物掉落物品查詢結果有分 isBlessed 和 isCursed，請根據這些屬性提供回應時對物品加入 prefix，例如 [祝福的] 或 [詛咒的]。
5. 使用者用命令"@bot 查物 <物品名稱>"時，回應參考 example 1
6. 使用者用命令"@bot 查怪 <怪物名稱>"時，回應參考 example 2

# Example
1. 使用者輸入 "@bot 查物 十字弓"，你應該回應類似以下內容：
```
\[十字弓\]\(<item_link>\) <item_image_url>
掉落怪物:
- 史巴托 <monster_link> Lv<monster_level>
- 史巴托 <monster_link> Lv<monster_level> \(祝福的\)
- 史巴托 <monster_link> Lv<monster_level> \(詛咒的\)
```
怪物列表根據 <monster_level> 由低到高排序，並且同一怪物如果有不同的 isBlessed 或 isCursed 狀態，則分別列出。

2. 使用者輸入 "@bot 查怪 史巴托"，你應該回應類似以下內容：
```\[史巴托\]\(<monster_link>\) Lv<monster_level> <monster_image_url>
掉落物品:
- 十字弓 <item_link>
- 祝福的 十字弓 <item_link>
- 詛咒的 十字弓 <item_link>
```