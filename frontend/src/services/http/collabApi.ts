/**
 * Real CollabApi. Talks to the FastAPI WebSocket relay (GET /sync/:sessionId,
 * upgraded per `openapi.yaml`) using the same opaque JSON message contract as
 * the mock's BroadcastChannel transport.
 */
import type { CollabApi, RealtimeChannel } from "../types";
import { WS_BASE_URL } from "./config";

class WebSocketRealtimeChannel implements RealtimeChannel {
  private socket: WebSocket;
  private queue: unknown[] = [];

  constructor(sessionId: string) {
    this.socket = new WebSocket(`${WS_BASE_URL}/sync/${sessionId}`);
    this.socket.addEventListener("open", () => {
      for (const message of this.queue.splice(0)) {
        this.socket.send(JSON.stringify(message));
      }
    });
  }

  send(message: unknown) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.queue.push(message);
    }
  }

  onMessage(handler: (message: unknown) => void) {
    this.socket.addEventListener("message", (e: MessageEvent) => handler(JSON.parse(e.data)));
  }

  close() {
    this.socket.close();
  }
}

export const httpCollabApi: CollabApi = {
  connect(sessionId) {
    return new WebSocketRealtimeChannel(sessionId);
  },
};
