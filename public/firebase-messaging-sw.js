// ✅ Firebase compat SDK import
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js");

// ✅ Firebase 초기화 (환경에 맞게 값 변경)
firebase.initializeApp({
  apiKey: "AIzaSyDrqAqjF9EYptFsoZP9MHKs2wLWn4UA8vM",
  authDomain: "youandme-6c0c3.firebaseapp.com",
  projectId: "youandme-6c0c3",
  storageBucket: "youandme-6c0c3.appspot.com",   // ← 여기 ".app" 말고 ".appspot.com" 이어야 해요!
  messagingSenderId: "458618570969",
  appId: "1:458618570969:web:fe7fb194d548f2c569d6c8",
  measurementId: "G-QLJKWSHSSN",
});

// ✅ Messaging 객체 생성
const messaging = firebase.messaging();

// ✅ 백그라운드 메시지 처리
messaging.onBackgroundMessage((payload) => {
  console.log("📩 백그라운드 메시지 수신:", payload);

  const notificationTitle = payload.notification?.title || "새 메시지 도착";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/logo192.png", // public/ 아래 아이콘 사용
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
