"""Objetos de longa duração compartilhados pelas rotas (ficam em app.state.services)."""

from __future__ import annotations

import socket
import time
from dataclasses import dataclass, field

from fastapi import Request

from .config import settings
from .db import Database
from .face_store import FaceStore
from .hub import Hub
from .robot import RobotDriver


@dataclass
class Services:
    db: Database
    hub: Hub
    driver: RobotDriver
    face: FaceStore
    secret: bytes
    started_at: float = field(default_factory=time.time)
    telemetry: dict | None = None
    telemetry_ts: float | None = None

    def robot_message(self) -> dict:
        return {"type": "robot", "connected": self.driver.connected, "driver": self.driver.name}

    def telemetry_message(self) -> dict:
        return {"type": "telemetry", "data": self.telemetry, "ts": self.telemetry_ts}


def get_services(request: Request) -> Services:
    return request.app.state.services


def lan_ip() -> str:
    """IP desta máquina na rede local (nenhum pacote é enviado)."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("10.255.255.255", 1))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def panel_url() -> str:
    return settings.public_url or f"http://{lan_ip()}:{settings.port}"
