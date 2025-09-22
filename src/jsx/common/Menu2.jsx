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
import { db } from "../../libs/firebase";
import useUserStore from "../../api/userStore";

// 🔔 실시간 플러팅/매칭 미읽음 (notifyStore)
import useNotifyStore from "../../api/notifyStore";

export default function Menu2() {
  const { user } = useUserStore();
  const myIdNum = Number(user?.userId);
  const myIdStr = Number.isFinite(myIdNum) ? String(myIdNum) : "";

  // 채팅 미읽음(파이어스토어)
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  // const [totalUnreadChat, setTotalUnreadChat] = useState(0); // 필요시 숫자 뱃지

  // 플러팅/매칭 미읽음(notifyStore)
  const unread = useNotifyStore((s) => s.unread);
  const hasSignal = (unread.signal ?? 0) + (unread.match ?? 0) > 0;
  // const totalSignal = (unread.signal ?? 0) + (unread.match ?? 0); // 필요시 숫자 뱃지

  useEffect(() => {
    if (!Number.isFinite(myIdNum)) return;
    // 내가 참여한 방 구독
    const q = query(
      collection(db, "chatRooms"),
      where("participants", "array-contains", myIdNum)
    );
    const unsub = onSnapshot(q, (snap) => {
      let any = false;
      // let sum = 0;
      snap.forEach((doc) => {
        const data = doc.data();
        const count = data?.unread?.[myIdStr] ?? 0;
        if (count > 0) any = true;
        // sum += Number(count) || 0;
      });
      setHasUnreadChat(any);
      // setTotalUnreadChat(sum);
    });
    return () => unsub();
  }, [myIdNum, myIdStr]);

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

      {/* 매칭 (🔴 플러팅/매칭 알림 뱃지) */}
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
              {hasSignal && (
                <span className="menu2-badge" aria-label="새 알림" />
              )}
              {/* 숫자 배지로 쓰고 싶으면 위 줄 대신 ↓
              {totalSignal > 0 && (
                <span className="menu2-badge-count">
                  {totalSignal > 99 ? "99+" : totalSignal}
                </span>
              )} */}
            </span>
            <span className={isActive ? "active" : ""}>매칭</span>
          </>
        )}
      </NavLink>

      {/* 채팅창 (🔴 채팅 미읽음 배지) */}
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
              {hasUnreadChat && (
                <span className="menu2-badge" aria-label="새 메세지" />
              )}
              {/* 숫자 배지로 쓰고 싶으면 위 줄 대신 ↓
              {totalUnreadChat > 0 && (
                <span className="menu2-badge-count">
                  {totalUnreadChat > 99 ? "99+" : totalUnreadChat}
                </span>
              )} */}
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
