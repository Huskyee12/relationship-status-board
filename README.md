# 感情狀態看板 (Relationship Status Board) 💘

一個為朋友群組打造的互動式「感情狀態追蹤與歷史回顧看板」。支援多人跨裝置即時同步、歷史時間軸回溯、狀態連續月數統計、出生登場月份篩選、一鍵階段性歷史補填、高熵私密房間防護，以及一鍵匯出無裁切的 IG 限動美圖與完整 CSV 資料庫備份。

---

## 📖 專案目錄結構

```text
relationship-status-board/
├── index.html         # 核心入口頁面（Vue 3 模板、Tailwind CSS CDN、彈窗、隱形選單與看板結構）
├── robots.txt         # 搜尋引擎爬蟲阻擋規則（禁止外部爬蟲收錄與檢索）
├── css/
│   └── style.css      # 自訂深綠色系主題、成員名稱排版、卡片光暈效果與全局樣式
├── js/
│   ├── config.js      # Firebase 連線配置、高熵私密房間生成器、房間路由解析與 App Check 金鑰
│   ├── storage.js     # 資料儲存層：Firebase Firestore 雲端即時同步、App Check 模組、離線快取、CSV 匯出入
│   ├── utils.js       # 工具函式庫：相片置中裁切壓縮 (128x128)、脫單拉炮、限動圖片生成與 onclone 修復
│   └── app.js         # Vue 3 主邏輯：四欄狀態切換、歷史時間軸運算、出生月份篩選、階段性批次補填、私密房間搬移
└── README.md          # 專案完整說明與維護指南手冊
```

---

## ✨ 核心特色與功能亮點

### 1. 🗂️ 四大感情維度與雙重直覺操作
* **四大狀態維度**：`單身`、`暈船`、`曖昧`、`交往`。
* **拖曳操作 (SortableJS)**：電腦與手機皆可直接拖曳頭像卡片至目標欄位，放開即自動更新並同步至所有人的畫面。
* **卡片點擊彈窗**：點擊卡片即可快速彈出管理面板，支援一鍵點選變更狀態、修改暱稱、更換頭像、設定出生月份或移出房間。

### 2. 📅 歷史快照、連續月數 (Streak) 與時間軸自動重算
* 每個月份擁有獨立的感情狀態快照。
* **依連續月數自動排序**：欄位內的成員預設**依連續月數（Streak）由高到低自動排序**（月數越長排越上方），跨裝置完全一致。
* **跨月智慧自動繼承**：切換至新月份時，系統自動抓取前一個月份的狀態並將連續月數累計（例如：單身 5M、交往 2M），免去每個月手動重新登記的困擾。
* **時間軸溯及既往連動重算**：若往前回溯補填歷史月份（例如在 10 月回補 1~9 月紀錄），系統會沿著整條時間軸自動重算所有月份的 Streak，後續未來月份自動連鎖更新。

### 3. 👶 出生 / 登場月份機制 (Start Month)
* 避免成員在「尚未出生或尚未登場的歷史年份」出現尷尬的向前繼承狀態。
* 支援設定出生/登場月份（如 `1995/05`）。看板切換至早於登場時間的月份時，**自動在看板上隱藏該成員**。
* 登場第一個月時，其連續月數嚴謹起算為 `1M`。
* 採用跨瀏覽器相容的年/月雙下拉選單（1970~未來兩年），無論是新增成員或修改既有成員皆可隨時設定或清除。

### 4. ⚡ by 階段快速設定歷史時段 (Batch Period Setup)
* 專為新加入看板的成員設計：點開成員面板中的「by 階段快速設定歷史時段」折疊選單。
* 自由選擇**起訖年月**（如 `2023/02` ~ `2025/01`）與該時期狀態（如「交往」），按下確認即可一次性跨年跨月批次填寫，免去逐月點選調整的繁瑣操作。

### 5. 🎯 看板標題隱形透明選單 (Invisible Year/Month Selector)
* 徹底摒除傳統頂部突兀、肥厚的綠色下拉切換列，看板頂部維持 `< 2026 / 10 >` 純粹大氣的排版。
* **隱形透明覆蓋層技術**：
  * 點擊年份數字（如 `2026`）直接呼叫瀏覽器原生年份滾輪/選單。
  * 點擊月份數字（如 `10`）直接呼叫原生月份選單。
  * 左右兩側保留 `<` 與 `>` 箭頭，支援逐月快切。

### 6. 📱 一鍵匯出 IG / FB 完美限動卡片 (html2canvas & Web Share API)
* 點擊右上角「匯出限動」，自動將當前看板渲染輸出為 3 倍高解析度的深綠質感 PNG 圖檔。
* **完美相容 iPhone / iOS 與 LINE 內建瀏覽器**：
  * 徹底解決行動端 Safari 與 LINE 等內建瀏覽器阻擋非同步自動下載檔案的限制。
  * 自動喚起「高清圖片預覽彈窗」，手機使用者可直接**長按圖片選擇「儲存影像」存入相簿**，或點擊按鈕呼叫系統 Web Share API 直接發布至 Instagram 限動、LINE 或 AirDrop！
* **文字切斷痛點修復**：透過 `html2canvas` 的 `onclone` 鉤子在生成圖片瞬間解除 `overflow: hidden`，徹底修復中文筆畫與英文字母被截斷削邊的經典 Bug。
* **純淨限動無雜訊**：標註 `data-html2canvas-ignore` 屬性，在生成瞬間自動隱藏左右箭頭與繼承提示文字，圖片只留下最純粹的看板標題與成員卡片。

### 7. 🔒 多層次縱深防禦與高熵私密房間 (Security & Privacy)
* **搜尋引擎爬蟲全面阻擋**：部署 `robots.txt` 與 `<meta name="robots" content="noindex, nofollow">`，杜絕 Google/Bing 搜尋收錄與爬蟲檢索。
* **高熵密碼學私密專屬房間 (Cryptographically Secure Private Rooms)**：
  * 左上角安全標籤支援**「一鍵升級為私密房間」**：使用密碼學安全亂數（`crypto.getRandomValues`）產生 20 位不可預測長代碼（例如 `room_9f2k8m...`），外人與自動化腳本在數學機率上完全無法暴力破解。
  * **無痛資料遷移**：升級時自動將現有所有成員、自訂照片與歷史快照 100% 完整拷貝至新房間，並自動複製新專屬連結至剪貼簿。
  * 本機自動記憶上次造訪的私密房間，好友開首頁即自動導向。
* **Firebase 後台安全規則（防全庫清空）**：
  * 配置 `allow delete: if false;`，嚴格禁止整份文檔被惡意指令刪除清空。
  * 強制校驗資料結構必須具備 `members` 與 `snapshots`，杜絕覆寫空資料。
* **Firebase App Check 支援**：支援整合 reCAPTCHA v3 / Enterprise，阻斷非網頁發起的外掛與腳本請求。

### 8. 👤 成員管理、暱稱修改與照片智慧壓縮
* **隨時修改暱稱**：點擊卡片可隨時進入編輯模式修改姓名，支援 Enter 鍵儲存並即時廣播更新。
* **智慧裁切與極速壓縮**：內建 HTML5 Canvas 自動正方形置中裁切並壓縮至 **128×128 JPEG**，有效防止 Base64 膨脹，兼顧載入流暢度與 Firebase 儲存額度。
* 若未上傳照片，自動透過 DiceBear API 根據姓名生成可愛的專屬機器人頭像。

### 9. 📊 完整 CSV 資料庫備份、格式指紋防呆與 1 秒還原
* **匯出 CSV**：支援帶有 UTF-8 BOM 標記的標準 CSV 檔案（包含成員、狀態、連續月數、出生月份與 Base64 自訂照片），使用 Excel 開啟繁中不亂碼。
* **嚴格格式指紋驗證**：匯入時強制校驗標題列（必須具備「月份、成員姓名、狀態」等專屬欄位）與月份合法格式。若誤傳發票、名冊等非看板 CSV，系統將立刻彈窗阻擋，徹底防止誤覆蓋！
* **還原前預覽確認**：驗證通過後會清楚列出該備份檔所包含的「所有成員名單」與「歷史月份數量」，確認無誤才覆蓋，多重安全防呆。

---

## 🛡️ Firebase Firestore 安全規則設定 (Security Rules)

請至 [Firebase Console](https://console.firebase.google.com/) ➔ **Firestore Database** ➔ **Rules** 頁籤發布下列規則，杜絕惡意刪除與破壞：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /status_rooms/{roomId} {
      // 1. 讀取權限：允許讀取 (知道房間 ID 即可存取)
      allow read: if true;

      // 2. 嚴格禁止刪除整份 Document (徹底防止整庫被抹除清空)
      allow delete: if false;

      // 3. 寫入防護 (確保資料結構完整，防止惡意清空或注入異常資料)
      allow create, update: if 
        // 必須包含 members 與 snapshots 兩大核心資料
        request.resource.data.keys().hasAll(['members', 'snapshots']) &&
        request.resource.data.members is map &&
        request.resource.data.snapshots is map &&
        // 防止惡意灌水 (單一房間成員不超過 10 人，歷史月份不超過 1200 個月 = 100 年)
        request.resource.data.members.size() <= 10 &&
        request.resource.data.snapshots.size() <= 1200 &&
        // 房間 ID 長度限制 (3 ~ 64 字元)
        roomId.size() >= 3 && roomId.size() <= 64;
    }
  }
}
```

---

## 🚀 測試與部署指南 (Test to Main Workflow)

本專案於 `test` 分支開發驗證，確認無誤後再合併至 `main`。

### 推薦本地測試方式
透過 HTTP 伺服器預覽（避免直接使用 `file:///` 開啟，以防止瀏覽器跨域限制）：
* **VS Code**：安裝並點擊右下角 **Go Live**（Live Server 套件）。
* **Python**：在根目錄執行 `python -m http.server 8000`，瀏覽 `http://localhost:8000`。

### 批次上傳與 Commit 技巧
在 GitHub 網頁版儲存庫頁面，直接在鍵盤上按一下 **`.`（句點鍵）**，可立刻啟動瀏覽器原生 VS Code，直接將本機更新後的檔案整批拖曳覆蓋並一鍵填寫 Commit & Push！

---

## 📄 License
本專案採 MIT 授權條款開放使用。
