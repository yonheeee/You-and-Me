// src/jsx/common/ToastCenter.jsx
import { useEffect, useState } from "react";
import useWsStore from "../../api/wsStore";
import "../../css/common/ToastCenter.css";

export default function ToastCenter() {
  const signals = useWsStore((s) => s.signals);
  const matches = useWsStore((s) => s.matches);

  const [toasts, setToasts] = useState([]);

  // ✅ signal 수신 시 토스트 추가
  useEffect(() => {
    if (signals.length === 0) return;
    const latest = signals[signals.length - 1];
    pushToast(`새로운 시그널이 도착했습니다!`, latest);
  }, [signals]);

  // ✅ match 수신 시 토스트 추가
  useEffect(() => {
    if (matches.length === 0) return;
    const latest = matches[matches.length - 1];
    pushToast(`매칭이 성사되었습니다 🎉`, latest);
  }, [matches]);

  // ✅ 토스트 추가 함수
  const pushToast = (msg, payload) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, payload }]);

    // 3초 뒤 자동 제거
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <div className="toast-center">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.msg}
        </div>
      ))}
    </div>
  );
}
