"""Realtime sync channel (`GET /sync/{sessionId}`, WebSocket upgrade).

Per `openapi.yaml`, the wire format is caller-defined and opaque to the
server; this relay only broadcasts whatever payload a client sends to every
other client connected to the same session, mirroring the mock's
`BroadcastChannel` transport (`frontend/src/services/mock/collabApi.ts`).
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["sync"])


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(session_id, set()).add(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        peers = self._connections.get(session_id)
        if peers is None:
            return
        peers.discard(websocket)
        if not peers:
            del self._connections[session_id]

    async def broadcast(self, session_id: str, sender: WebSocket, message: str) -> None:
        for peer in self._connections.get(session_id, set()):
            if peer is not sender:
                await peer.send_text(message)


manager = ConnectionManager()


@router.websocket("/sync/{session_id}")
async def connect_realtime_channel(websocket: WebSocket, session_id: str) -> None:
    await manager.connect(session_id, websocket)
    try:
        while True:
            message = await websocket.receive_text()
            await manager.broadcast(session_id, websocket, message)
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
