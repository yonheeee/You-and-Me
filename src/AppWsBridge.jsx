// src/AppWsBridge.jsx
import { useEffect } from "react";
import useUserStore from "./api/userStore";
import { connect, disconnect } from "./ws/stompClient";
import useWsStore from "./api/wsStore"; // 실시간 이벤트 저장소

export default function AppWsBridge() {
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    if (!user?.jwt) return;

    // ✅ 연결 시작
    connect(user.jwt, {
      onSignal: (payload) => {
        console.log("📩 signal 수신:", payload);
        useWsStore.getState().pushSignal(payload);
      },
      onMatch: (payload) => {
        console.log("📩 match 수신:", payload);
        useWsStore.getState().pushMatch(payload);
      },
    });

    // ✅ 언마운트 시 정리
    return () => {
      disconnect();
    };
  }, [user?.jwt]);

  return null; // UI는 없음, 브릿지 역할만
}
