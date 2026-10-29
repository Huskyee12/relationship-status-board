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
    const canvas = await html2canvas(el, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#23473f',
      onclone: (clonedDoc) => {
        // 1. 徹底解決 html2canvas 截斷成員名字底部的問題：
        // 解除 overflow: hidden 遮罩，並給予充足的行高與底部空間
        const nameElements = clonedDoc.querySelectorAll('.member-name');
        nameElements.forEach(nameEl => {
          nameEl.style.overflow = 'visible';
          nameEl.style.textOverflow = 'clip';
          nameEl.style.whiteSpace = 'nowrap';
          nameEl.style.lineHeight = '1.5';
          nameEl.style.paddingBottom = '6px';
          nameEl.style.display = 'block';
        });

        // 2. 徹底隱藏不需要出現在限動圖片上的元素（切換箭頭、繼承狀態提示）
        const ignoredElements = clonedDoc.querySelectorAll('[data-html2canvas-ignore]');
        ignoredElements.forEach(item => {
          item.style.display = 'none';
        });
      }
    });
    const link = document.createElement('a');
    link.download = `Status-Board-${monthStr.replace('/', '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
};
