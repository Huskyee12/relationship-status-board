// 在 js/app.js 中替換/確認以下這幾個函式：

// 需求 1：匯出 CSV
const exportData = () => {
  window.BoardStorage.exportCsvBackup(roomId.value, roomData.value);
};

// 需求 1：匯入 CSV
const importData = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = await window.BoardStorage.importCsvBackup(file);
    if (confirm('匯入將會覆寫目前的看板資料，確定要覆蓋嗎？')) {
      roomData.value = imported;
      await window.BoardStorage.save(roomId.value, roomData.value);
      checkAndInherit();
      alert('CSV 資料庫匯入成功！');
    }
  } catch (err) {
    alert('匯入失敗：' + err.message);
  }
  event.target.value = ''; // 重置 input 讓同檔名可以重複觸發
};

// 需求 2：選取照片時觸發前端自動縮圖壓縮
const onAvatarFileChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    newMember.value.avatar = await window.BoardUtils.compressImage(file, 128);
  } catch (err) {
    alert('照片處理失敗：' + err.message);
  }
};
