// public/firebase-messaging-sw.js

// ✅ FCM은 8.x 호환 빌드를 import해야 ServiceWorker에서 동작
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");

// ✅ Firebase 설정 (env 값 그대로 넣어도 됨, 어차피 공개 키라 괜찮음)
firebase.initializeApp({
  apiKey: "AIzaSyDrqAqjF9EYptFsoZP9MHKs2wLWn4UA8vM",
  authDomain: "youandme-6c0c3.firebaseapp.com",
  projectId: "youandme-6c0c3",
  storageBucket: "youandme-6c0c3.appspot.com",
  messagingSenderId: "458618570969",
  appId: "1:458618570969:web:fe7fb194d548f2c569d6c8",
  measurementId: "G-QLJKWSHSSN",
});

// ✅ 백그라운드 메시지 처리
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("📩 백그라운드 메시지:", payload);

  const notificationTitle = payload.notification?.title || "새 메시지";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/logo192.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
