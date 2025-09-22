// src/ws/stompClient.js
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_URL } from "./wsConfig";

let client = null;

export const stompClient = () => client;

export function connect(token, handlers = {}) {
  if (client) {
    try {
      client.deactivate();
    } catch {}
    client = null;
  }

  client = new Client({
    webSocketFactory: () =>
      new SockJS(WS_URL, null, {
        transports: ["websocket", "xhr-streaming", "xhr-polling"],
      }),
    connectHeaders: { Authorization: `Bearer ${token}` },
    debug:
      process.env.NODE_ENV === "development"
        ? (msg) => console.log("[STOMP]", msg)
        : () => {}, // ✅ 항상 함수
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      console.log("[STOMP] connected");

      client.subscribe("/user/queue/signals", (msg) => {
        try {
          const payload = JSON.parse(msg.body);
          handlers.onSignal?.(payload);
        } catch (e) {
          console.warn("signal payload parse error", e);
        }
      });

      client.subscribe("/user/queue/matches", (msg) => {
        try {
          const payload = JSON.parse(msg.body);
          handlers.onMatch?.(payload);
        } catch (e) {
          console.warn("match payload parse error", e);
        }
      });
    },
    onStompError: (frame) => {
      console.error("[STOMP] broker error:", frame.headers["message"]);
    },
    onWebSocketError: (e) => {
      console.error("[STOMP] websocket error:", e);
    },
  });

  client.activate();
}

export function disconnect() {
  if (client) {
    try {
      client.deactivate();
    } catch {}
    client = null;
  }
}
