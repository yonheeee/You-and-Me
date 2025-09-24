// src/ws/stompClient.js
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_URL, SUBS } from "./wsConfig";

/** ===== 전역 상태 ===== */
let client = null;
let connecting = false;
let retryTimer = null;
let retryCount = 0;
let currentToken = null;

// 최신 핸들러를 보관해 subscribe 콜백에서 항상 최신을 호출
const handlersRef = {
  onSignal: null,
  onMatch: null,
};

/** ===== 옵션 ===== */
const USE_PLAIN_WS = true;          // true: native ws, false: SockJS
const APPEND_TOKEN_IN_URL = true;   // 서버가 URL 쿼리로 토큰을 받는다면 true
const MAX_BACKOFF_MS = 30000;

const isDev = process.env.NODE_ENV === "development";
const debugFn = isDev ? (m) => console.log("[STOMP]", m) : () => {};
const jitter = (ms) => ms + Math.floor(Math.random() * 500);
const backoff = () => Math.min(MAX_BACKOFF_MS, 2000 * 2 ** retryCount);

function makePlainWsURL(baseUrl, token) {
  // 예: http(s)://host/ws  ->  ws(s)://host/ws/websocket[?token=...]
  let url = baseUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
  if (!url.endsWith("/websocket")) url = `${url}/websocket`;
  if (APPEND_TOKEN_IN_URL && token) {
    const join = url.includes("?") ? "&" : "?";
    url = `${url}${join}token=${encodeURIComponent(token)}`;
  }
  return url;
}

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleReconnect() {
  // 토큰이 없거나, 이미 다른 이유로 연결 중이면 재시도 안 함
  if (!currentToken) return;
  const wait = jitter(backoff());
  clearRetry();
  retryTimer = setTimeout(() => {
    retryCount++;
    // 현재 핸들러는 handlersRef에 있기 때문에 따로 전달하지 않아도 최신 유지
    connect(currentToken);
  }, wait);
  if (isDev) console.log(`[WS] 재시도 예약: ${wait}ms (retry=${retryCount})`);
}

/** ===== 외부 API ===== */
export function connect(token, handlers = {}) {
  // 최신 핸들러만 갱신 (재연결 필요 X)
  if (handlers && typeof handlers === "object") {
    if (handlers.onSignal) handlersRef.onSignal = handlers.onSignal;
    if (handlers.onMatch) handlersRef.onMatch = handlers.onMatch;
  }

  if (!token) {
    console.warn("[WS] token 없음 → 연결 시도 안 함");
    return;
  }

  // 이미 같은 토큰으로 연결/활성 중이면 재사용하고 종료
  if (client && (client.active || client.connected) && token === currentToken) {
    if (isDev) console.log("[WS] 이미 연결됨 → 재사용");
    return;
  }

  // 다른 토큰으로 교체 연결하는 경우에만 기존 연결 정리
  clearRetry();
  if (client) {
    try {
      client.deactivate();
    } catch {}
    client = null;
  }

  currentToken = token;
  connecting = true;
  retryCount = 0;

  const cfg = {
    // 재연결은 우리가 수동 제어
    reconnectDelay: 0,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: debugFn,

    // 서버가 어떤 헤더를 보든 대응
    connectHeaders: {
      Authorization: `Bearer ${token}`,
      jwt: token,
      "x-auth-token": token,
    },

    onConnect: () => {
      console.log("[STOMP] connected ✅");
      connecting = false;
      retryCount = 0;

      try {
        // 구독은 한 번만 등록 (중복 방지 위해 연결 시 매번 새 client라 괜찮음)
        client.subscribe(SUBS.signals, (msg) => {
          try {
            const payload = JSON.parse(msg.body);
            handlersRef.onSignal?.(payload);
          } catch (e) {
            console.warn("[STOMP] signals parse error:", e);
          }
        });

        client.subscribe(SUBS.matches, (msg) => {
          try {
            const payload = JSON.parse(msg.body);
            handlersRef.onMatch?.(payload);
          } catch (e) {
            console.warn("[STOMP] matches parse error:", e);
          }
        });

        if (isDev) console.log("[STOMP] subscribed:", SUBS);
      } catch (e) {
        console.error("[STOMP] subscribe error:", e);
      }
    },

    onStompError: (frame) => {
      connecting = false;
      const msg = frame?.headers?.message;
      console.error("[STOMP] broker error:", msg, "\nbody:", frame?.body);
      scheduleReconnect();
    },

    onWebSocketError: (e) => {
      connecting = false;
      console.error("[STOMP] websocket error:", e?.message || e);
      scheduleReconnect();
    },

    onWebSocketClose: (e) => {
      connecting = false;
      const code = e?.code;
      const reason = e?.reason;
      console.warn("[STOMP] websocket closed", code ? `(code=${code})` : "", reason ? `reason="${reason}"` : "");
      scheduleReconnect();
    },
  };

  // 전송 방식 선택 (프록시/방화벽 환경이면 SockJS가 안정적)
  if (USE_PLAIN_WS) {
    cfg.brokerURL = makePlainWsURL(WS_URL, token);
    if (isDev) console.log("[WS] connect(plain-ws) →", cfg.brokerURL);
  } else {
    cfg.webSocketFactory = () =>
      new SockJS(WS_URL, null, {
        transports: ["websocket", "xhr-streaming", "xhr-polling"],
      });
    if (isDev) console.log("[WS] connect(sockjs) →", WS_URL);
  }

  client = new Client(cfg);
  client.activate();
}

export function disconnect() {
  clearRetry();
  connecting = false;
  if (client) {
    try {
      client.deactivate();
    } catch {}
    client = null;
  }
  currentToken = null;
}

export function isConnected() {
  return !!client && client.connected === true;
}
