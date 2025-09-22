// src/ws/stompClient.js
import { Client } from "@stomp/stompjs";
import { WS_URL, SUBS } from "./wsConfig";
// WS_URL = "https://api.likelionhsu.co.kr/api/ws"

let client = null;

// 👉 SockJS 대신 순수 WS 사용: wss://.../api/ws/websocket?token=...
function makeBrokerURL(token) {
  // SockJS endpoint의 native ws 엔드포인트는 보통 .../websocket 로 열립니다.
  const base = WS_URL.replace(/^http(s?):\/\//, "wss://"); // https -> wss
  const wsEntry = base.endsWith("/websocket") ? base : `${base}/websocket`;
  const q = `token=${encodeURIComponent(token)}`;
  return `${wsEntry}?${q}`;
}

export function connect(token, handlers = {}) {
  console.log("[WS] connect(plain-ws) token:", !!token, "WS_URL:", WS_URL);

  if (client) {
    try { client.deactivate(); } catch {}
    client = null;
  }

  client = new Client({
    // ✅ 순수 WebSocket 사용
    brokerURL: makeBrokerURL(token),
    // SockJS가 아니므로 webSocketFactory는 사용 안 함
    connectHeaders: {
      // 혹시 서버가 CONNECT 헤더도 참고한다면 같이 넘겨둠
      Authorization: `Bearer ${token}`,
      jwt: token,
      "x-auth-token": token,
    },
    debug: (m) => console.log("[STOMP debug]", m),

    // 디버깅 중 무한루프 방지
    reconnectDelay: 0,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      console.log("[STOMP] connected (plain-ws) ✅");

      // 구독 (필요 시 살짝 지연)
      setTimeout(() => {
        try {
          client.subscribe(SUBS.signals, (msg) => {
            try {
              const payload = JSON.parse(msg.body);
              console.log("[STOMP] signals:", payload);
              handlers.onSignal?.(payload);
            } catch (e) {
              console.warn("[STOMP] signals parse error:", e);
            }
          }, { receipt: "sub-signals" });

          client.subscribe(SUBS.matches, (msg) => {
            try {
              const payload = JSON.parse(msg.body);
              console.log("[STOMP] matches:", payload);
              handlers.onMatch?.(payload);
            } catch (e) {
              console.warn("[STOMP] matches parse error:", e);
            }
          }, { receipt: "sub-matches" });

          console.log("[STOMP] 구독 전송:", SUBS);
        } catch (e) {
          console.error("[STOMP] subscribe 예외:", e);
        }
      }, 150);
    },

    onStompError: (frame) => {
      console.error("[STOMP] broker error:", frame?.headers?.message, "\nbody:", frame?.body);
      try { client.deactivate(); } catch {}
    },
    onWebSocketError: (e) => {
      console.error("[STOMP] websocket error:", e);
    },
    onWebSocketClose: () => {
      console.warn("[STOMP] websocket closed");
    },
  });

  console.log("[WS] client.activate()");
  client.activate();
}

export function disconnect() {
  if (client) {
    console.log("[WS] disconnect()");
    try { client.deactivate(); } catch {}
    client = null;
  }
}
