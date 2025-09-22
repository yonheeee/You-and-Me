// src/App.jsx
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import AppRouter from "./Router";
import { willExpireSoon, refreshAccessToken } from "./api/axios";
import useUserStore from "./api/userStore.js";
import { auth } from "./libs/firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import Loader from "./jsx/common/Loader.jsx";
import { Client as StompClient } from "@stomp/stompjs";

/** STOMP 구독 대상: 컴포넌트 외부에 둬서 재생성 방지 */
const DEST = {
  signals: "/user/queue/signals",
  matches: "/user/queue/matches",
};

export default function App() {
  const { isInitialized, setInitialized } = useUserStore();
  const user = useUserStore((s) => s.user);
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
        const access = useUserStore.getState().user?.accessToken;
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

  /** ========= STOMP ========= */
  const stompRef = useRef(null);
  const reconnectTimer = useRef(null);

  // API/WS URL 계산: 메모이즈로 고정
  const API_BASE_URL = useMemo(() => {
    const fromVite =
      typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL;
    const fromCRA = process.env.REACT_APP_API_URL;
    return (fromVite || fromCRA || "http://localhost:4000/api").trim();
  }, []);

  const WS_URL = useMemo(
    () => API_BASE_URL.replace(/\/+$/, "") + "/ws",
    [API_BASE_URL]
  );

  const WS_BROKER_URL = useMemo(
    () =>
      WS_URL.startsWith("https")
        ? WS_URL.replace(/^https/, "wss")
        : WS_URL.replace(/^http/, "ws"),
    [WS_URL]
  );

  // 최신 connectStomp 참조를 위한 ref(타이머 콜백에서 사용)
  const connectStompRef = useRef(null);

  /** STOMP 연결 함수: useCallback으로 고정 */
  const connectStomp = useCallback(
    (token) => {
      if (!token) return;

      // 예정된 재연결 제거(중복 연결 방지)
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      // 기존 클라이언트 정리
      if (stompRef.current) {
        try {
          stompRef.current.deactivate();
        } catch {}
        stompRef.current = null;
      }

      const client = new StompClient({
        brokerURL: WS_BROKER_URL,
        connectHeaders: { Authorization: `Bearer ${token}` },
        debug:
          process.env.NODE_ENV === "development"
            ? (str) => console.log("[STOMP] ", str)
            : undefined,
        reconnectDelay: 0, // 직접 타이머로 재연결 관리
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          console.log("[STOMP] connected");

          client.subscribe(DEST.signals, (msg) => {
            try {
              const payload = JSON.parse(msg.body);
              window.dispatchEvent(new CustomEvent("rt:signal", { detail: payload }));
            } catch (e) {
              console.warn("signals payload parse error:", e);
            }
          });

          client.subscribe(DEST.matches, (msg) => {
            try {
              const payload = JSON.parse(msg.body);
              window.dispatchEvent(new CustomEvent("rt:match", { detail: payload }));
            } catch (e) {
              console.warn("matches payload parse error:", e);
            }
          });
        },
        onStompError: (frame) => {
          console.error("[STOMP] broker error", frame.headers["message"], frame.body);
        },
        onWebSocketError: (e) => {
          console.error("[STOMP] ws error", e);
        },
        onWebSocketClose: () => {
          console.warn("[STOMP] closed, will try reconnect in 3s");
          if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
          reconnectTimer.current = setTimeout(() => {
            const fresh = useUserStore.getState().user?.accessToken;
            connectStompRef.current?.(fresh);
          }, 3000);
        },
      });

      stompRef.current = client;
      client.activate();
    },
    [WS_BROKER_URL]
  );

  // 최신 connectStomp를 ref에 유지
  useEffect(() => {
    connectStompRef.current = connectStomp;
  }, [connectStomp]);

  // 토큰 변경 시 연결/재연결
  useEffect(() => {
    const token = user?.accessToken;
    if (token) connectStomp(token);

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [user?.accessToken, connectStomp]);

  // 언마운트 정리
  useEffect(() => {
    return () => {
      if (stompRef.current) {
        try {
          stompRef.current.deactivate();
        } catch {}
        stompRef.current = null;
      }
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
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
      <AppRouter />
    </div>
  );
}
