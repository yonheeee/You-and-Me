// src/libs/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// ✅ .env에서 Firebase 설정 가져오기
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firestore & Auth 초기화
const db = getFirestore(app);
const auth = getAuth(app);

// 🔔 Messaging 초기화
let messaging;
try {
  messaging = getMessaging(app);
} catch (err) {
  console.warn("Messaging 초기화 실패:", err);
}

// ✅ 로그인 후 호출해서 토큰 발급 + Firestore 저장
export async function requestFcmToken(userId) {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("알림 권한 거부됨");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY, // 콘솔에서 생성한 웹푸시 인증서 키
    });

    if (token) {
      // Firestore users/{uid} 문서에 fcmToken 저장
      await setDoc(doc(db, "users", userId), { fcmToken: token }, { merge: true });
      console.log("📌 저장된 FCM 토큰:", token);
    }
    return token;
  } catch (err) {
    console.error("FCM 토큰 발급 실패:", err);
    return null;
  }
}

// ✅ 앱이 열려 있을 때 알림 수신
export function listenForegroundMessages() {
  if (!messaging) return;
  onMessage(messaging, (payload) => {
    console.log("💌 포그라운드 메시지 수신:", payload);
    alert(payload.notification?.title + "\n" + payload.notification?.body);
  });
}

export { db, auth };
