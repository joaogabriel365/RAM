"""Conexões WebSocket abertas (rosto + painéis) e broadcast."""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import WebSocket

log = logging.getLogger("ram.hub")


class Hub:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()

    @property
    def count(self) -> int:
        return len(self._clients)

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.discard(ws)

    async def broadcast(self, message: dict) -> None:
        if not self._clients:
            return
        data = json.dumps(message, separators=(",", ":"))
        clients = list(self._clients)
        results = await asyncio.gather(
            *(asyncio.wait_for(ws.send_text(data), timeout=2) for ws in clients),
            return_exceptions=True,
        )
        for ws, result in zip(clients, results):
            if isinstance(result, BaseException):
                log.debug("descartando cliente WS: %r", result)
                self._clients.discard(ws)
