[README.md](https://github.com/user-attachments/files/33534201/README.md)
# 感情狀態看板 (Relationship Status Board) 💘

一個為朋友社群設計的互動式「感情狀態追蹤看板」。支援多人即時同步、月份歷史回顧、狀態連續月數統計、頭像上傳壓縮、脫單慶祝彩帶以及一鍵匯出 IG 限動圖片與 CSV 備份。

---

## 📖 專案目錄結構

```text
relationship-status-board/
├── index.html         # 核心入口頁面（Vue 3 模板、Tailwind CSS CDN、彈窗與看板結構）
├── css/
│   └── style.css      # 自訂深綠色系主題、卡片光暈效果與全局樣式
├── js/
│   ├── config.js      # Firebase 配置檔與全域預設大廳房間 (room=main) 網址解析
│   ├── storage.js     # 資料儲存層：Firebase Firestore 雲端即時同步、LocalStorage 離線快取、CSV 匯出入
│   ├── utils.js       # 工具函式庫：本機相片智慧正方形裁切壓縮 (128x128)、脫單拉炮、限動圖片生成
│   └── app.js         # Vue 3 主邏輯：四欄狀態切換、月份快照、自動狀態繼承、拖曳事件綁定
└── README.md          # 專案說明與開發紀錄手冊
```

---

## ✨ 核心特色與功能亮點

### 1. 🗂️ 四大感情維度與雙重操作模式
* **四大狀態**：`單身`、`暈船`、`曖昧`、`交往`。
* **拖曳操作 (SortableJS)**：可直接拖曳成員頭像卡片至目標欄位，放開即自動更新並同步。
* **點擊調整彈窗**：點擊卡片可彈出狀態調整選單，支援點選切換或自房間移除該成員。

### 2. 🔄 跨裝置即時同步 (Firebase Firestore + LocalStorage)
* 預設連接到全域大廳房間 `main`（網址自動補上 `#room=main`）。
* 任一裝置新增成員、調整狀態或移除成員，所有開著網頁的好友畫面將**即時連動更新**。
* 具備 LocalStorage 快取與離線防護機制，若無網路或 Firebase 異常時將無縫降級為本機模式。

### 3. 📅 月份快照與連續月數智慧繼承 (Streak Tracking)
* 每個月份擁有獨立的感情狀態快照。
* **依連續月數自動排序**：看板欄位內的成員預設**依連續月數（Streak）由高到低自動排列**（月數越長排越上方；相同月數時維持穩定順序），跨裝置完全一致。
* **時間軸溯及既往連動重算**：若往前回溯補填歷史月份（例如在 10 月回補 1~9 月紀錄），系統會自動沿著日曆時間軸重新計算，使 10 月即時更新為連續 10M，後續月份（如 11 月）亦順理成章累計為 11M。
* **跨月自動繼承**：切換至新月份時，系統自動抓取前一個月份的狀態並將連續月數加 1（例如：單身 5M、交往 2M），省去每個月重新登記的麻煩。
* 支援點擊 `<` 與 `>` 自由回溯過往歷史紀錄。

### 4. 👤 成員管理與頭像智慧壓縮
* **隨時自訂與更換頭像**：新增成員或點擊既有成員卡片時，可隨時點擊頭像上傳新照片。
* **智慧裁切與極速壓縮**：內建 HTML5 Canvas 自動正方形置中裁切並壓縮至 **128×128 JPEG**，大幅減輕雲端資料庫負擔與提升載入速度。
* 若未上傳照片，自動透過 DiceBear API 根據姓名生成可愛的機器人頭像。

### 5. 📱 一鍵匯出 IG / FB 限動卡片 (html2canvas)
* 點擊右上角「匯出限動」，自動將當前月份看板渲染輸出為 3 倍高解析度的深綠質感 PNG 圖檔，可直接發布到社群媒體。

### 6. 🎉 脫單慶祝拉炮 (Canvas Confetti)
* 當任何成員的狀態被更新為「交往」時，螢幕將噴灑全彩慶祝拉炮彩帶！

### 7. 📊 CSV 完整資料庫備份與還原
* **匯出 CSV**：支援帶有 UTF-8 BOM 標記的標準 CSV 格式，使用 Excel 開啟繁體中文不亂碼。
* **匯入 CSV**：支援自 CSV 檔案完整還原成員名單與歷史月份快照。

---

## 🛠️ 近期重大修復紀錄 (Bug Fixes)

### 📌 修正：新增成員消失，重新整理或由其他地方開啟只剩兩位初始成員且重設為單身

#### 🔍 問題原因剖析
1. **載入競爭與提早覆寫 (Race Condition)**：
   舊版在 `onMounted` 階段，尚未等候到 Firebase Firestore 回傳遠端快照資料前，即同步呼叫了 `checkAndInherit()`。
   當使用者在**無 LocalStorage 快取**（例如：以新分頁、無痕模式、手機開啟，或清除快取）的情況下進入頁面時，`roomData` 暫時為預設的兩位成員（小明、小美），`checkAndInherit()` 判定當月快照不存在，遂自動建立兩位預設成員的「單身」快照並立即呼叫 `save()`，**直接以 set 覆寫了 Firestore 雲端文檔**，將雲端上先前新增的所有成員徹底清空。
2. **Vue 3 響應式 Proxy 傳入 Firestore**：
   直接將 Vue 3 的 `ref.value` 傳遞給 Firestore SDK 時，內部響應式 Proxy 物件在某些情境下會引起 SDK 序列化異常或中斷。

#### 💡 修復方案
1. **雲端連線優先載入（Cloud-First Synchronization）**：
   - 頁面載入時僅將本機快取作為畫面預先繪製使用，**絕不在雲端回傳前執行任何寫入操作**。
   - `BoardStorage.subscribe` 區分雲端是否存在該房間 Document：
     - 若雲端已有資料：優先以雲端資料覆蓋，隨後才執行當月繼承檢查（若已有快照則不發動存檔）。
     - 若雲端無該房間（全新房間）：才使用預設/本機資料初始化並寫入雲端。
2. **純 JSON 深拷貝序列化**：
   - 於 `BoardStorage.save()` 前強制透過 `JSON.parse(JSON.stringify(data))` 清理所有 Vue 3 Proxy 標記與 `undefined`，確保送至 Firestore 的資料為純淨 JavaScript Object。
3. **成員快照防脫落機制**：
   - 於 `checkAndInherit()` 中加入補齊校驗，確保所有在 `members` 列表中的成員，在當月快照必定有其對應狀態，不會因為換月或非同步延遲而隱藏。

---

## 🚀 測試與分支推播指南 (Test to Main Workflow)

目前本專案在 `test` 分支進行測試與驗證。

### 本地測試建議
建議透過本機 HTTP 伺服器預覽（避免直接使用 `file:///` 開啟，以免瀏覽器限制 LocalStorage 或 Firebase 網路跨域通道）：
* **VS Code**：安裝並點擊右下角 **Go Live**（Live Server 套件，預設 `http://127.0.0.1:5500`）。
* **Python**：在專案根目錄執行 `python -m http.server 8000`，打開 `http://localhost:8000/#room=main`。

### 驗證步驟清單
- [ ] 開啟第一個視窗（大廳 `#room=main`），點擊「新增成員」，輸入姓名並上傳一張照片。
- [ ] 觀察看板是否即時出現新成員與頭像。
- [ ] 開啟瀏覽器「無痕視窗」或不同瀏覽器，打開相同網址 `.../#room=main`。
- [ ] **確認**：無痕視窗是否正確顯示剛才新增的成員，且原視窗成員不會消失。
- [ ] 在無痕視窗將該成員狀態拖曳至「交往」，**確認**：兩個視窗是否同步更新並噴出拉炮。
- [ ] 重新整理（F5）兩個視窗，**確認**：所有成員與狀態完整保留。

### 合併推送到 `main` 分支流程
當在 `test` 分支確認各項操作皆穩定無誤後，可依照下列步驟合併並推播至 `main`：

```bash
# 1. 將 test 分支修改加入暫存並提交
git add .
git commit -m "fix: resolve member persistence and cloud synchronization race condition"

# 2. 推送 test 分支到遠端
git push origin test

# 3. 切換至 main 分支並合併 test
git checkout main
git merge test

# 4. 推送到 main 分支觸發 GitHub Pages 部署
git push origin main
```

---

## 📄 License
版權所有 © 2026 Peggy Tsai (Huskyee12)，未經許可禁止轉載或商用。
