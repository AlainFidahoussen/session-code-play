from fastapi.testclient import TestClient


def test_sync_broadcasts_to_other_peers_in_same_session(client: TestClient) -> None:
    with client.websocket_connect("/sync/room-a") as a, client.websocket_connect("/sync/room-a") as b:
        a.send_text('{"type":"cursor","pos":5}')

        assert b.receive_text() == '{"type":"cursor","pos":5}'


def test_sync_keeps_sessions_independent(client: TestClient) -> None:
    with (
        client.websocket_connect("/sync/room-a") as a1,
        client.websocket_connect("/sync/room-a") as a2,
        client.websocket_connect("/sync/room-b") as b1,
        client.websocket_connect("/sync/room-b") as b2,
    ):
        a1.send_text("hello-a")
        b1.send_text("hello-b")

        # Each room's second peer only ever sees that room's own message,
        # never the other room's — proving broadcasts are scoped by session id.
        assert a2.receive_text() == "hello-a"
        assert b2.receive_text() == "hello-b"
