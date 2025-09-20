// src/api/chatStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import useUserStore from "./userStore"; // ✅ 추가: userStore 구독

const useChatStore = create(
  persist(
    (set, get) => ({
      rooms: [],

      setRooms: (rooms) => set({ rooms }),

      updateRoomLastMessage: (roomId, lastMessage) =>
        set((state) => ({
          rooms: state.rooms.map((room) =>
            room.roomId === roomId ? { ...room, lastMessage } : room
          ),
        })),

      clearRooms: () => set({ rooms: [] }),

      // ✅ 삭제된 방 관리
      deletedRoomIds: [],
      addDeletedRoom: (roomId) =>
        set((state) => ({
          deletedRoomIds: [...new Set([...state.deletedRoomIds, roomId])],
        })),
      clearDeletedRoom: (roomId) =>
        set((state) => ({
          deletedRoomIds: state.deletedRoomIds.filter((id) => id !== roomId),
        })),

      // 전체 초기화
      resetChatStore: () => set({ rooms: [], deletedRoomIds: [] }),
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({
        rooms: state.rooms,
        deletedRoomIds: state.deletedRoomIds,
      }),
      // (선택) 버전/복원 훅
      version: 1,
      onRehydrateStorage: () => (state, err) => {
        if (err) console.error("❌ [ChatStore] Rehydrate error:", err);
      },
    }
  )
);

// 🔗 로그아웃/리프레시 실패로 accessToken이 사라지면 채팅 스토어도 리셋
useUserStore.subscribe(
  (s) => s.user?.accessToken,
  (token) => {
    if (!token) {
      // 이전 계정 데이터 잔존 방지
      useChatStore.getState().resetChatStore();
      try { localStorage.removeItem("chat-storage"); } catch {}
    }
  }
);

// 🔁 계정 전환(유저 ID 변경) 시에도 리셋
useUserStore.subscribe(
  (s) => s.user?.id,
  (id, prevId) => {
    if (prevId && id && prevId !== id) {
      useChatStore.getState().resetChatStore();
    }
  }
);

export default useChatStore;
