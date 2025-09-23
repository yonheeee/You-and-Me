// src/jsx/ReceiveSignal.jsx
import React, { useEffect, useState } from "react";
import "../../css/home/ReceiveSignal.css";
import YouProfile from "../mypage/YouProfile.jsx";
import api from "../../api/axios.js";

export default function ReceiveSignal({ onAccept, onReject }) {
  const [signals, setSignals] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // ✅ 받은 신호 주기적으로 가져오기 (5초마다)
  useEffect(() => {
    let timer;

    const fetchSignals = async () => {
      try {
        const res = await api.get("/signals/received");
        setSignals(res.data || []);
      } catch (err) {
        console.error("❌ 받은 신호 불러오기 실패:", err);
      }
    };

    fetchSignals(); // 첫 로딩
    timer = setInterval(fetchSignals, 5000); // ⏱ 5초마다 실행

    return () => clearInterval(timer); // 언마운트 시 정리
  }, []);

  // ✅ 모달 열릴 때 배경 스크롤 잠금
  useEffect(() => {
    if (!profileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "auto";
    };
  }, [profileOpen]);

  // ESC 닫기
  useEffect(() => {
    if (!profileOpen) return;
    const onKey = (e) => e.key === "Escape" && setProfileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileOpen]);

  const formatRelativeTime = (isoString) => {
    if (!isoString) return "";
    const now = new Date();
    const date = new Date(isoString);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay === 1) return "어제";
    if (diffDay < 7) return `${diffDay}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  const handleOpen = (signal) => {
    if (signal.status === "DECLINED") return;
    const uid = signal.fromUser?.userId;
    if (!uid) return;
    setSelectedUserId(uid);
    setProfileOpen(true);
  };

  if (!signals || signals.length === 0) {
    return <div className="empty-message">받은 신호가 없습니다.</div>;
  }

  return (
    <>
      <div className="receive-signal-list">
        {signals.map((signal) => {
          const isDeclined = signal.status === "DECLINED";
          const userId = signal.fromUser?.userId;

          return (
            <div
              key={signal.signalId}
              className={`receive-card ${isDeclined ? "receive-declined" : ""}`}
            >
              {/* DECLINED 아닐 때만 클릭 → 프로필 모달 오픈 */}
              <div
                className="receive-info"
                onClick={() => !isDeclined && userId && handleOpen(signal)}
              >
                <div className="receive-profile-placeholder">
                  {signal.fromUser?.typeImageUrl2 && (
                    <img
                      src={signal.fromUser.typeImageUrl2}
                      alt="profile"
                      className="profile-img"
                    />
                  )}
                </div>

                <div className="receive-text-info">
                  <strong>{signal.fromUser?.name || "알 수 없는 유저"}</strong>
                  <span className="receive-department">
                    {signal.fromUser?.department || "소속 없음"}
                  </span>
                  <span className="receive-status-badge">{signal.message}</span>
                  <span className="receive-created-at">
                    {formatRelativeTime(signal.createdAt)}
                  </span>
                </div>
              </div>

              <div className="receive-actions">
                {signal.status === "SENT" && (
                  <button
                    className="receive-accept-btn"
                    onClick={() => onAccept(signal.signalId)}
                  >
                    ❤️
                  </button>
                )}
                {signal.status === "DECLINED" && (
                  <button
                    className="receive-reject-btn"
                    onClick={() => onReject(signal.signalId)}
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 프로필 모달 */}
      {profileOpen && selectedUserId && (
        <div
          className="modal-overlay"
          onClick={() => setProfileOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <YouProfile
              userId={selectedUserId}
              onClose={() => setProfileOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
