// src/ws/stompClient.js
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_URL, SUBS } from "./wsConfig";

let client = null;

export function connect(token, handlers = {}) {
  console.log("[WS] connect() 호출됨, token:", token, "URL:", WS_URL);

  if (client) {
    console.log("[WS] 기존 client 발견 → deactivate 실행");
    try {
      client.deactivate();
    } catch {}
    client = null;
  }

  client = new Client({
    webSocketFactory: () => {
      console.log("[WS] SockJS factory 호출됨, URL:", WS_URL);
      return new SockJS(WS_URL, null, {
        transports: ["websocket", "xhr-streaming", "xhr-polling"],
      });
    },
    connectHeaders: { Authorization: `Bearer ${token}` },
    debug: (msg) => console.log("[STOMP debug]", msg),
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      console.log("[STOMP] connected 성공");

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
    },

    onStompError: (frame) => {
      console.error("[STOMP] broker error:", frame.headers["message"], frame.body);
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
    console.log("[WS] disconnect() 실행 → client.deactivate()");
    try {
      client.deactivate();
    } catch {}
    client = null;
  } else {
    console.log("[WS] disconnect() 실행됐지만 client 없음");
  }
}
