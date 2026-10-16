const { createApp, ref, computed, onMounted, nextTick } = Vue;

createApp({
  setup() {
    const columns = [
      { id: 'single', name: '單身' },
      { id: 'crush', name: '暈船' },
      { id: 'flirt', name: '曖昧' },
      { id: 'dating', name: '交往' }
    ];

    const roomId = ref(window.getAppRoomId());
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
    const roomData = ref(savedLocal ? JSON.parse(savedLocal) : defaultData);
    const newMember = ref({ name: '', avatar: '', status: 'single' });

    const checkAndInherit = async () => {
      const currentKey = currentMonth.value;
      const snapshots = roomData.value.snapshots || {};

      if (!snapshots[currentKey]) {
        isInherited.value = true;
        const sortedMonths = Object.keys(snapshots).sort().reverse();
        const prevMonthKey = sortedMonths.find(m => m < currentKey);
        const inherited = {};

        const members = roomData.value.members || {};
        Object.keys(members).forEach(id => {
          const prev = prevMonthKey && snapshots[prevMonthKey] ? snapshots[prevMonthKey][id] : null;
          inherited[id] = {
            status: prev ? prev.status : 'single',
            streak: prev ? (prev.streak || 1) + 1 : 1
          };
        });

        roomData.value.snapshots[currentKey] = inherited;
        await window.BoardStorage.save(roomId.value, roomData.value);
      } else {
        isInherited.value = false;
      }
      nextTick(initSortable);
    };

    const getMembersByStatus = (statusId) => {
      const currentSnapshot = (roomData.value.snapshots && roomData.value.snapshots[currentMonth.value]) || {};
      const members = roomData.value.members || {};
      return Object.keys(members)
        .filter(id => (currentSnapshot[id]?.status || 'single') === statusId)
        .map(id => ({
          ...members[id],
          status: currentSnapshot[id]?.status || 'single',
          streakMonths: currentSnapshot[id]?.streak || 1
        }));
    };

    const updateStatus = async (memberId, newStatus) => {
      const currentKey = currentMonth.value;
      if (!roomData.value.snapshots[currentKey]) roomData.value.snapshots[currentKey] = {};

      const oldStatus = roomData.value.snapshots[currentKey][memberId]?.status;
      const isDating = newStatus === 'dating' && oldStatus !== 'dating';

      roomData.value.snapshots[currentKey][memberId] = {
        status: newStatus,
        streak: oldStatus === newStatus ? (roomData.value.snapshots[currentKey][memberId]?.streak || 1) : 1
      };

      selectedMember.value = null;
      await window.BoardStorage.save(roomId.value, roomData.value);

      if (isDating) window.BoardUtils.triggerConfetti();
    };

    const changeMonth = (delta) => {
      let m = currentMonthNum.value + delta;
      let y = currentYear.value;
      if (m > 12) { m = 1; y++; }
      if (m < 1) { m = 12; y--; }
      currentMonthNum.value = m;
      currentYear.value = y;
      checkAndInherit();
    };

    // 需求 2：檔案上傳處理
    const onAvatarFileChange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        newMember.value.avatar = await window.BoardUtils.compressImage(file, 128);
      } catch (err) {
        alert(err.message);
      }
    };

    const addMember = async () => {
      if (!newMember.value.name.trim()) return;
      const newId = 'm_' + Date.now();
      if (!roomData.value.members) roomData.value.members = {};

      roomData.value.members[newId] = {
        id: newId,
        name: newMember.value.name.trim(),
        avatar: newMember.value.avatar
      };
      if (!roomData.value.snapshots[currentMonth.value]) roomData.value.snapshots[currentMonth.value] = {};
      roomData.value.snapshots[currentMonth.value][newId] = {
        status: newMember.value.status,
        streak: 1
      };
      newMember.value = { name: '', avatar: '', status: 'single' };
      showAddModal.value = false;
      await window.BoardStorage.save(roomId.value, roomData.value);
    };

    const removeMember = async (id) => {
      if (!confirm('確定要從房間刪除此成員嗎？')) return;
      delete roomData.value.members[id];
      selectedMember.value = null;
      await window.BoardStorage.save(roomId.value, roomData.value);
    };

    // 需求 3：匯出與匯入處理
    const exportData = () => {
      window.BoardStorage.exportJsonBackup(roomId.value, roomData.value);
    };

    const importData = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const imported = await window.BoardStorage.importJsonBackup(file);
        if (confirm('匯入將會覆寫現有資料，確定繼續嗎？')) {
          roomData.value = imported;
          await window.BoardStorage.save(roomId.value, roomData.value);
          checkAndInherit();
          alert('資料匯入成功！');
        }
      } catch (err) {
        alert('匯入失敗：' + err.message);
      }
      event.target.value = ''; // 重置 input
    };

    const exportStory = async () => {
      isExporting.value = true;
      await window.BoardUtils.exportToStoryImage('capture-board', currentMonth.value);
      isExporting.value = false;
    };

    const copyRoomLink = () => {
      navigator.clipboard.writeText(window.location.href);
      alert('看板連結已複製！發到群組大家點開即是同一個畫面。');
    };

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

    onMounted(() => {
      if (window.lucide) lucide.createIcons();
      window.BoardStorage.init();
      isCloudMode.value = !!window.BoardStorage.db;

      window.BoardStorage.subscribe(roomId.value, (cloudData) => {
        roomData.value = cloudData;
        checkAndInherit();
      });

      checkAndInherit();
    });

    return {
      columns, currentMonth, isInherited, isCloudMode, isExporting,
      selectedMember, showAddModal, newMember,
      getMembersByStatus, updateStatus, changeMonth, addMember, removeMember,
      onAvatarFileChange, exportData, importData, exportStory, copyRoomLink
    };
  }
}).mount('#app');
