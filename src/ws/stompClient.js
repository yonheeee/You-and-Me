import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_URL, SUBS } from "./wsConfig";

let client = null;

export function connect(token, handlers = {}) {
  console.log("[WS] connect() 호출됨, token:", !!token, "URL:", WS_URL);

  if (client) {
    try { client.deactivate(); } catch {}
    client = null;
  }

  client = new Client({
    webSocketFactory: () => {
      console.log("[WS] SockJS factory 호출:", WS_URL);
      return new SockJS(WS_URL, null, {
        transports: ["websocket", "xhr-streaming", "xhr-polling"],
      });
    },
    // ✅ 서버가 어떤 헤더를 파는지 모르니 모두 전달(Authorization/jwt/x-auth-token)
    connectHeaders: {
      Authorization: `Bearer ${token}`,
      jwt: token,
      "x-auth-token": token,
    },
    debug: (msg) => console.log("[STOMP debug]", msg),

    // ✅ 디버깅 중에는 무한 루프 방지 위해 끔
    reconnectDelay: 0,

    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      console.log("[STOMP] connected 성공");

      // 약간의 지연 후 구독(일부 서버에서 Principal 바인딩 타이밍 이슈 회피)
      setTimeout(() => {
        try {
          client.subscribe(SUBS.signals, (msg) => {
            try {
              const payload = JSON.parse(msg.body);
              console.log("[STOMP] signals 수신:", payload);
              handlers.onSignal?.(payload);
            } catch (e) {
              console.warn("[STOMP] signals parse error:", e);
            }
          });
          client.subscribe(SUBS.matches, (msg) => {
            try {
              const payload = JSON.parse(msg.body);
              console.log("[STOMP] matches 수신:", payload);
              handlers.onMatch?.(payload);
            } catch (e) {
              console.warn("[STOMP] matches parse error:", e);
            }
          });
          console.log("[STOMP] 구독 전송 완료:", SUBS);
        } catch (e) {
          console.error("[STOMP] subscribe 중 예외:", e);
        }
      }, 100);
    },

    onStompError: (frame) => {
      console.error(
        "[STOMP] broker error:",
        frame?.headers?.message,
        "\nbody:", frame?.body
      );
      // 디버깅 편의상 즉시 끊어 루프 방지
      try { client.deactivate(); } catch {}
    },

    onWebSocketError: (e) => {
      console.error("[STOMP] websocket error:", e);
    },
    onWebSocketClose: () => {
      console.warn("[STOMP] websocket closed");
    },
  });

  console.log("[WS] client.activate() 실행");
  client.activate();
}

export function disconnect() {
  if (client) {
    console.log("[WS] disconnect() 실행 → deactivate");
    try { client.deactivate(); } catch {}
    client = null;
  }
}
