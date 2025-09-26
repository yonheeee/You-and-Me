import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import ChatRoomGuard from "./jsx/chat/ChatRoomGuard";

import Header from "./jsx/common/Header";
import Menu from "./jsx/common/Menu2";

import Home from "./jsx/home/Home";
import ChatList from "./jsx/chat/ChatList";
import MatchingEntry from "./jsx/matching/MatchingEntry.jsx";
import MyPage from "./jsx/mypage/MyPage";

import LoginPage from "./jsx/signup/LoginPage";
import InfoForm from "./jsx/signup/InfoForm2";
import QPage from "./jsx/signup/QPage";
import ResultPage from "./jsx/signup/ResultPage";

import Loader from "./jsx/common/Loader";
import ChatRoom from "./jsx/chat/ChatRoom";

import Ranking from "./jsx/ranking/Ranking.jsx";

import TutorHome from "./jsx/tutorial/TutorHome.jsx";
import TutorMatching from "./jsx/tutorial/TutorMatching.jsx";
import TutorResult from "./jsx/tutorial/TutorResult.jsx";
import TutorFli from "./jsx/tutorial/TutorFli.jsx";
import TutorPopup from "./jsx/tutorial/TutorPopup.jsx";
import TutorCount from "./jsx/tutorial/TutorCount.jsx";
import TutorEnd from "./jsx/tutorial/TutorEnd.jsx";
import TutorStart from "./jsx/tutorial/TutorStart.jsx";

// 레이아웃 컴포넌트
function Layout({ children }) {
  const location = useLocation();
  const hiddenPaths = [
    "/login",
    "/infoform",
    "/result",
    "/qpage",
    "/tutorial/result",
    "/tutorial/7",
    "/tutorial/start",
    "/tutorial/end",
  ];
  const shouldHide =
    hiddenPaths.includes(location.pathname) ||
    location.pathname.startsWith("/chat/");

  return (
    <>
      {!shouldHide && <Header />}
      {children}
      {!shouldHide && <Menu />}
    </>
  );
}

/** 랭킹 라우트용 래퍼: 학과 */
function RankingDeptPage() {
  const navigate = useNavigate();
  return (
    <Ranking mode="dept" onClickTopRight={() => navigate("/ranking/mbti")} />
  );
}

/** 랭킹 라우트용 래퍼: MBTI */
function RankingMbtiPage() {
  const navigate = useNavigate();
  return (
    <Ranking mode="mbti" onClickTopRight={() => navigate("/ranking/dept")} />
  );
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matching"
            element={
              <ProtectedRoute>
                <MatchingEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mypage"
            element={
              <ProtectedRoute>
                <MyPage />
              </ProtectedRoute>
            }
          />
          {/* 회원가입(정보 입력 페이지) */}
          <Route
            path="/infoform"
            element={
              <ProtectedRoute>
                <InfoForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qpage"
            element={
              <ProtectedRoute>
                <QPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/result"
            element={
              <ProtectedRoute>
                <ResultPage />
              </ProtectedRoute>
            }
          />
          <Route path="/loading" element={<Loader />} />
          {/* ✅ 채팅방 라우트: URL에서 roomId 추출 + 현재 로그인 유저 ID 전달 */}
          <Route
            path="/chat/:roomId"
            element={
              <ChatRoomGuard>
                <ChatRoom />
              </ChatRoomGuard>
            }
          />
          {/* ✅ 랭킹 라우트 */}
          <Route
            path="/ranking"
            element={<Navigate to="/ranking/dept" replace />}
          />
          <Route path="/ranking/dept" element={<RankingDeptPage />} />
          <Route path="/ranking/mbti" element={<RankingMbtiPage />} />{" "}
          <Route path="/tutorial/start" element={<TutorStart />} />
          <Route path="/tutorial/2" element={<TutorHome />} />
          <Route path="/tutorial/3" element={<TutorMatching />} />
          <Route path="/tutorial/4" element={<TutorResult />} />
          <Route path="/tutorial/5" element={<TutorFli />} />
          <Route path="/tutorial/6" element={<TutorPopup />} />
          <Route path="/tutorial/7" element={<TutorCount />} />
          <Route path="/tutorial/end" element={<TutorEnd />} />

           <Route
            path="/infoform/test"
            element={
                <InfoForm />
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default AppRouter;
