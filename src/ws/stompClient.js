// src/ws/stompClient.js
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_URL, SUBS } from "./wsConfig";

/** ===== 전역 상태 ===== */
let client = null;
let connecting = false;
let retryTimer = null;
let retryCount = 0;
let lastArgs = null; // { token, handlers }

/** ===== 옵션(상황에 맞게) ===== */
const USE_PLAIN_WS = true;          // true: native ws, false: SockJS
const APPEND_TOKEN_IN_URL = true;   // 서버가 handshake에서 token을 읽는다면 true 유지
const MAX_BACKOFF_MS = 30000;       // 재시도 상한

/** ===== 유틸 ===== */
const isDev = process.env.NODE_ENV === "development";
const debugFn = isDev ? (m) => console.log("[STOMP]", m) : () => {};
const jitter = (ms) => ms + Math.floor(Math.random() * 500);
const backoff = () => Math.min(MAX_BACKOFF_MS, 2000 * 2 ** retryCount);

function makePlainWsURL(baseUrl, token) {
  // https://.../api/ws -> wss://.../api/ws/websocket[?token=...]
  let url = baseUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
  if (!url.endsWith("/websocket")) url = `${url}/websocket`;
  if (APPEND_TOKEN_IN_URL) {
    const join = url.includes("?") ? "&" : "?";
    url = `${url}${join}token=${encodeURIComponent(token)}`;
  }
  return url;
}

function scheduleReconnect() {
  if (!lastArgs) return;
  const wait = jitter(backoff());
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryCount++;
    connect(lastArgs.token, lastArgs.handlers);
  }, wait);
  if (isDev) console.log(`[WS] 재시도 예약: ${wait}ms (retry=${retryCount})`);
}

/** ===== 외부 API ===== */
export function connect(token, handlers = {}) {
  lastArgs = { token, handlers };

  if (!token) {
    console.warn("[WS] token 없음 → 연결 시도 안 함");
    return;
  }
  if (connecting) {
    if (isDev) console.log("[WS] 이미 연결 시도중…");
    return;
  }

  // 기존 연결 정리
  clearTimeout(retryTimer);
  if (client) {
    try { client.deactivate(); } catch {}
    client = null;
  }

  connecting = true;
  retryTimer = null;

  const cfg = {
    // 자동 재시도는 우리가 제어한다
    reconnectDelay: 0,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: debugFn,

    // 서버가 어떤 헤더를 보든 대응(Authorization/jwt/x-auth-token)
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
        client.subscribe(SUBS.signals, (msg) => {
          try {
            handlers.onSignal?.(JSON.parse(msg.body));
          } catch (e) {
            console.warn("[STOMP] signals parse error:", e);
          }
        });

        client.subscribe(SUBS.matches, (msg) => {
          try {
            handlers.onMatch?.(JSON.parse(msg.body));
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
      console.error(
        "[STOMP] broker error:",
        frame?.headers?.message,
        "\nbody:",
        frame?.body
      );
      scheduleReconnect();
    },

    onWebSocketError: (e) => {
      connecting = false;
      console.error("[STOMP] websocket error:", e?.message || e);
      scheduleReconnect();
    },

    onWebSocketClose: () => {
      connecting = false;
      console.warn("[STOMP] websocket closed");
      scheduleReconnect();
    },
  };

  // 전송 방식 선택
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
  clearTimeout(retryTimer);
  retryTimer = null;
  connecting = false;
  if (client) {
    try { client.deactivate(); } catch {}
    client = null;
  }
}

export function isConnected() {
  return !!client && client.connected === true;
}
