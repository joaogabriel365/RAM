"""Driver real: ESP32 via serial USB, uma mensagem JSON por linha."""

from __future__ import annotations

import asyncio
import json
import logging
import threading

import serial

from .base import RobotDriver

log = logging.getLogger("ram.robot.serial")

RECONNECT_DELAY = 2.0
MAX_LINE = 4096


class SerialDriver(RobotDriver):
    name = "serial"

    def __init__(self, port: str, baud: int) -> None:
        super().__init__()
        self.port = port
        self.baud = baud
        self._serial: serial.Serial | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._stop = threading.Event()
        self._write_lock = threading.Lock()
        self._thread: threading.Thread | None = None

    async def start(self) -> None:
        self._loop = asyncio.get_running_loop()
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="esp32-serial", daemon=True)
        self._thread.start()
        log.info("Procurando ESP32 em %s @ %d", self.port, self.baud)

    async def stop(self) -> None:
        self._stop.set()
        if self._thread:
            await asyncio.to_thread(self._thread.join, 3)

    async def send(self, message: dict) -> bool:
        if self._serial is None:
            return False
        data = (json.dumps(message, separators=(",", ":")) + "\n").encode()
        try:
            await asyncio.to_thread(self._write, data)
            return True
        except (serial.SerialException, OSError, AttributeError) as exc:
            log.warning("Falha ao enviar para o ESP32: %s", exc)
            return False

    def _write(self, data: bytes) -> None:
        with self._write_lock:
            ser = self._serial
            if ser is None:
                raise serial.SerialException("desconectado")
            ser.write(data)

    # ---------- thread de leitura ----------

    def _call(self, coro) -> None:
        if self._loop and not self._loop.is_closed():
            asyncio.run_coroutine_threadsafe(coro, self._loop)

    def _run(self) -> None:
        warned = False
        while not self._stop.is_set():
            try:
                with serial.Serial(self.port, self.baud, timeout=0.2) as ser:
                    self._serial = ser
                    warned = False
                    log.info("ESP32 conectado em %s", self.port)
                    self._call(self._set_connected(True))
                    self._read_lines(ser)
            except (serial.SerialException, OSError) as exc:
                if not warned:
                    log.warning("ESP32 indisponível em %s: %s", self.port, exc)
                    warned = True
            finally:
                if self._serial is not None:
                    self._serial = None
                    self._call(self._set_connected(False))
            self._stop.wait(RECONNECT_DELAY)

    def _read_lines(self, ser: serial.Serial) -> None:
        buffer = b""
        while not self._stop.is_set():
            chunk = ser.read(ser.in_waiting or 1)
            if not chunk:
                continue
            buffer += chunk
            while b"\n" in buffer:
                line, buffer = buffer.split(b"\n", 1)
                self._handle_line(line)
            if len(buffer) > MAX_LINE:
                buffer = b""

    def _handle_line(self, line: bytes) -> None:
        text = line.decode("utf-8", errors="replace").strip()
        if not text:
            return
        try:
            data = json.loads(text)
        except ValueError:
            log.debug("ESP32 (texto): %s", text)
            return
        if isinstance(data, dict):
            self._call(self._emit_telemetry(data))
