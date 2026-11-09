"""Fonte única da verdade do rosto: toda mudança passa por aqui e vai por WebSocket."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time

from pydantic import ValidationError

from .config import settings
from .db import Database
from .face import (
    DEFAULT_PRESET,
    FACTORY_PRESETS,
    Expression,
    FaceAppearance,
    FaceState,
    Speech,
    led_command,
)
from .hub import Hub
from .robot import RobotDriver

log = logging.getLogger("ram.face")

IDLE_CHECK_INTERVAL = 2.0
TOUCH_COOLDOWN = 1.0

# Reações automáticas à telemetria
OBSTACLE_CM = 25
OBSTACLE_COOLDOWN = 15.0
LOW_BATTERY_V = 6.9
BATTERY_COOLDOWN = 300.0


class FaceStore:
    def __init__(self, db: Database, hub: Hub, driver: RobotDriver) -> None:
        self._db = db
        self._hub = hub
        self._driver = driver
        appearance = self._load_appearance()
        self._base_expression: Expression = appearance.behavior.mood
        self.state = FaceState(appearance=appearance, expression=self._base_expression)
        self._last_led: dict | None = None
        self._last_interaction = time.monotonic()
        self._last_touch = 0.0
        self._last_obstacle = 0.0
        self._last_battery = -BATTERY_COOLDOWN
        self._revert_task: asyncio.Task | None = None
        self._speech_task: asyncio.Task | None = None
        self._speech_seq = 0

    def _load_appearance(self) -> FaceAppearance:
        saved = self._db.get_setting("face.appearance")
        if saved:
            try:
                return FaceAppearance.model_validate(saved)
            except ValidationError:
                log.warning("Aparência salva inválida; usando o preset padrão")
        return FACTORY_PRESETS[DEFAULT_PRESET].appearance.model_copy(deep=True)

    @property
    def rest_minutes(self) -> float:
        return float(self._db.get_setting("rest_minutes", settings.rest_minutes))

    def message(self) -> dict:
        return {"type": "face", "state": self.state.model_dump(mode="json")}

    async def _publish(self) -> None:
        self.state.rev += 1
        await self._hub.broadcast(self.message())

    # ---------- aparência ----------

    async def set_appearance(self, appearance: FaceAppearance) -> FaceState:
        mood_changed = appearance.behavior.mood != self.state.appearance.behavior.mood
        self.state.appearance = appearance
        self._db.set_setting("face.appearance", appearance.model_dump(mode="json"))
        self._wake()
        if mood_changed:
            # o humor é a expressão de repouso; aplica já, a menos que algo temporário esteja na tela
            self._base_expression = appearance.behavior.mood
            if not (self._revert_task and not self._revert_task.done()):
                self.state.expression = self._base_expression
        if led_command(appearance) != self._last_led:
            await self.send_leds()
        await self._publish()
        return self.state

    async def send_leds(self) -> bool:
        command = led_command(self.state.appearance)
        sent = await self._driver.send(command)
        if sent:
            self._last_led = command
        return sent

    # ---------- expressão ----------

    async def set_expression(
        self, expression: Expression, hold_ms: int | None = None, interaction: bool = True
    ) -> FaceState:
        """Troca a expressão. Com hold_ms, volta para a anterior depois desse tempo.

        interaction=False é para reações automáticas: não conta como alguém mexendo no robô.
        """
        self._cancel(self._revert_task)
        if interaction:
            self._wake()
        if hold_ms:
            self._revert_task = asyncio.create_task(self._revert_after(hold_ms / 1000))
        else:
            self._base_expression = expression
        self.state.expression = expression
        await self._publish()
        return self.state

    async def _revert_after(self, delay: float) -> None:
        await asyncio.sleep(delay)
        if not self.state.sleeping:
            self.state.expression = self._base_expression
            await self._publish()

    # ---------- fala ----------

    async def say(self, text: str, interaction: bool = True) -> FaceState:
        self._cancel(self._speech_task)
        self._speech_seq += 1
        self.state.speech = Speech(id=self._speech_seq, text=text, ts=time.time())
        if interaction:
            self._wake()
        await self._publish()
        # Tempo para digitar + ler com calma.
        duration = 3.0 + len(text) / 30 + len(text) / 15
        self._speech_task = asyncio.create_task(self._clear_speech_after(duration, self._speech_seq))
        return self.state

    async def clear_speech(self) -> FaceState:
        self._cancel(self._speech_task)
        if self.state.speech is not None:
            self.state.speech = None
            await self._publish()
        return self.state

    async def _clear_speech_after(self, delay: float, speech_id: int) -> None:
        await asyncio.sleep(delay)
        if self.state.speech and self.state.speech.id == speech_id:
            self.state.speech = None
            await self._publish()

    # ---------- interação / reações / descanso ----------

    async def touch(self) -> None:
        """Alguém tocou na tela do rosto."""
        now = time.monotonic()
        if now - self._last_touch < TOUCH_COOLDOWN:
            return
        self._last_touch = now
        was_sleeping = self.state.sleeping
        if was_sleeping:
            self._db.log_event("info", "rosto", "Acordou com um toque na tela")
        if self.state.appearance.behavior.react_touch:
            await self.set_expression("surpreso" if was_sleeping else "feliz", hold_ms=1500)
        else:
            self._wake()
            if was_sleeping:
                await self._publish()

    async def on_telemetry(self, data: dict) -> None:
        """Reações automáticas: obstáculo muito perto, bateria fraca."""
        behavior = self.state.appearance.behavior
        if self.state.sleeping:
            return
        now = time.monotonic()

        front = (data.get("dist") or {}).get("f")
        if (
            behavior.react_obstacle
            and isinstance(front, (int, float))
            and front < OBSTACLE_CM
            and now - self._last_obstacle > OBSTACLE_COOLDOWN
        ):
            self._last_obstacle = now
            await self.set_expression("surpreso", hold_ms=1500, interaction=False)

        battery = data.get("bat")
        if (
            behavior.react_battery
            and isinstance(battery, (int, float))
            and battery < LOW_BATTERY_V
            and now - self._last_battery > BATTERY_COOLDOWN
        ):
            self._last_battery = now
            self._db.log_event("warn", "esp32", f"Bateria fraca: {battery:.2f} V")
            await self.set_expression("triste", hold_ms=5000, interaction=False)
            await self.say("Minha bateria está acabando… me leva pra carregar?", interaction=False)

    def _wake(self) -> None:
        """Registra interação; se estava dormindo por inatividade, acorda."""
        self._last_interaction = time.monotonic()
        if self.state.sleeping:
            self.state.sleeping = False
            self.state.expression = self._base_expression

    async def run_idle_watch(self) -> None:
        while True:
            await asyncio.sleep(IDLE_CHECK_INTERVAL)
            minutes = self.rest_minutes
            if minutes <= 0 or self.state.sleeping:
                continue
            if time.monotonic() - self._last_interaction >= minutes * 60:
                self._cancel(self._revert_task)
                self._cancel(self._speech_task)
                self.state.sleeping = True
                self.state.expression = "dormindo"
                self.state.speech = None
                self._db.log_event("info", "rosto", f"{minutes:g} min sem interação: modo descanso")
                await self._publish()

    @staticmethod
    def _cancel(task: asyncio.Task | None) -> None:
        if task and not task.done():
            task.cancel()

    async def shutdown(self) -> None:
        for task in (self._revert_task, self._speech_task):
            self._cancel(task)
            if task:
                with contextlib.suppress(asyncio.CancelledError):
                    await task
