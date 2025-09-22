// src/api/wsStore.js
import { create } from "zustand";

const useWsStore = create((set) => ({
  signals: [],   // 실시간 받은 signal 이벤트들
  matches: [],   // 실시간 받은 match 이벤트들

  // 📩 새 signal 추가
  pushSignal: (payload) =>
    set((state) => ({
      signals: [...state.signals, payload],
    })),

  // 📩 새 match 추가
  pushMatch: (payload) =>
    set((state) => ({
      matches: [...state.matches, payload],
    })),

  // ✨ 초기화 메서드
  clearSignals: () => set({ signals: [] }),
  clearMatches: () => set({ matches: [] }),
}));

export default useWsStore;
