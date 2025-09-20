// src/api/userStore.js
import { create } from "zustand";
import { persist /*, createJSONStorage*/ } from "zustand/middleware";

const STORAGE_KEY = "user-storage";

const initial = {
  user: null, // { accessToken, ... }
  jwt: null,
  firebaseCustomToken: null,
  isInitialized: false,
};

const useUserStore = create(
  persist(
    (set, get) => ({
      ...initial,

      // 객체 또는 함수(updater) 허용
      setUser: (userOrUpdater) => {
        if (typeof userOrUpdater === "function") {
          set((state) => {
            const prev = state.user || {};
            const next = userOrUpdater(prev) || {};
            console.log("🟢 [UserStore] setUser (updater):", next);
            return { user: next };
          });
        } else {
          console.log("🟢 [UserStore] setUser (replace):", userOrUpdater);
          set({ user: userOrUpdater });
        }
      },

      // 부분 병합
      updateUser: (patch) => {
        const prev = get().user || {};
        const next = { ...prev, ...patch };
        console.log("🟢 [UserStore] updateUser (merge):", patch, "=>", next);
        set({ user: next });
      },

      // accessToken만 교체(리프레시에서 사용)
      setAccessToken: (accessToken) => {
        const prev = get().user || {};
        const next = { ...prev, accessToken };
        console.log("🟢 [UserStore] setAccessToken:", !!accessToken);
        set({ user: next });
      },

      // 크레딧 전용
      updateCredits: ({ matchCredits, signalCredits }) => {
        const prev = get().user || {};
        const next = {
          ...prev,
          matchCredits:
            matchCredits !== undefined ? matchCredits : prev.matchCredits,
          signalCredits:
            signalCredits !== undefined ? signalCredits : prev.signalCredits,
        };
        console.log("🟢 [UserStore] updateCredits:", { matchCredits, signalCredits }, "=>", next);
        set({ user: next });
      },

      setJwt: (jwt) => {
        console.log("🟢 [UserStore] setJwt:", !!jwt);
        set({ jwt });
      },

      setFirebaseCustomToken: (firebaseCustomToken) => {
        console.log("🟢 [UserStore] setFirebaseCustomToken:", !!firebaseCustomToken);
        set({ firebaseCustomToken });
      },

      // ✅ 로그아웃 단일 진입점
      clearAuth: () => {
        console.log("🔴 [UserStore] clearAuth");
        set({ user: null, jwt: null, firebaseCustomToken: null });
      },

      // 하위호환 별칭
      clearUser: () => {
        console.log("🔴 [UserStore] clearUser -> clearAuth");
        get().clearAuth();
      },
      logout: () => {
        console.log("🔴 [UserStore] logout -> clearAuth");
        get().clearAuth();
      },

      setInitialized: (value) => {
        console.log("⚙️ [UserStore] setInitialized:", value);
        set({ isInitialized: value });
      },
    }),
    {
      name: STORAGE_KEY,
      // storage: createJSONStorage(() => localStorage),

      // 스토리지 복원 완료 시점 표시
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("❌ [UserStore] Rehydrate error:", error);
        }
        state?.setInitialized?.(true);
      },

      version: 1,
    }
  )
);

export default useUserStore;
