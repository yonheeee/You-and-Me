// src/AppWsBridge.jsx
import { useEffect } from "react";
import useUserStore from "./api/userStore";
import { connect, disconnect } from "./ws/stompClient";
import useWsStore from "./api/wsStore";

export default function AppWsBridge() {
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    console.log("[WS] AppWsBridge effect 실행됨, user:", user);

    if (!user?.jwt) {
      console.warn("[WS] jwt 없음 → 연결 시도 안 함");
      return;
    }

    console.log("[WS] jwt 감지됨 → connect 실행:", user.jwt);

    connect(user.jwt, {
      onSignal: (payload) => {
        console.log("📩 [WS] signal 수신:", payload);
        useWsStore.getState().pushSignal(payload);
      },
      onMatch: (payload) => {
        console.log("📩 [WS] match 수신:", payload);
        useWsStore.getState().pushMatch(payload);
      },
    });

    return () => {
      console.log("[WS] AppWsBridge cleanup 실행 → disconnect 호출");
      disconnect();
    };
  }, [user?.jwt]);

  return null; // UI 없음, 브릿지 역할만
}
