// src/jsx/common/ToastCenter.jsx
import React, { useEffect, useState } from "react";
import useNotifyStore from "../../api/notifyStore";
import "../../css/common/ToastCenter.css";

export default function ToastCenter() {
  const toasts = useNotifyStore((s) => s.toasts);
  const remove = useNotifyStore((s) => s.remove);
  const [exiting, setExiting] = useState({}); // id → true/false

  useEffect(() => {
    // 각 토스트마다 타이머 등록
    toasts.forEach((t) => {
      if (t.duration === 0) return;
      if (exiting[t.id]) return; // 이미 제거 예정
      const timer = setTimeout(() => handleRemove(t.id), t.duration ?? 4000);
      return () => clearTimeout(timer);
    });
  }, [toasts]);

  const handleRemove = (id) => {
    // exit 클래스를 먼저 붙이고 일정시간 후 실제 remove
    setExiting((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => remove(id), 250); // fade-out 애니메이션 길이와 동일
  };

  return (
    <div className="toast-center">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`toast ${t.kind ?? ""} ${exiting[t.id] ? "exit" : "enter"}`}
          onClick={() => handleRemove(t.id)}
        >
          <div className="toast-title">
            {/* kind별 아이콘 (선택) */}
            {t.kind === "signal" && "💌"}
            {t.kind === "match" && "🎉"}
            {t.kind === "chat" && "💬"}
            <span>{t.title}</span>
          </div>
          {t.body && <div className="toast-body">{t.body}</div>}
        </div>
      ))}
    </div>
  );
}
