const { createApp, ref, computed, onMounted, nextTick } = Vue;

createApp({
  setup() {
    const columns = [
      { id: 'single', name: '單身' },
      { id: 'crush', name: '暈船' },
      { id: 'flirt', name: '曖昧' },
      { id: 'dating', name: '交往' }
    ];

    const roomId = ref(window.getAppRoomId ? window.getAppRoomId() : 'main');
    const isCloudMode = ref(false);
    const isExporting = ref(false);
    const isInherited = ref(false);
    const selectedMember = ref(null);
    const showAddModal = ref(false);

    // 日期計算
    const today = new Date();
    const currentYear = ref(today.getFullYear());
    const currentMonthNum = ref(today.getMonth() + 1);
    const currentMonth = computed(() => {
      const m = currentMonthNum.value < 10 ? '0' + currentMonthNum.value : currentMonthNum.value;
      return `${currentYear.value}/${m}`;
    });

    const defaultData = {
      members: {
        'm1': { id: 'm1', name: '小明', avatar: '' },
        'm2': { id: 'm2', name: '小美', avatar: '' }
      },
      snapshots: {}
    };

    const savedLocal = localStorage.getItem('status_board_' + roomId.value);
    const roomData = ref(savedLocal ? JSON.parse(savedLocal) : JSON.parse(JSON.stringify(defaultData)));
    const newMember = ref({ name: '', avatar: '', status: 'single' });

    // 計算前一個日曆月份的鍵值 (例如 "2026/10" -> "2026/09", "2026/01" -> "2025/12")
    const getPrevMonthKey = (monthKey) => {
      const parts = monthKey.split('/');
      let y = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      m -= 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      return `${y}/${m < 10 ? '0' + m : m}`;
    };

    // 重新計算整條歷史時間軸的所有連續月數 (溯及既往：補填過去月份會連動更新後續所有月份)
    const recalculateAllStreaks = (snapshots, members) => {
      if (!snapshots || !members) return;
      // 依時間從小到大排序 (例如 ["2026/01", "2026/02", ..., "2026/10", "2026/11"])
      const sortedMonths = Object.keys(snapshots).sort();

      sortedMonths.forEach(monthKey => {
        const prevMonthKey = getPrevMonthKey(monthKey);
        const prevSnapshot = snapshots[prevMonthKey];
        const currSnapshot = snapshots[monthKey];
        if (!currSnapshot) return;

        Object.keys(members).forEach(memberId => {
          if (!currSnapshot[memberId]) return;
          const currStatus = currSnapshot[memberId].status || 'single';
          const prevRecord = prevSnapshot ? prevSnapshot[memberId] : null;

          if (prevRecord && prevRecord.status === currStatus) {
            // 與上個連續月份狀態相同：連續月數為上個月月數 + 1
            currSnapshot[memberId].streak = (prevRecord.streak || 1) + 1;
          } else {
            // 剛切換新狀態或上個月無紀錄：連續月數重新起算為 1
            currSnapshot[memberId].streak = 1;
          }
        });
      });
    };

    // 自動繼承邏輯 (canSave 控制是否儲存至 Storage，避免載入初期誤覆寫雲端)
    const checkAndInherit = async (canSave = true) => {
      const currentKey = currentMonth.value;
      if (!roomData.value.snapshots) roomData.value.snapshots = {};
      if (!roomData.value.members) roomData.value.members = {};

      const snapshots = roomData.value.snapshots;
      const members = roomData.value.members;

      if (!snapshots[currentKey]) {
        isInherited.value = true;
        const sortedMonths = Object.keys(snapshots).sort().reverse();
        const prevMonthKey = sortedMonths.find(m => m < currentKey);
        const inherited = {};

        Object.keys(members).forEach(id => {
          const prev = prevMonthKey && snapshots[prevMonthKey] ? snapshots[prevMonthKey][id] : null;
          inherited[id] = {
            status: prev ? prev.status : 'single',
            streak: 1 // recalculateAllStreaks 會依完整歷史計算準確月數
          };
        });

        snapshots[currentKey] = inherited;
        recalculateAllStreaks(snapshots, members);
        if (canSave && window.BoardStorage) {
          await window.BoardStorage.save(roomId.value, roomData.value);
        }
      } else {
        isInherited.value = false;
        // 確保既有月份快照中包含所有既有成員（新加入成員若未登記該月份則預設補齊）
        let hasNewInSnapshot = false;
        Object.keys(members).forEach(id => {
          if (!snapshots[currentKey][id]) {
            snapshots[currentKey][id] = { status: 'single', streak: 1 };
            hasNewInSnapshot = true;
          }
        });
        recalculateAllStreaks(snapshots, members);
        if (hasNewInSnapshot && canSave && window.BoardStorage) {
          await window.BoardStorage.save(roomId.value, roomData.value);
        }
      }
      nextTick(initSortable);
      nextTick(() => { if (window.lucide) lucide.createIcons(); });
    };

    // 依狀態篩選成員（依照連續月數由高到低排序，月數相同時依 ID 穩定排序）
    const getMembersByStatus = (statusId) => {
      const currentSnapshot = (roomData.value.snapshots && roomData.value.snapshots[currentMonth.value]) || {};
      const members = roomData.value.members || {};
      return Object.keys(members)
        .filter(id => (currentSnapshot[id]?.status || 'single') === statusId)
        .map(id => ({
          ...members[id],
          status: currentSnapshot[id]?.status || 'single',
          streakMonths: currentSnapshot[id]?.streak || 1
        }))
        .sort((a, b) => {
          if (b.streakMonths !== a.streakMonths) {
            return b.streakMonths - a.streakMonths; // 連續月數越長排越前面
          }
          return a.id.localeCompare(b.id); // 月數相同時保持穩定順序
        });
    };

    // 更新成員狀態
    const updateStatus = async (memberId, newStatus) => {
      const currentKey = currentMonth.value;
      if (!roomData.value.snapshots[currentKey]) roomData.value.snapshots[currentKey] = {};

      const oldStatus = roomData.value.snapshots[currentKey][memberId]?.status;
      const isDating = newStatus === 'dating' && oldStatus !== 'dating';

      roomData.value.snapshots[currentKey][memberId] = {
        status: newStatus,
        streak: 1 // recalculateAllStreaks 會依全域歷史重新計算
      };

      // 重新計算整條歷史時間軸（補填過去月份時，後續未來月份的連續月數自動連動更新）
      recalculateAllStreaks(roomData.value.snapshots, roomData.value.members);

      selectedMember.value = null;
      if (window.BoardStorage) await window.BoardStorage.save(roomId.value, roomData.value);

      if (isDating && window.BoardUtils) window.BoardUtils.triggerConfetti();
    };

    // 月份切換
    const changeMonth = async (delta) => {
      let m = currentMonthNum.value + delta;
      let y = currentYear.value;
      if (m > 12) { m = 1; y++; }
      if (m < 1) { m = 12; y--; }
      currentMonthNum.value = m;
      currentYear.value = y;
      await checkAndInherit(true);
    };

    // 照片上傳壓縮（新增成員用）
    const onAvatarFileChange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        if (window.BoardUtils) {
          newMember.value.avatar = await window.BoardUtils.compressImage(file, 128);
        }
      } catch (err) {
        alert('照片處理失敗：' + err.message);
      }
    };

    // 更換既有成員的頭像照片
    const onEditAvatarFileChange = async (event) => {
      const file = event.target.files[0];
      if (!file || !selectedMember.value) return;
      try {
        if (window.BoardUtils) {
          const compressed = await window.BoardUtils.compressImage(file, 128);
          const memberId = selectedMember.value.id;
          if (roomData.value.members && roomData.value.members[memberId]) {
            roomData.value.members[memberId].avatar = compressed;
          }
          selectedMember.value.avatar = compressed;
          if (window.BoardStorage) {
            await window.BoardStorage.save(roomId.value, roomData.value);
          }
        }
      } catch (err) {
        alert('頭像更換失敗：' + err.message);
      }
      event.target.value = '';
    };

    // 新增成員
    const addMember = async () => {
      if (!newMember.value.name.trim()) return;
      const newId = 'm_' + Date.now();
      if (!roomData.value.members) roomData.value.members = {};

      roomData.value.members[newId] = {
        id: newId,
        name: newMember.value.name.trim(),
        avatar: newMember.value.avatar || ''
      };
      if (!roomData.value.snapshots) roomData.value.snapshots = {};
      if (!roomData.value.snapshots[currentMonth.value]) roomData.value.snapshots[currentMonth.value] = {};
      roomData.value.snapshots[currentMonth.value][newId] = {
        status: newMember.value.status || 'single',
        streak: 1
      };
      recalculateAllStreaks(roomData.value.snapshots, roomData.value.members);
      newMember.value = { name: '', avatar: '', status: 'single' };
      showAddModal.value = false;
      if (window.BoardStorage) await window.BoardStorage.save(roomId.value, roomData.value);
      nextTick(() => { if (window.lucide) lucide.createIcons(); });
    };

    // 移除成員
    // 修改 js/app.js 中的 removeMember
const removeMember = async (id) => {
  if (!confirm('確定要從房間刪除此成員嗎？')) return;

  // 1. 從成員名單移除
  if (roomData.value.members) {
    delete roomData.value.members[id];
  }

  // 2. 同步清理所有月份的快照紀錄（避免換月時又被自動繼承出來）
  if (roomData.value.snapshots) {
    Object.keys(roomData.value.snapshots).forEach(month => {
      if (roomData.value.snapshots[month]) {
        delete roomData.value.snapshots[month][id];
      }
    });
  }

  selectedMember.value = null;

  // 3. 儲存覆寫到雲端與本機
  if (window.BoardStorage) {
    await window.BoardStorage.save(roomId.value, roomData.value);
  }
};

    // CSV 匯出
    const exportData = () => {
      if (window.BoardStorage) {
        window.BoardStorage.exportCsvBackup(roomId.value, roomData.value);
      }
    };

    // CSV 匯入
    const importData = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        if (window.BoardStorage) {
          const imported = await window.BoardStorage.importCsvBackup(file);
          if (confirm('匯入將會覆寫目前的看板資料，確定要覆蓋嗎？')) {
            roomData.value = imported;
            recalculateAllStreaks(roomData.value.snapshots, roomData.value.members);
            await window.BoardStorage.save(roomId.value, roomData.value);
            await checkAndInherit(true);
            alert('CSV 資料庫匯入成功！');
          }
        }
      } catch (err) {
        alert('匯入失敗：' + err.message);
      }
      event.target.value = '';
    };

    // 限動圖片匯出
    const exportStory = async () => {
      isExporting.value = true;
      if (window.BoardUtils) {
        await window.BoardUtils.exportToStoryImage('capture-board', currentMonth.value);
      }
      isExporting.value = false;
    };

    const copyRoomLink = () => {
      navigator.clipboard.writeText(window.location.href);
      alert('看板連結已複製！');
    };

    // 拖曳功能綁定
    const initSortable = () => {
      if (!window.Sortable) return;
      columns.forEach(col => {
        const el = document.getElementById('col-' + col.id);
        if (!el || el._sortable) return;
        el._sortable = Sortable.create(el, {
          group: 'status-group',
          animation: 150,
          onEnd: (evt) => {
            const memberId = evt.item.getAttribute('data-id');
            const targetStatus = evt.to.getAttribute('data-status');
            if (memberId && targetStatus) updateStatus(memberId, targetStatus);
          }
        });
      });
    };

    // 監聽網址 Hash 變換（切換房間自動重載）
    window.addEventListener('hashchange', () => {
      const newRoom = window.getAppRoomId ? window.getAppRoomId() : 'main';
      if (newRoom !== roomId.value) {
        window.location.reload();
      }
    });

    onMounted(async () => {
      if (window.lucide) lucide.createIcons();
      initSortable();

      let isInitialSyncDone = false;

      if (window.BoardStorage) {
        window.BoardStorage.init();

        if (window.BoardStorage.db) {
          window.BoardStorage.subscribe(roomId.value, async (cloudData, exists) => {
            if (exists && cloudData) {
              // 雲端已有本房間資料，以雲端為準載入
              roomData.value = {
                members: cloudData.members || {},
                snapshots: cloudData.snapshots || {}
              };
              recalculateAllStreaks(roomData.value.snapshots, roomData.value.members);
              localStorage.setItem('status_board_' + roomId.value, JSON.stringify(roomData.value));
              isCloudMode.value = true;
              isInitialSyncDone = true;
              await checkAndInherit(true);
            } else {
              // 雲端尚無此房間紀錄（全新房間），才使用本機或預設資料建立
              if (!isInitialSyncDone) {
                isCloudMode.value = true;
                isInitialSyncDone = true;
                await checkAndInherit(false);
                await window.BoardStorage.save(roomId.value, roomData.value);
              }
            }
          }, (err) => {
            console.warn("雲端即時連線異常，切換至本機離線模式", err);
            isCloudMode.value = false;
            if (!isInitialSyncDone) {
              isInitialSyncDone = true;
              checkAndInherit(true);
            }
          });
          return;
        }
      }

      // 若未啟用 Firebase 則使用純本機模式
      isCloudMode.value = false;
      isInitialSyncDone = true;
      await checkAndInherit(true);
    });

    return {
      columns, currentMonth, isInherited, isCloudMode, isExporting,
      selectedMember, showAddModal, newMember,
      getMembersByStatus, updateStatus, changeMonth, addMember, removeMember,
      onAvatarFileChange, onEditAvatarFileChange, exportData, importData, exportStory, copyRoomLink
    };
  }
}).mount('#app');
