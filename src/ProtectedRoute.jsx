// src/ProtectedRoute.jsx
import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import useUserStore from "./api/userStore";
import { refreshAccessToken, willExpireSoon } from "./api/axios";

const ProtectedRoute = ({ children }) => {
  const { user, isInitialized } = useUserStore();
  const location = useLocation();

  // 선택: 렌더 직전 한 번 선제 리프레시
  useEffect(() => {
    const access = user?.accessToken;
    if (access && willExpireSoon(access, 90)) {
      refreshAccessToken().catch(() => {});
    }
  }, [user?.accessToken]);

  // 1) 아직 앱 초기화 전 → 로딩 표시
  if (!isInitialized) {
    return (
      <main style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <p>앱을 준비 중입니다...</p>
      </main>
    );
  }

  // 2) 토큰 존재 여부 확인
  const hasToken = !!user?.accessToken;

  // 3) 로그인 안 된 경우 → /login 리다이렉트 (state에 원래 경로 저장)
  if (!hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4) 로그인 된 경우 → 자식 컴포넌트 렌더링
  return children;
};

export default ProtectedRoute;
