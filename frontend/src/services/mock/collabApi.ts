/**
 * Mocked CollabApi. Stands in for a WebSocket relay (e.g. y-websocket) using
 * BroadcastChannel — two browser tabs on the same session id genuinely sync.
 */
import type { CollabApi, RealtimeChannel } from "../types";

class BroadcastRealtimeChannel implements RealtimeChannel {
  private channel: BroadcastChannel;

  constructor(sessionId: string) {
    this.channel = new BroadcastChannel(`interview:${sessionId}`);
  }

  send(message: unknown) {
    this.channel.postMessage(message);
  }

  onMessage(handler: (message: unknown) => void) {
    this.channel.onmessage = (e: MessageEvent) => handler(e.data);
  }

  close() {
    this.channel.close();
  }
}

export const mockCollabApi: CollabApi = {
  connect(sessionId) {
    return new BroadcastRealtimeChannel(sessionId);
  },
};
