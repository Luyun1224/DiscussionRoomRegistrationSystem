# 奇美醫院教學部討論室預約系統

線上預約「討論室」與「多功能室」的網頁系統。前端是純靜態網頁（可直接放在 GitHub Pages），後端用 Google Apps Script（GAS）讀寫 Google 試算表。

## 功能

- 📅 **當日預約時間表**：可以看到兩間場地當天各時段的預約狀況
- 🗓️ **月曆總覽**：整個月的預約一目了然，國定假日自動標示
- ✍️ **線上預約／編輯／取消**：點選空檔就能預約，也能修改開始和結束時間
- 🚢 **長時間借用**：一次借用連續多天（每天 08:00–18:00）
- ⏰ 即時系統時鐘、快速跳轉日期、回到今日

## 專案結構

```
.
├── .github/workflows/      # GitHub Actions：push 後自動跑測試
├── docs/                   # 說明文件（GAS 後端部署步驟）
├── gas/
│   └── Code.gs             # Google Apps Script 後端（貼到 Apps Script 專案）
├── public/
│   └── images/             # Logo 等靜態圖片
├── src/
│   ├── components/         # 各區塊 HTML（導覽列、橫幅、月曆、彈出視窗…）
│   ├── styles/app.css      # 自訂樣式
│   ├── render.js           # 依序把各區塊組裝到畫面上
│   ├── app.js              # 預約主程式（讀取 GAS、渲染月曆與時間表）
│   └── main.js             # 進入點
├── tests/                  # 後端單元測試、前端 UI 測試
└── index.html              # 網頁入口（只負責載入 CSS 與 src/main.js）
```

### 要改什麼，去哪裡找

| 想修改的內容 | 檔案 |
| --- | --- |
| 頂部 Logo、系統名稱 | `src/components/navbar.js` |
| 橫幅標語、跑馬燈文字 | `src/components/hero.js` |
| 當日時間表、月曆外框 | `src/components/main-content.js` |
| 預約／編輯／訊息視窗 | `src/components/booking-modals.js` |
| 長時間借用視窗 | `src/components/long-booking-modal.js` |
| 顏色、字型、版面樣式 | `src/styles/app.css` |
| GAS 網址、場地清單、預約邏輯 | `src/app.js`（最上方「設定區」） |
| 後端讀寫試算表 | `gas/Code.gs` |

## 本機預覽

因為使用 ES module，請透過本機伺服器開啟，不能直接雙擊 `index.html`：

```bash
python3 -m http.server 8000
```

然後在瀏覽器開啟 <http://localhost:8000>。

## 部署

- **前端**：GitHub Pages 設定為從 `main` 分支根目錄發布即可，不需要建置步驟。
- **後端**：照著 [docs/backend-setup.md](docs/backend-setup.md) 部署 `gas/Code.gs`，再把 `/exec` 網址填進 `src/app.js` 的 `WEB_APP_URL`。

## 測試

```bash
node --test tests/
```

`tests/*.py` 是使用 Playwright 的前端 UI 測試（需先啟動上面的本機伺服器）。

## 關於讀取速度

`index.html` 變短**不會**讓 GAS 讀取變快。讀取慢主要卡在 GAS 本身：

1. **冷啟動**：一段時間沒人使用時，GAS 第一次被呼叫需要額外 1–3 秒以上。
2. **重新導向**：`/exec` 會先轉址到 `script.googleusercontent.com` 才回傳資料。
3. **試算表讀取**：後端讀取的資料列越多就越慢。

目前已經做的改善：

- `index.html` 加了 `preconnect`，提早和 Google 伺服器建立連線，省下轉址時的連線時間。
- 每次只讀取當月資料，並設有逾時與自動重試。
- 也可以在 `src/app.js` 的 `SHEET_READ_ENDPOINTS` 改用試算表「發布到網路」的 CSV 網址讀取，完全避開 GAS 冷啟動。
