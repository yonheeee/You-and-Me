// src/ws/wsConfig.js
export const WS_ENDPOINT = (() => {
  const isPageHTTPS = window.location.protocol === "https:";

  // 운영(HTTPS) → 반드시 운영 API(HTTPS)
  if (isPageHTTPS) return "https://api.likelionhsu.co.kr/api/ws";

  // 개발(HTTP) → 로컬 백엔드 허용
  if (!isPageHTTPS) return "http://localhost:8080/api/ws";
})();
export const USER_DEST_PREFIX = "/user";
export const BROKER_DEST_PREFIX = "/queue";
export const SUBS = {
  signals: `${USER_DEST_PREFIX}${BROKER_DEST_PREFIX}/signals`,
  matches: `${USER_DEST_PREFIX}${BROKER_DEST_PREFIX}/matches`,
};
