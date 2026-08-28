# 美妝情報所 — 韓系保養 × 醫美每日自動彙整網站

一個會自己每天更新一次的靜態網站：GitHub Actions 每天執行一次腳本，
從公開 RSS 來源抓取「韓系保養」「醫美趨勢」「新品牌動態」「產業動態」
相關新聞，寫進 `data/news.json`，網頁再讀這份資料顯示出來。

不需要任何 API key，也不需要自己的伺服器，全部跑在 GitHub 免費額度內。

---

## 這是什麼、不是什麼

- ✅ 你打開網址，看到的永遠是「昨天排程跑完後」最新的一批新聞。
- ✅ 完全自動、不用手動維護，設定好之後可以放著不管。
- ❌ 不會主動推播通知到你的手機——這是「你隨時去看，內容自動是新的」，
  不是「新聞自動跳出來找你」。如果你想要主動通知，可以參考下面
  「進階：接上通知」的段落自己加。

---

## 第一次設定（大約 10 分鐘）

### 1. 建立 GitHub 帳號 & 新倉庫（Repository）
1. 到 [github.com](https://github.com) 註冊帳號（如果還沒有的話）。
2. 右上角「+」→「New repository」。
3. Repository name 隨意取，例如 `beauty-news`。
4. 選 **Public**（GitHub Pages 免費版需要 Public repo）。
5. 其他選項不用動，按「Create repository」。

### 2. 把這個資料夾的內容上傳上去
最簡單的方式：在剛建立的倉庫頁面，用「uploading an existing file」
把這個資料夾裡的所有檔案（含 `.github` 資料夾，注意它是隱藏資料夾）
拖曳上傳。

如果你熟悉 Git，也可以：
```bash
cd beauty-news-site
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/你的帳號/beauty-news.git
git push -u origin main
```

> ⚠️ `.github/workflows/update-news.yml` 這個檔案一定要上傳成功，
> 它就是「每天自動跑」的關鍵。用網頁拖曳上傳時容易漏掉隱藏資料夾，
> 建議優先用 Git 指令上傳，或上傳後回到倉庫確認 `.github` 資料夾真的存在。

### 3. 開啟 GitHub Actions 的寫入權限
1. 倉庫頁面 → **Settings** → 左側 **Actions** → **General**。
2. 拉到最下面「Workflow permissions」。
3. 選 **Read and write permissions**。
4. 按 **Save**。

（這一步沒做的話，機器人每天抓完新聞會因為沒有權限「寫回」倉庫而失敗。）

### 4. 開啟 GitHub Pages
1. **Settings** → 左側 **Pages**。
2. Source 選 **Deploy from a branch**。
3. Branch 選 **main**，資料夾選 **/(root)**。
4. 按 **Save**。
5. 等 1–2 分鐘，頁面會出現你的網址，長得像：
   `https://你的帳號.github.io/beauty-news/`

### 5. 手動測試一次自動抓取
1. 倉庫頁面 → **Actions** 分頁。
2. 左側點 **Update Beauty News**。
3. 右上角按 **Run workflow** → **Run workflow**（綠色按鈕）。
4. 等它跑完（通常 1 分鐘內），確認是綠色勾勾，沒有紅色叉叉。
5. 回到倉庫看 `data/news.json` 有沒有更新時間變成剛剛的時間。
6. 打開你的網址，應該就能看到剛抓下來的新聞。

完成以上步驟後，之後每天台北時間早上 7 點左右，
它就會自動重新抓取一次，你完全不用再手動做任何事。

---

## 想調整內容？三個常改的地方

**改抓取的主題／關鍵字**
編輯 `scripts/fetch_news.py` 裡的 `FEEDS` 清單，
每一項是 `{query, category, url}`，`url` 是 Google News 的 RSS 搜尋網址，
把裡面的關鍵字換掉就能追蹤別的主題，例如換成「日系保養」「香氛新品」都可以。

**改每天更新的時間**
編輯 `.github/workflows/update-news.yml` 裡的：
```yaml
- cron: "0 23 * * *"
```
cron 時間是 **UTC**，台北時間要 **減 8 小時** 換算。
例如想要台北時間晚上 9 點更新，就填 `0 13 * * *`。

**改網站標題／分類名稱**
`index.html` 裡的標題文字，以及 `app.js` 最上面的 `CATEGORIES` 陣列
（要跟 `fetch_news.py` 裡 `category` 欄位的名稱完全一致，否則對不起來）。

---

## 進階：接上通知（選用）

如果之後想要「真的推播到手機」而不只是被動打開網頁，
可以在 `.github/workflows/update-news.yml` 最後加一步，
呼叫 Slack Webhook、LINE Notify、或 Discord Webhook，
把當天抓到的新標題發出去。這需要你另外申請對應服務的 Webhook 網址，
如果你想做這塊，可以再回來跟我說要接哪個通知管道，我幫你補上那一步。

---

## 檔案結構
```
beauty-news-site/
├── index.html              網頁本體
├── style.css                樣式
├── app.js                    讀取資料、畫面渲染邏輯
├── data/news.json            每天被機器人覆寫的新聞資料（有放一份範例資料先墊著）
├── scripts/
│   ├── fetch_news.py         抓新聞、寫入 data/news.json 的腳本
│   └── requirements.txt      腳本需要的 Python 套件
└── .github/workflows/
    └── update-news.yml       GitHub Actions 排程設定（每天自動執行）
```
