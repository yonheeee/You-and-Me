// src/AppWsBridge.jsx
import { useEffect } from "react";
import { activate, deactivate, refreshToken } from "./ws/stompClient";
import { useWsStore } from "./store/wsStore";
import useUserStore from "./api/userStore";

export default function AppWsBridge() {
  const token = useUserStore((s) => s.user?.jwt);
  const addSignal = useWsStore((s) => s.addSignal);
  const addMatch = useWsStore((s) => s.addMatch);
  const clearAll = useWsStore((s) => s.clearAll);

  // 로그인/로그아웃 시
  useEffect(() => {
    if (!token) {
      // 로그아웃 또는 아직 로그인 전 → 연결 해제
      deactivate().finally(() => clearAll());
      return;
    }

    // 로그인 후 최초 1회 활성화
    activate(token, {
      onSignals: (payload) => {
        // 예: { type: 'NEW_SIGNAL', ... }
        addSignal(payload);
      },
      onMatches: (payload) => {
        // 예: { chatRoomId, partnerId, ... }
        addMatch(payload);
        // ★ 필요 시 바로 채팅 진입 트리거는 여기서
        // navigate(`/chats/${payload.chatRoomId}`)
      },
      onConnected: () => console.log("[WS] connected"),
      onDisconnected: () => console.log("[WS] disconnected"),
    });

    // 언마운트 시(페이지 완전 종료) 안전 해제
    return () => { deactivate(); };
  }, [token, addSignal, addMatch, clearAll]);

  // 토큰 갱신(리프레시) 반영: user.jwt가 바뀌면 재활성화
  useEffect(() => {
    if (!token) return;
    // 예: axios 인터셉터에서 갱신 후 user.jwt 업데이트가 이펙트를 트리거
    refreshToken(token);
  }, [token]);

  return null; // 브릿지 컴포넌트는 UI 없음
}
