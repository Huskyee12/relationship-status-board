// Firebase 專案連線設定
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCRcwwiQJnyR4jdfq1kLIIvhj-affOQxlQ",
  authDomain: "relationship-status-78aa0.firebaseapp.com",
  projectId: "relationship-status-78aa0",
  storageBucket: "relationship-status-78aa0.firebasestorage.app",
  messagingSenderId: "423950657383",
  appId: "1:423950657383:web:13b057f3fb1881326c31c2",
  // 若在 Firebase 後台啟用 App Check (reCAPTCHA v3 / Enterprise)，可在此填入 Site Key
  appCheckSiteKey: ""
};

// 高熵私密房間 ID 生成器 (密碼學等級隨機字串，20位元組，數學上無法暴力破解)
window.generateSecureRoomId = function() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(20);
  (window.crypto || window.msCrypto).getRandomValues(array);
  let result = 'room_';
  for (let i = 0; i < array.length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
};

// 取得或分配當前房間 ID
window.getAppRoomId = function() {
  const hash = window.location.hash;
  const match = hash.match(/room=([a-zA-Z0-9_-]+)/);
  if (match) {
    const id = match[1];
    try { localStorage.setItem('last_active_room', id); } catch (e) {}
    return id;
  }

  // 若使用者點進純網址，優先讀取上次使用的房間，若無則保留 'main'
  let savedRoom = 'main';
  try {
    savedRoom = localStorage.getItem('last_active_room') || 'main';
  } catch (e) {}

  window.location.hash = 'room=' + savedRoom;
  return savedRoom;
};
