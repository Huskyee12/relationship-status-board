window.BoardUtils = {
  // 需求 2：本機照片讀取並自動壓縮至 128x128
  compressImage(file, maxSize = 128) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error('請選擇圖片檔案'));
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 保持正方形置中裁切
          const minSide = Math.min(width, height);
          const startX = (width - minSide) / 2;
          const startY = (height - minSide) / 2;

          canvas.width = maxSize;
          canvas.height = maxSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, maxSize, maxSize);
          
          // 輸出壓縮後的 WebP/JPEG Base64 字串
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => reject(new Error('圖片載入失敗'));
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // 脫單拉炮特效
  triggerConfetti() {
    if (window.confetti) {
      confetti({ particleCount: 90, spread: 60, origin: { y: 0.7 } });
    }
  },

  // 匯出限動圖片
  async exportToStoryImage(elementId, monthStr) {
    const el = document.getElementById(elementId);
    if (!el || !window.html2canvas) return;
    const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#23473f' });
    const link = document.createElement('a');
    link.download = `Status-Board-${monthStr.replace('/', '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
};
