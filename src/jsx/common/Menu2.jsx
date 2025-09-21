// src/components/common/Menu2.jsx
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

export default function Menu2() {
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

      {/* ✅ 랭킹 추가 */}
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

      {/* 매칭 */}
      <NavLink
        to="/matching"
        className={({ isActive }) =>
          `menu2-item ${isActive ? "active-indicator" : ""}`
        }
      >
        {({ isActive }) => (
          <>
            {isActive ? (
              <AiFillHeart className="menu2-icon active" />
            ) : (
              <AiOutlineHeart className="menu2-icon" />
            )}
            <span className={isActive ? "active" : ""}>매칭</span>
          </>
        )}
      </NavLink>

      {/* 채팅창 */}
      <NavLink
        to="/chat"
        className={({ isActive }) =>
          `menu2-item ${isActive ? "active-indicator" : ""}`
        }
      >
        {({ isActive }) => (
          <>
            {isActive ? (
              <BsChatDotsFill className="menu2-icon active" />
            ) : (
              <BsChatDots className="menu2-icon" />
            )}
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
