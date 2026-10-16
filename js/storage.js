window.BoardStorage = {
  db: null,

  init() {
    try {
      if (window.firebase && window.FIREBASE_CONFIG) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
        this.db = firebase.firestore();
      }
    } catch (e) {
      console.warn("Firebase 初始化失敗，使用本機模式", e);
    }
  },

  async save(roomId, data) {
    localStorage.setItem('status_board_' + roomId, JSON.stringify(data));
    if (this.db) {
      try {
        await this.db.collection("status_rooms").doc(roomId).set(data, { merge: true });
      } catch (e) {
        console.error("雲端存檔異常:", e);
      }
    }
  },

  subscribe(roomId, onUpdate) {
    if (this.db) {
      this.db.collection("status_rooms").doc(roomId).onSnapshot((doc) => {
        if (doc.exists) {
          onUpdate(doc.data());
        }
      }, (err) => console.warn("Firestore 即時監聽失敗:", err));
    }
  },

  // 需求 3：匯出完整 JSON 備份檔
  exportJsonBackup(roomId, data) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `board_backup_${roomId}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  // 需求 3：從本機檔案匯入 JSON
  importJsonBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.members || !parsed.snapshots) {
            return reject(new Error('檔案格式錯誤：缺少 members 或 snapshots 結構'));
          }
          resolve(parsed);
        } catch (err) {
          reject(new Error('JSON 格式無效'));
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
};
