// src/ws/stompClient.js
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_ENDPOINT, SUBS } from "./wsConfig";

let client;                // 싱글톤
let subs = {};             // 구독 핸들
let currentToken = null;   // 최신 JWT
let backoffMs = 0;
let reconnectTimer = null;

const MIN = 500;
const MAX = 15000;
const nextBackoff = (prev) => Math.min(MAX, prev ? prev * 2 : MIN);

const makeDebug = () => {
  const dev =
    (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") ||
    typeof process === "undefined"; // 브라우저 환경 기본 on
  return (msg) => {
    if (!dev) return;
    if (typeof console?.log === "function") console.log(`[STOMP] ${msg}`);
  };
};

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function makeClient(token, handlers = {}) {
  const { onSignals, onMatches, onConnected, onDisconnected } = handlers;

  const c = new Client({
    // SockJS는 http(s):// 를 사용
    webSocketFactory: () => new SockJS(WS_ENDPOINT),

    // ✅ 가장 중요: CONNECT 네이티브 헤더에 Authorization 정확히 세팅
    connectHeaders: { Authorization: `Bearer ${token}` },

    // 최신 토큰을 항상 싣기 위해 실제 연결 직전에 갱신
    beforeConnect: () => {
      c.connectHeaders = { Authorization: `Bearer ${currentToken || token}` };
    },

    // 안전한 debug 함수 (호출 금지! 괄호 X)
    debug: makeDebug(),

    // 기본 하트비트 (백엔드 허용 범위에 맞게 필요시 조정)
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    // 라이브러리 내장 reconnectDelay는 0으로 두고, 우리가 커스텀 백오프
    reconnectDelay: 0,

    onConnect: () => {
      makeSureDebugIsFunction(c);
      clearReconnectTimer();
      backoffMs = 0;
      console.log("[STOMP] CONNECTED");

      // 구독 재설정
      unsubAll();

      subs.signals = c.subscribe(SUBS.signals, (msg) => {
        try {
          const data = JSON.parse(msg.body);
          onSignals?.(data);
        } catch (e) {
          console.warn("[WS] signals JSON parse error", e, msg.body);
        }
      });

      subs.matches = c.subscribe(SUBS.matches, (msg) => {
        try {
          const data = JSON.parse(msg.body);
          onMatches?.(data);
        } catch (e) {
          console.warn("[WS] matches JSON parse error", e, msg.body);
        }
      });

      onConnected?.();
    },

    onStompError: (frame) => {
      // 401/403 등 → Authorization 문제 가능성 높음
      console.error("[STOMP] ERROR", frame.headers?.["message"], frame.body);
      scheduleReconnect();
    },

    onWebSocketClose: (evt) => {
      console.warn("[STOMP] WebSocket closed", evt?.reason);
      onDisconnected?.();
      scheduleReconnect();
    },

    onWebSocketError: (err) => {
      console.error("[STOMP] WebSocket error", err?.message || err);
    },
  });

  // 혹시 외부에서 덮어써도 무조건 함수가 되게 방어
  makeSureDebugIsFunction(c);

  return c;
}

function makeSureDebugIsFunction(c) {
  if (typeof c.debug !== "function") {
    try {
      // 덮어쓰기 방지(옵셔널) — 외부에서 true 같은 걸 대입해도 getter가 함수 반환
      Object.defineProperty(c, "debug", {
        configurable: true,
        get: () => makeDebug(),
        set: () => {}, // 무시
      });
    } catch {
      // defineProperty 실패 시에도 최소 no-op 보장
      c.debug = () => {};
    }
  }
}

function unsubAll() {
  Object.values(subs).forEach((s) => {
    try {
      s?.unsubscribe();
    } catch {}
  });
  subs = {};
}

function scheduleReconnect() {
  // 명시적 로그아웃 등
  if (!currentToken) return;

  // 이미 active/connecting이면 중복 예약 금지
  if (client?.active || client?.connecting) return;

  unsubAll();
  backoffMs = nextBackoff(backoffMs);
  clearReconnectTimer();

  reconnectTimer = setTimeout(() => {
    if (!currentToken) return; // 로그아웃 등
    try {
      client.connectHeaders = { Authorization: `Bearer ${currentToken}` };
      client.activate();
    } catch (e) {
      console.error("[STOMP] activate() failed", e);
    }
  }, backoffMs);
}

export function activate(token, handlers) {
  if (client?.active || client?.connecting) return client; // 탭당 1개 유지
  currentToken = token;
  client = makeClient(token, handlers);
  client.activate();
  return client;
}

export async function deactivate() {
  currentToken = null;
  clearReconnectTimer();
  if (!client) return;
  try {
    unsubAll();
    await client.deactivate();
  } catch (e) {
    console.warn("[STOMP] deactivate error", e);
  } finally {
    client = undefined;
    backoffMs = 0;
  }
}

export async function refreshToken(newToken) {
  currentToken = newToken;
  if (!client) return;
  clearReconnectTimer();
  try {
    await client.deactivate(); // 기존 연결 종료
  } catch {}
  client.connectHeaders = { Authorization: `Bearer ${newToken}` };
  client.activate(); // 새 토큰으로 재연결
}
