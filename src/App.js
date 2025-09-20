// src/App.jsx
import React, { useEffect, useState } from "react";
import AppRouter from "./Router";
import { willExpireSoon, refreshAccessToken } from "./api/axios";
import useUserStore from "./api/userStore.js";

import { auth } from "./libs/firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import Loader from "./jsx/common/Loader.jsx";

export default function App() {
  const { isInitialized, setInitialized } = useUserStore();
  const [authReady, setAuthReady] = useState(false);

  // Firebase 익명 로그인 (앱 시작 시 1회)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("[Auth] anonymous sign-in failed", e);
      } finally {
        setAuthReady(true);
      }
    });
    return unsub;
  }, []);

  // 부팅 시 리프레시 시도 (만료 임박/무토큰 모두)
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const access = useUserStore.getState().user?.accessToken;

        // 1) 토큰이 있으면 만료 임박 시 갱신
        if (access && willExpireSoon(access, 90)) {
          await refreshAccessToken().catch(() => {});
        }

        // 2) 토큰이 없어도 httpOnly refresh 쿠키가 살아있다면 자동 로그인 복구
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

  // 인증/부팅 둘 다 준비되면 렌더
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
      <AppRouter />
    </div>
  );
}
