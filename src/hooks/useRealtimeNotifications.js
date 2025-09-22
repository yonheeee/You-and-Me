// src/hooks/useRealtimeNotifications.js
import { useEffect } from "react";
import useNotifyStore from "../api/notifyStore";

export default function useRealtimeNotifications() {
  const enqueue = useNotifyStore((s) => s.enqueue);

  useEffect(() => {
    const onSignal = (e) => {
      const p = e.detail;
      if (!p) return;

      switch (p.type) {
        case "DECLINED":
          enqueue({
            kind: "signal",
            title: "플러팅이 거절되었어요",
            body: p.message ?? "상대가 이번엔 패스했어요.",
            payload: p,
          });
          break;

        case "ACCEPTED":
          if (p.direction === "OUTGOING") {
            enqueue({
              kind: "match",
              title: "상대가 수락했어요!",
              body: `${p.toUser?.name ?? "상대"}님이 플러팅을 수락했어요.`,
              payload: p,
            });
          } else {
            enqueue({
              kind: "match",
              title: "플러팅 수락 완료",
              body: "상대를 수락하여 매칭되었습니다.",
              payload: p,
            });
          }
          break;

        case "RECEIVED":
        case "NEW":
          enqueue({
            kind: "signal",
            title: "새 플러팅 도착",
            body: `${p.fromUser?.name ?? "누군가"}님이 관심을 보냈어요.`,
            payload: p,
          });
          break;

        default:
          enqueue({
            kind: "signal",
            title: "플러팅 업데이트",
            body: p.message ?? "신호 상태가 변경되었어요.",
            payload: p,
          });
          break;
      }
    };

    const onMatch = (e) => {
      const p = e.detail;
      enqueue({
        kind: "match",
        title: "매칭 성사! 🎉",
        body: `${p?.partner?.name ?? "상대"}와 매칭되었어요.`,
        payload: p,
      });
    };

    window.addEventListener("rt:signal", onSignal);
    window.addEventListener("rt:match", onMatch);
    return () => {
      window.removeEventListener("rt:signal", onSignal);
      window.removeEventListener("rt:match", onMatch);
    };
  }, [enqueue]);
}
