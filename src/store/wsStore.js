// src/store/wsStore.js
import { create } from "zustand";

export const useWsStore = create((set, get) => ({
  signals: [],          // 수신된 시그널 리스트(필요시)
  matches: [],          // 매칭 성사 이벤트 기록
  unreadSignals: 0,     // 메뉴 빨간 점/배지용
  unreadChats: 0,       // (채팅 별도 신호가 있다면)

  addSignal: (data) =>
    set((s) => ({
      signals: [data, ...s.signals].slice(0, 50),
      unreadSignals: s.unreadSignals + 1,
    })),

  addMatch: (data) =>
    set((s) => ({
      matches: [data, ...s.matches].slice(0, 50),
      // 매칭 성사 시: 알림 제거(규칙대로)
      unreadSignals: 0,
    })),

  clearAll: () => set({ signals: [], matches: [], unreadSignals: 0 }),
}));