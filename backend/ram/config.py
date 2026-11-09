"""Configuração lida de variáveis de ambiente (e de um backend/.env opcional)."""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent

log = logging.getLogger("ram.config")


def _load_env_file(path: Path) -> None:
    """Carrega KEY=VALUE de um arquivo .env sem sobrescrever o ambiente real."""
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env_file(BACKEND_DIR / ".env")


def _bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "sim", "on"}


def _path(name: str, default: Path) -> Path:
    value = os.getenv(name)
    return Path(value).expanduser().resolve() if value else default


DEFAULT_SERIAL_PORT = "COM3" if sys.platform.startswith("win") else "/dev/ttyUSB0"
DEFAULT_ADMIN_PASSWORD = "ram-admin"


class Settings:
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))

    # Robô: MOCK_ROBOT=true simula o ESP32 (bateria, sensores) sem hardware.
    mock_robot: bool = _bool("MOCK_ROBOT", False)
    serial_port: str = os.getenv("SERIAL_PORT", DEFAULT_SERIAL_PORT)
    serial_baud: int = int(os.getenv("SERIAL_BAUD", "115200"))

    data_dir: Path = _path("DATA_DIR", BACKEND_DIR / "data")
    frontend_dist: Path = _path("FRONTEND_DIST", PROJECT_DIR / "frontend" / "dist")

    admin_user: str = os.getenv("ADMIN_USER", "admin")
    admin_password: str = os.getenv("ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD)

    @property
    def using_default_password(self) -> bool:
        return self.admin_password == DEFAULT_ADMIN_PASSWORD
    secret_key: str | None = os.getenv("SECRET_KEY") or None
    token_ttl_hours: float = float(os.getenv("TOKEN_TTL_HOURS", "12"))

    # URL que o QR code do /face mostra. Vazio = descobre o IP da rede sozinho.
    public_url: str | None = os.getenv("PUBLIC_URL") or None

    # Valor inicial do tempo até o modo descanso (depois fica salvo no banco).
    rest_minutes: float = float(os.getenv("REST_MINUTES", "5"))

    @property
    def db_path(self) -> Path:
        return self.data_dir / "ram.db"


settings = Settings()
