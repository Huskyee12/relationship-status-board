// Firebase 專案連線設定
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCRcwwiQJnyR4jdfq1kLIIvhj-affOQxlQ",
  authDomain: "relationship-status-78aa0.firebaseapp.com",
  projectId: "relationship-status-78aa0",
  storageBucket: "relationship-status-78aa0.firebasestorage.app",
  messagingSenderId: "423950657383",
  appId: "1:423950657383:web:13b057f3fb1881326c31c2"
};

// 需求 1：固定預設全域房間為 main
window.getAppRoomId = function() {
  const hash = window.location.hash;
  const match = hash.match(/room=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // 若使用者點進純網址，強制鎖定預設大廳房間 'main'
  const defaultRoom = 'main';
  window.location.hash = 'room=' + defaultRoom;
  return defaultRoom;
};
