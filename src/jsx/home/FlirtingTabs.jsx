// src/jsx/home/FlirtingTabs.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import "../../css/home/FlirtingTabs.css";
import SentSignalList from "./SentSignalList";
import ReceiveSignal from "./ReceiveSignal";
import ConfirmModal from "../common/ConfirmModal.jsx"; // ✅ 변경
import Modal from "../common/Modal";
import YouProfile from "../mypage/YouProfile";
import api from "../../api/axios.js";

// 🔔 실시간 알림(미읽음 카운트/읽음 처리)
import useNotifyStore from "../../api/notifyStore";

export default function FlirtingTabs() {
  const [activeTab, setActiveTab] = useState("sent");
  const [sentSignals, setSentSignals] = useState([]);
  const [receivedSignals, setReceivedSignals] = useState([]);
  const [openModal, setOpenModal] = useState(false); // false | signalObj
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [openProfile, setOpenProfile] = useState(false);

  // unread 뱃지 + 읽음 처리 함수
  const unread = useNotifyStore((s) => s.unread);
  const markRead = useNotifyStore((s) => s.markRead);

  const fetchSentSignals = useCallback(async () => {
    try {
      const resp = await api.get("/signals/sent");
      setSentSignals(resp.data || []);
    } catch (err) {
      console.error("❌ 보낸 신호 불러오기 실패:", err);
    }
  }, []);

  const fetchReceivedSignals = useCallback(async () => {
    try {
      const resp = await api.get("/signals/received");
      setReceivedSignals(resp.data || []);
    } catch (err) {
      console.error("❌ 받은 신호 불러오기 실패:", err);
    }
  }, []);

  // 최초 로드
  useEffect(() => {
    fetchSentSignals();
    fetchReceivedSignals();
  }, [fetchSentSignals, fetchReceivedSignals]);

  // 화면 진입/탭 전환 시 읽음 처리
  useEffect(() => {
    if (activeTab === "received") {
      markRead("signal"); // 받은 플러팅 볼 때만 소진
    }
    markRead("match"); // 매칭은 글로벌하게 소진
  }, [activeTab, markRead]);

  // 디바운스 리로드
  const reloadTimer = useRef(null);
  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      fetchSentSignals();
      fetchReceivedSignals();
    }, 250);
  }, [fetchSentSignals, fetchReceivedSignals]);

  useEffect(() => {
    const onSignal = (e) => {
      const p = e.detail;
      if (p?.type === "DECLINED" && p?.signalId) {
        setSentSignals((prev) =>
          prev.map((row) =>
            row.signalId === p.signalId
              ? {
                  ...row,
                  status: "DECLINED",
                  message: p.message ?? "거절하셨습니다.",
                  toUser: { ...(row.toUser || {}), ...(p.toUser || {}) },
                }
              : row
          )
        );
      }
      scheduleReload();
    };

    const onMatch = () => {
      scheduleReload();
    };

    window.addEventListener("rt:signal", onSignal);
    window.addEventListener("rt:match", onMatch);
    return () => {
      window.removeEventListener("rt:signal", onSignal);
      window.removeEventListener("rt:match", onMatch);
    };
  }, [scheduleReload]);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, []);

  const acceptSignal = async (signalId) => {
    try {
      await api.post(`/signals/accept/${signalId}`);
      await Promise.all([fetchReceivedSignals(), fetchSentSignals()]);
      setOpenModal(false); // ✅ 수락 후 닫기
    } catch (err) {
      console.error("❌ 신호 수락 실패:", err);
    }
  };

  const declineSignal = async (signalId) => {
    try {
      await api.post(`/signals/decline/${signalId}`);
      await fetchReceivedSignals();
    } catch (err) {
      console.error("❌ 신호 거절 실패:", err);
    }
  };

  const handleOpenProfile = (userId) => {
    setSelectedUserId(userId);
    setOpenProfile(true);
  };

  // signal + match 합산 뱃지
  const unreadSignalCount = (unread.signal ?? 0) + (unread.match ?? 0);

  // ✅ 모달 핸들러: 거절 시에도 모달 닫힘
  const handleModalAccept = () => {
    if (!openModal?.signalId) return;
    acceptSignal(openModal.signalId);
  };
  const handleModalReject = async () => {
    if (!openModal?.signalId) return;
    await declineSignal(openModal.signalId);
    setOpenModal(false); // ✅ 거절 후 닫기
  };

  return (
    <div className="flirting-tabs">
      <div className="tab-header">
        <button
          className={`tab-btn ${activeTab === "sent" ? "active" : ""}`}
          onClick={() => setActiveTab("sent")}
        >
          내가 보낸 플러팅
        </button>
        <button
          className={`tab-btn ${activeTab === "received" ? "active" : ""}`}
          onClick={() => setActiveTab("received")}
        >
          나에게 온 플러팅
          {unreadSignalCount > 0 && (
            <span className="badge">
              {unreadSignalCount > 99 ? "99+" : unreadSignalCount}
            </span>
          )}
        </button>
      </div>

      <div className={`tab-content ${activeTab}-tab`}>
        {activeTab === "sent" ? (
          <SentSignalList
            signals={sentSignals}
            onOpenProfile={handleOpenProfile}
          />
        ) : (
          <ReceiveSignal
            signals={receivedSignals}
            onAccept={(id) =>
              setOpenModal(receivedSignals.find((s) => s.signalId === id))
            }
            onReject={declineSignal}
            onOpenProfile={handleOpenProfile}
          />
        )}
      </div>

      {openModal && (
        <ConfirmModal
          open={true}
          onClose={() => setOpenModal(false)}
          onAccept={handleModalAccept}
          onReject={handleModalReject}
          title="플러팅 확인"                                
          message={`${openModal?.fromUser?.name ?? "상대"}님의 플러팅을 수락하시겠습니까?`}
          acceptText="수락"
          rejectText="거절"
          user={{
            name: openModal.fromUser?.name,
            department: openModal.fromUser?.department,
            avatar: openModal.fromUser?.typeImageUrl2 || "",
            createdAt: openModal.createdAt,
          }}
        />
      )}

      {openProfile && (
        <Modal onClose={() => setOpenProfile(false)}>
          <YouProfile userId={selectedUserId} />
        </Modal>
      )}
    </div>
  );
}
