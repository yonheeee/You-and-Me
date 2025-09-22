// src/jsx/common/ToastCenter.jsx
import React, { useEffect } from "react";
import useNotifyStore from "../../api/notifyStore";
import "../../css/common/ToastCenter.css";

export default function ToastCenter() {
  const toasts = useNotifyStore((s) => s.toasts);
  const remove = useNotifyStore((s) => s.remove);

  useEffect(() => {
    const timers = toasts.map((t) => {
      if (t.duration === 0) return null;
      return setTimeout(() => remove(t.id), t.duration ?? 4000);
    });
    return () => timers.forEach((tmr) => tmr && clearTimeout(tmr));
  }, [toasts, remove]);

  return (
    <div className="toast-center">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind ?? ""}`} onClick={() => remove(t.id)}>
          <div className="toast-title">{t.title}</div>
          {t.body && <div className="toast-body">{t.body}</div>}
        </div>
      ))}
    </div>
  );
}
