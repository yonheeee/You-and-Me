// src/ws/stompClient.js
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_ENDPOINT, SUBS } from "./wsConfig";

let client;                // 싱글톤
let subs = {};             // 구독 핸들
let currentToken = null;   // 최신 JWT
let backoffMs = 0;

const MIN = 500;
const MAX = 15000;
const nextBackoff = (prev) => Math.min(MAX, prev ? prev * 2 : MIN);

function makeClient(token, handlers = {}) {
  const { onSignals, onMatches, onConnected, onDisconnected } = handlers;

  const c = new Client({
    // SockJS는 http(s):// 를 사용
    webSocketFactory: () => new SockJS(WS_ENDPOINT),
    // ✅ 가장 중요: CONNECT 네이티브 헤더에 Authorization 정확히 세팅
    connectHeaders: { Authorization: `Bearer ${token}` },

    // 디버그 로그 (원하면 끄세요)
    debug: (str) => console.log(`[STOMP] ${str}`),

    // 라이브러리 내장 reconnectDelay는 0으로 두고, 우리가 커스텀 백오프
    reconnectDelay: 0,

    onConnect: () => {
      console.log("[STOMP] CONNECTED");
      backoffMs = 0;

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
      console.error("[STOMP] ERROR", frame.headers["message"], frame.body);
      scheduleReconnect(); // 백오프 재시도
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

  return c;
}

function unsubAll() {
  Object.values(subs).forEach((s) => {
    try { s?.unsubscribe(); } catch {}
  });
  subs = {};
}

function scheduleReconnect() {
  if (!client) return;

  // 이미 active면 자연 종료를 기다림
  if (client.active) return;

  unsubAll();
  backoffMs = nextBackoff(backoffMs);

  // 최신 토큰 헤더로 재활성화
  setTimeout(() => {
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
  if (client?.active) return client; // 탭당 1개 유지
  currentToken = token;
  client = makeClient(token, handlers);
  client.activate();
  return client;
}

export async function deactivate() {
  currentToken = null;
  if (!client) return;
  try {
    unsubAll();
    await client.deactivate();
  } catch (e) {
    console.warn("[STOMP] deactivate error", e);
  } finally {
    client = undefined;
  }
}

export async function refreshToken(newToken) {
  currentToken = newToken;
  if (!client) return;
  // 새 CONNECT 헤더 반영을 위해 재활성화
  try {
    await client.deactivate();
  } catch {}
  client.connectHeaders = { Authorization: `Bearer ${newToken}` };
  client.activate();
}
