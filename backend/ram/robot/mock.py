"""Robô simulado: gera telemetria plausível para usar o site sem hardware."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import random
import time

from .base import RobotDriver

log = logging.getLogger("ram.robot.mock")

TELEMETRY_INTERVAL = 0.5


class MockDriver(RobotDriver):
    name = "mock"

    def __init__(self) -> None:
        super().__init__()
        self._task: asyncio.Task | None = None
        self._battery = 8.2
        self._dist = {"f": 120.0, "l": 80.0, "r": 140.0}
        self._move = (0.0, 0.0)
        self._last_move_at = 0.0
        self.last_command: dict | None = None

    async def start(self) -> None:
        await self._set_connected(True)
        self._task = asyncio.create_task(self._loop())
        log.info("Robô simulado (MOCK_ROBOT=true) ligado")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        await self._set_connected(False)

    async def send(self, message: dict) -> bool:
        self.last_command = message
        cmd = message.get("cmd")
        if cmd == "move":
            self._move = (float(message.get("x", 0)), float(message.get("y", 0)))
            self._last_move_at = time.monotonic()
        elif cmd == "stop":
            self._move = (0.0, 0.0)
        log.debug("mock <- %s", message)
        return True

    async def _loop(self) -> None:
        while True:
            await asyncio.sleep(TELEMETRY_INTERVAL)
            x, y = self._move
            # O ESP32 real também para sozinho se ficar sem comando.
            if time.monotonic() - self._last_move_at > 0.5:
                x, y = 0.0, 0.0
            moving = abs(x) + abs(y) > 0.05

            drain = 0.004 if moving else 0.0008
            self._battery = max(6.4, self._battery - drain * random.uniform(0.5, 1.5))
            if self._battery <= 6.4:
                self._battery = 8.4  # "recarregou"

            for key in self._dist:
                drift = random.uniform(-6, 6)
                if moving and key == "f":
                    drift -= y * 10
                if moving and key in ("l", "r"):
                    drift += x * (8 if key == "l" else -8)
                value = self._dist[key] + drift
                if value < 8:
                    value = random.uniform(90, 180)  # "desviou" do obstáculo
                self._dist[key] = min(200.0, max(5.0, value))

            await self._emit_telemetry(
                {
                    "bat": round(self._battery, 2),
                    "dist": {k: round(v) for k, v in self._dist.items()},
                }
            )
