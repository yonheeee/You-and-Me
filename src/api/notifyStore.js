import { create } from "zustand";

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const useNotifyStore = create((set, get) => ({
  toasts: [],
  unread: { chat: 0, signal: 0, match: 0, other: 0 },

  enqueue: (toast) => {
    const id = toast.id ?? genId();
    const kind = toast.kind ?? "other";
    const key = toast.key ?? `${kind}-${toast.payload?.signalId ?? toast.payload?.matchId ?? ""}`;

    // Deduplication: 동일 key가 이미 있으면 skip
    if (key && get().toasts.some((x) => x.key === key)) return null;

    const t = { id, key, ts: Date.now(), duration: toast.duration ?? 4000, ...toast };

    set((s) => ({
      toasts: [...s.toasts, t].slice(-5),
      unread: {
        ...s.unread,
        [kind]: Math.min((s.unread[kind] ?? 0) + 1, 99), // cap 99
      },
    }));

    // 네이티브 알림
    try {
      if (get().nativeEnabled) get().notifyNative(t);
    } catch {}

    // 모바일 진동
    if (navigator?.vibrate) navigator.vibrate([40, 30, 40]);

    return id;
  },

  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  clear: () => set({ toasts: [] }),

  markRead: (bucket) =>
    set((s) => ({ unread: { ...s.unread, [bucket]: 0 } })),

  // 네이티브 Notification API
  nativeEnabled: false,
  enableNative: () => set({ nativeEnabled: true }),
  notifyNative: (t) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const n = new Notification(t.title ?? "알림", {
      body: t.body ?? "",
      icon: t.icon ?? "/favicon.ico",
      tag: t.key ?? t.kind ?? "notice",
    });
    n.onclick = () => {
      window.focus();
      if (t.route) window.history.pushState({}, "", t.route);
      n.close();
    };
  },
}));

export default useNotifyStore;
