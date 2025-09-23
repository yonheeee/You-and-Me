// src/jsx/common/FlirtingPanel.jsx
import { useEffect, useState, useCallback } from "react";
import api from "../../api/axios.js";
import useUserStore from "../../api/userStore.js";
import "../../css/signup/ResultPage.css";
import ConfirmModal from "../common/ConfirmModal.jsx"; // ✅ 공통 컨펌 모달

export default function FlirtingPanel({ targetUserId, onSent }) {
  const [alreadySent, setAlreadySent] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ 필요한 값만 각각 구독 (객체 리턴 X)
  const signalCredits = useUserStore((s) => s.user?.signalCredits ?? 0);

  // ✅ 컨펌 상태
  const [confirm, setConfirm] = useState(null);
  const openConfirm = (opts) =>
    setConfirm({
      open: true,
      title: "플러팅 확인",
      message: "플러팅을 보내시겠습니까?\n플러팅 1회가 차감됩니다.",
      acceptText: "보내기",
      rejectText: "취소",
      showUser: false,
      user: null,
      onAccept: null,
      onReject: null,
      ...opts,
    });

  // ✅ 마운트/targetUserId 변경시에만 상태 조회
  useEffect(() => {
    if (!targetUserId) return;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const resp = await api.get(`/signals/${targetUserId}/status`, {
          signal: controller.signal,
        });
        if (cancelled) return;

        const next = resp?.data?.alreadySent === true;
        setAlreadySent((prev) => (prev === next ? prev : next));
      } catch (err) {
        if (cancelled) return;

        // 404 = 아직 안 보냄
        if (err?.response?.status === 404) {
          setAlreadySent((prev) => (prev === false ? prev : false));
        } else if (
          err?.name === "CanceledError" ||
          err?.name === "AbortError"
        ) {
          // 취소된 요청 무시
        } else {
          console.error("❌ 플러팅 상태 확인 실패:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [targetUserId]);

  // ✅ 실제 전송 함수 (컨펌 수락 시 호출)
  const doSend = useCallback(async () => {
    if (!targetUserId || alreadySent || loading) return;

    // 안전망: 크레딧 재확인
    if (signalCredits <= 0) {
      alert("신호 기회가 없습니다! 부스 쿠폰 등록 시 추가됩니다.");
      return;
    }

    try {
      setLoading(true);
      await api.post(`/signals/${targetUserId}`);

      // ✅ 성공 직후 프로필 재조회 → 스토어 최신화
      try {
        const refreshed = await api.get("/users/me/profile");
        if (refreshed?.data) {
          useUserStore.getState().updateUser(refreshed.data);
        }
      } catch (profileErr) {
        console.warn("⚠️ 프로필 재조회 실패:", profileErr);
      }

      setAlreadySent(true);
      onSent?.(targetUserId);
      alert("플러팅을 보냈습니다!");
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || "";

      if (status === 409 || /already/i.test(msg)) {
        setAlreadySent(true);
        alert("이미 이 상대에게 플러팅을 보냈어요.");
      } else {
        console.error("❌ 플러팅 실패:", err);
        alert(msg || "플러팅을 보낼 수 없습니다. 다시 시도해 주세요.");
      }
    } finally {
      setLoading(false);
    }
  }, [targetUserId, alreadySent, loading, signalCredits, onSent]);

  // ✅ 버튼 클릭 → 컨펌 모달 오픈
  const handleOpenConfirm = () => {
    if (!targetUserId || alreadySent || loading) return;

    if (signalCredits <= 0) {
      alert("신호 기회가 없습니다! 부스 쿠폰 등록 시 추가됩니다.");
      return;
    }

    openConfirm({
      onAccept: async () => {
        setConfirm(null);
        await doSend();
      },
      onReject: () => setConfirm(null),
    });
  };

  return (
    <div className="flirting-panel">
      <button
        className={`flirting-cta ${alreadySent ? "done" : ""}`}
        onClick={handleOpenConfirm}              
        disabled={alreadySent || loading}
        type="button"
      >
        {alreadySent ? "플러팅 완료" : loading ? "보내는 중..." : "플러팅 하기"}
      </button>

      <div className="flirting-note">
        <p className="note-title">신호/매칭 안내</p>
        <ul className="note-list">
          <li>기본 횟수: ‘신호 보내기’ 3회, ‘매칭’ 3회</li>
          <li>추가 횟수: 부스 쿠폰 등록 시 추가 가능</li>
          <li>쿠폰 혜택: 쿠폰 등록 시 각 5회씩 추가됩니다.</li>
        </ul>
      </div>

      {/* ✅ 공통 컨펌 모달 */}
      {confirm?.open && (
        <ConfirmModal
          open
          onClose={() => setConfirm(null)}
          onAccept={async () => {
            try {
              await confirm.onAccept?.();
            } finally {
              setConfirm((prev) => (prev?.open ? null : prev));
            }
          }}
          onReject={() => {
            confirm.onReject?.();
            setConfirm(null);
          }}
          title={confirm.title}
          message={confirm.message}
          acceptText={confirm.acceptText}
          rejectText={confirm.rejectText}
          showUser={confirm.showUser}
          user={confirm.user}
        />
      )}
    </div>
  );
}
