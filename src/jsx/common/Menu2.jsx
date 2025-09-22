// src/components/common/Menu2.jsx
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  AiFillHome,
  AiOutlineHome,
  AiFillHeart,
  AiOutlineHeart,
  AiFillTrophy,
  AiOutlineTrophy,
} from "react-icons/ai";
import { BsChatDotsFill, BsChatDots } from "react-icons/bs";
import { CgProfile } from "react-icons/cg";
import "../../css/common/Menu2.css";

// 🔥 Firestore 구독 (채팅 미읽음)
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../libs/firebase";
import { onAuthStateChanged } from "firebase/auth";

import useUserStore from "../../api/userStore";
import useNotifyStore from "../../api/notifyStore";

export default function Menu2() {
  const { user } = useUserStore();
  const myIdNum = Number(user?.userId);
  const myIdStr = Number.isFinite(myIdNum) ? String(myIdNum) : "";

  // 🔐 Firebase 인증 완료 여부
  const [authReady, setAuthReady] = useState(false);

  // 채팅 미읽음 개수
  const [totalUnreadChat, setTotalUnreadChat] = useState(0);

  // 플러팅/매칭 미읽음(notifyStore)
  const unread = useNotifyStore((s) => s.unread);
  const totalSignal = (unread.signal ?? 0) + (unread.match ?? 0);
  const hasSignal = totalSignal > 0;

  // ✅ 인증 상태 감시
  useEffect(() => {
    const off = onAuthStateChanged(auth, (u) => setAuthReady(!!u));
    return off;
  }, []);

  // ✅ 인증 + 내 ID 준비된 뒤에만 Firestore 구독
  useEffect(() => {
    if (!authReady) return;

    const myUid = auth.currentUser?.uid || "";
    const keyForParticipants =
      myUid || (Number.isFinite(myIdNum) ? String(myIdNum) : "");
    if (!keyForParticipants) return;

    // 내가 참여한 방 구독
    const q = query(
      collection(db, "chatRooms"),
      where("participants", "array-contains", keyForParticipants)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        let sum = 0;
        snap.forEach((doc) => {
          const data = doc.data();
          const count =
            data?.unread?.[myUid] ??
            data?.unread?.[myIdStr] ??
            0;
          sum += Number(count) || 0;
        });
        setTotalUnreadChat(sum);
      },
      (err) => {
        console.warn("[FS] onSnapshot error:", err.code, err.message);
        if (err.code === "permission-denied") {
          setTotalUnreadChat(0);
        }
      }
    );

    return () => unsub();
  }, [authReady, myIdNum, myIdStr]);

  return (
    <nav className="menu2">
      {/* 홈 */}
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `menu2-item ${isActive ? "active-indicator" : ""}`
        }
      >
        {({ isActive }) => (
          <>
            {isActive ? (
              <AiFillHome className="menu2-icon active" />
            ) : (
              <AiOutlineHome className="menu2-icon" />
            )}
            <span className={isActive ? "active" : ""}>홈</span>
          </>
        )}
      </NavLink>

      {/* 랭킹 */}
      <NavLink
        to="/ranking"
        className={({ isActive }) =>
          `menu2-item ${isActive ? "active-indicator" : ""}`
        }
      >
        {({ isActive }) => (
          <>
            {isActive ? (
              <AiFillTrophy className="menu2-icon active" />
            ) : (
              <AiOutlineTrophy className="menu2-icon" />
            )}
            <span className={isActive ? "active" : ""}>랭킹</span>
          </>
        )}
      </NavLink>

      {/* 매칭 (알림 숫자 뱃지) */}
      <NavLink
        to="/matching"
        className={({ isActive }) =>
          `menu2-item ${isActive ? "active-indicator" : ""}`
        }
      >
        {({ isActive }) => (
          <>
            <span className="menu2-icon-wrap">
              {isActive ? (
                <AiFillHeart className="menu2-icon active" />
              ) : (
                <AiOutlineHeart className="menu2-icon" />
              )}
              {totalSignal > 0 && (
                <span className="menu2-badge-count">
                  {totalSignal > 99 ? "99+" : totalSignal}
                </span>
              )}
            </span>
            <span className={isActive ? "active" : ""}>매칭</span>
          </>
        )}
      </NavLink>

      {/* 채팅창 (새 메시지 숫자 뱃지) */}
      <NavLink
        to="/chat"
        className={({ isActive }) =>
          `menu2-item ${isActive ? "active-indicator" : ""}`
        }
      >
        {({ isActive }) => (
          <>
            <span className="menu2-icon-wrap">
              {isActive ? (
                <BsChatDotsFill className="menu2-icon active" />
              ) : (
                <BsChatDots className="menu2-icon" />
              )}
              {totalUnreadChat > 0 && (
                <span className="menu2-badge-count">
                  {totalUnreadChat > 99 ? "99+" : totalUnreadChat}
                </span>
              )}
            </span>
            <span className={isActive ? "active" : ""}>채팅창</span>
          </>
        )}
      </NavLink>

      {/* 마이페이지 */}
      <NavLink
        to="/mypage"
        className={({ isActive }) =>
          `menu2-item ${isActive ? "active-indicator" : ""}`
        }
      >
        {({ isActive }) => (
          <>
            <CgProfile className={`menu2-icon ${isActive ? "active" : ""}`} />
            <span className={isActive ? "active" : ""}>마이페이지</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
