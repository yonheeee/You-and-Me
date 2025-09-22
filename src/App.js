// src/App.jsx
import React, { useEffect, useState } from "react";
import AppRouter from "./Router";
import { willExpireSoon, refreshAccessToken } from "./api/axios";
import useUserStore from "./api/userStore.js";
import { auth } from "./libs/firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import Loader from "./jsx/common/Loader.jsx";

/** 🔔 알림 시스템 */
import ToastCenter from "./jsx/common/ToastCenter.jsx";
import useRealtimeNotifications from "./hooks/useRealtimeNotifications.js";
import useNotifyStore from "./api/notifyStore";
import AppWsBridge from "./AppWsBridge.jsx";

export default function App() {
  const { isInitialized, setInitialized } = useUserStore();
  const [authReady, setAuthReady] = useState(false);

  /** ========= Firebase 익명 인증 준비 ========= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) await signInAnonymously(auth);
      } catch (e) {
        console.error("[Auth] anonymous sign-in failed", e);
      } finally {
        setAuthReady(true);
      }
    });
    return unsub;
  }, []);

  /** ========= 앱 초기 부팅(토큰 갱신) ========= */
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const access = useUserStore.getState().user?.jwt; // ✅ AppWsBridge와 통일
        if (access && willExpireSoon(access, 90)) {
          await refreshAccessToken().catch(() => {});
        }
        if (!access) {
          await refreshAccessToken().catch(() => {});
        }
      } catch (e) {
        console.error("초기 부팅 중 오류:", e);
      } finally {
        setInitialized(true);
      }
    };
    bootstrap();
  }, [setInitialized]);

  /** ========= 🔔 실시간 알림 변환 & 네이티브 권한 ========= */
  useRealtimeNotifications();

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      useNotifyStore.getState().enableNative();
      return;
    }
    if (Notification.permission !== "denied") {
      Notification.requestPermission().then((res) => {
        if (res === "granted") useNotifyStore.getState().enableNative();
      });
    }
  }, []);

  if (!isInitialized || !authReady) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <Loader />
      </div>
    );
  }

  return (
    <div className="App">
      {/* ✅ STOMP 연결은 AppWsBridge 단일 진입 */}
      <AppWsBridge />
      <AppRouter />
      <ToastCenter />
    </div>
  );
}
