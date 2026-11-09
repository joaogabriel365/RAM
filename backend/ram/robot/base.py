"""Interface comum dos drivers do robô (ESP32 real via serial ou simulado)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Awaitable, Callable

TelemetryCallback = Callable[[dict], Awaitable[None]]
StatusCallback = Callable[[bool], Awaitable[None]]


class RobotDriver(ABC):
    """Envia comandos JSON ao ESP32 e recebe telemetria.

    Comandos (uma linha JSON cada):
        {"cmd": "move", "x": -1..1, "y": -1..1}
        {"cmd": "stop"}
        {"cmd": "led", "color": "#RRGGBB", "effect": "solid|breathe|rainbow|blink"}
    Telemetria do ESP32:
        {"bat": 7.8, "dist": {"f": 42, "l": 80, "r": 120}}
    """

    name = "base"

    def __init__(self) -> None:
        self.connected = False
        self._on_telemetry: TelemetryCallback | None = None
        self._on_status: StatusCallback | None = None

    def set_callbacks(self, on_telemetry: TelemetryCallback, on_status: StatusCallback) -> None:
        self._on_telemetry = on_telemetry
        self._on_status = on_status

    @abstractmethod
    async def start(self) -> None: ...

    @abstractmethod
    async def stop(self) -> None: ...

    @abstractmethod
    async def send(self, message: dict) -> bool:
        """Envia um comando. Retorna False se o ESP32 não estiver conectado."""

    async def _emit_telemetry(self, data: dict) -> None:
        if self._on_telemetry:
            await self._on_telemetry(data)

    async def _set_connected(self, value: bool) -> None:
        if value == self.connected:
            return
        self.connected = value
        if self._on_status:
            await self._on_status(value)
