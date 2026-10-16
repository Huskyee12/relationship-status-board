window.BoardStorage = {
  db: null,
  isInitialized: false,

  init() {
    if (this.isInitialized) return;
    try {
      if (window.firebase && window.FIREBASE_CONFIG) {
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
        this.isInitialized = true;
      }
    } catch (e) {
      console.warn("Firebase 初始化失敗，使用本機模式", e);
    }
  },

  async save(roomId, data) {
    if (!roomId) return;
    // 確保深拷貝為純 JSON 物件，消除 Vue 3 Proxy 與 undefined
    const cleanData = JSON.parse(JSON.stringify(data));
    try {
      localStorage.setItem('status_board_' + roomId, JSON.stringify(cleanData));
    } catch (e) {
      console.warn("LocalStorage 寫入失敗:", e);
    }

    if (this.db) {
      try {
        // 直接覆寫整個 document，被 delete 的成員才會真正從雲端消失
        await this.db.collection("status_rooms").doc(roomId).set(cleanData);
      } catch (e) {
        console.error("雲端存檔異常:", e);
      }
    }
  },

  subscribe(roomId, onUpdate, onError) {
    if (!this.db) {
      if (onError) onError(new Error("Firebase Firestore 未啟用"));
      return () => {};
    }
    return this.db.collection("status_rooms").doc(roomId).onSnapshot((doc) => {
      if (doc.exists) {
        onUpdate(doc.data(), true /* existsInCloud */);
      } else {
        // 若為本地尚未命中的快取暫態，忽略並等候伺服器真實資料
        if (!doc.metadata || !doc.metadata.fromCache) {
          onUpdate(null, false /* existsInCloud */);
        }
      }
    }, (err) => {
      console.warn("Firestore 即時監聽失敗:", err);
      if (onError) onError(err);
    });
  },

  // 1. 匯出標準 CSV 檔案 (加入 UTF-8 BOM 避免 Excel 亂碼)
  exportCsvBackup(roomId, data) {
    const statusMap = { single: '單身', crush: '暈船', flirt: '曖昧', dating: '交往' };
    const members = data.members || {};
    const snapshots = data.snapshots || {};

    let csvContent = "\uFEFF月份,成員姓名,狀態,持續月數,頭像資料\n";

    Object.keys(snapshots).sort().forEach(month => {
      const monthData = snapshots[month] || {};
      Object.keys(monthData).forEach(memberId => {
        const mem = members[memberId] || { name: '未知' };
        const statusText = statusMap[monthData[memberId].status] || monthData[memberId].status;
        const streak = monthData[memberId].streak || 1;
        const avatar = (mem.avatar || '').replace(/"/g, '""'); // CSV 跳脫雙引號
        
        csvContent += `"${month}","${mem.name}","${statusText}","${streak}","${avatar}"\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relationship_status_${roomId}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  // 2. 匯入並解析 CSV 檔案重組資料庫結構
  importCsvBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
          if (lines.length < 2) return reject(new Error('CSV 檔案內容為空'));

          const statusReverseMap = { '單身': 'single', '暈船': 'crush', '曖昧': 'flirt', '交往': 'dating' };
          const resultData = { members: {}, snapshots: {} };

          // 跳過第一行標題
          for (let i = 1; i < lines.length; i++) {
            // 解析 CSV 格式 (支援引號包裹內容)
            const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
            const matches = [];
            let match;
            while ((match = regex.exec(lines[i])) !== null) {
              let val = match[1];
              if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1).replace(/""/g, '"');
              }
              matches.push(val);
              if (regex.lastIndex >= lines[i].length) break;
            }

            if (matches.length >= 4) {
              const [month, name, statusText, streak, avatar] = matches;
              if (!month || !name) continue;

              // 以姓名建立穩定的 member ID
              const memberId = 'm_' + encodeURIComponent(name);
              if (!resultData.members[memberId]) {
                resultData.members[memberId] = {
                  id: memberId,
                  name: name,
                  avatar: avatar || ''
                };
              }

              if (!resultData.snapshots[month]) {
                resultData.snapshots[month] = {};
              }

              const statusCode = statusReverseMap[statusText] || 'single';
              resultData.snapshots[month][memberId] = {
                status: statusCode,
                streak: parseInt(streak, 10) || 1
              };
            }
          }

          resolve(resultData);
        } catch (err) {
          reject(new Error('CSV 解析失敗：' + err.message));
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
};
