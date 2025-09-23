// src/jsx/common/ToastCenter.jsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useWsStore from "../../api/wsStore";
import "../../css/common/ToastCenter.css";

export default function ToastCenter() {
  const signals = useWsStore((s) => s.signals);
  const matches = useWsStore((s) => s.matches);

  const [toasts, setToasts] = useState([]);
  const seenIdsRef = useRef(new Set()); // 중복 방지 (signalId/matchId 기준)

  // 공통 푸시 함수
  const pushToast = (msg, payload, key) => {
    // key가 있으면 중복 방지
    if (key && seenIdsRef.current.has(key)) return;
    if (key) seenIdsRef.current.add(key);

    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, payload }]);

    // 3초 뒤 자동 제거
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // ✅ signal 수신 시 토스트
  useEffect(() => {
    if (!signals?.length) return;
    const latest = signals[signals.length - 1];
    // payload 예: { type:'SENT', signalId:18, message:'새로운 신호가 있어요!' }
    const text =
      latest?.message ||
      (latest?.type === "SENT" ? "새로운 신호가 도착했어요!" : "신호 업데이트가 있어요!");
    pushToast(text, latest, latest?.signalId ?? JSON.stringify(latest));
  }, [signals]);

  // ✅ match 수신 시 토스트
  useEffect(() => {
    if (!matches?.length) return;
    const latest = matches[matches.length - 1];
    const text = latest?.message || "매칭이 성사되었습니다 🎉";
    pushToast(text, latest, latest?.matchId ?? JSON.stringify(latest));
  }, [matches]);

  // 포털로 body에 직접 렌더(상위 transform/overflow 영향 제거)
  return createPortal(
    <div className="toast-center" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast-text">{t.msg}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}
