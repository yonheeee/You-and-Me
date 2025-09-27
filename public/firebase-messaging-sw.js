// public/firebase-messaging-sw.js

// Firebase SDK import
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging.js");

// Firebase 프로젝트 설정 (하드코딩된 값)
firebase.initializeApp({
  apiKey: "AIzaSyDrqAqjF9EYptFsoZP9MHKs2wLWn4UA8vM",
  authDomain: "youandme-6c0c3.firebaseapp.com",
  projectId: "youandme-6c0c3",
  storageBucket: "youandme-6c0c3.firebasestorage.app",
  messagingSenderId: "458618570969",
  appId: "1:458618570969:web:fe7fb194d548f2c569d6c8",
  measurementId: "G-QLJKWSHSSN",
});

// Messaging 인스턴스 가져오기
const messaging = firebase.messaging();

// 백그라운드 메시지 처리
messaging.onBackgroundMessage((payload) => {
  console.log("📩 백그라운드 메시지:", payload);

  const notificationTitle = payload.notification?.title || "새 알림";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/logo192.png", // 앱 아이콘 (public/ 안에 있는 아이콘 경로로 변경 가능)
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
