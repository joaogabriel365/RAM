"""App FastAPI: API REST + WebSocket + frontend buildado."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from . import __version__
from .auth import load_secret
from .config import DEFAULT_ADMIN_PASSWORD, settings
from .db import Database
from .face import FACTORY_PRESETS
from .face_store import FaceStore
from .hub import Hub
from .robot import create_driver
from .routes import routers
from .services import Services, panel_url

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-7s %(name)s: %(message)s")
log = logging.getLogger("ram")


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = Database(settings.db_path)
    db.sync_factory_presets(
        [(name, p.category, p.description, p.appearance.model_dump(mode="json")) for name, p in FACTORY_PRESETS.items()]
    )

    hub = Hub()
    driver = create_driver()
    face = FaceStore(db, hub, driver)
    services = Services(db=db, hub=hub, driver=driver, face=face, secret=load_secret(db))
    app.state.services = services

    async def on_telemetry(data: dict) -> None:
        services.telemetry = data
        services.telemetry_ts = time.time()
        await hub.broadcast(services.telemetry_message())
        await face.on_telemetry(data)

    async def on_status(connected: bool) -> None:
        if connected:
            db.log_event("info", "esp32", f"ESP32 conectado ({driver.name})")
            await face.send_leds()
        else:
            db.log_event("warn", "esp32", "ESP32 desconectado")
        await hub.broadcast(services.robot_message())

    driver.set_callbacks(on_telemetry, on_status)
    await driver.start()
    idle_task = asyncio.create_task(face.run_idle_watch())

    if settings.admin_password == DEFAULT_ADMIN_PASSWORD:
        log.warning("Usando a senha de admin padrão. Defina ADMIN_PASSWORD no backend/.env!")
    db.log_event("info", "sistema", f"RAM v{__version__} iniciado ({'mock' if settings.mock_robot else 'serial'})")
    log.info("Painel: %s   Rosto: %s/face", panel_url(), panel_url())

    try:
        yield
    finally:
        idle_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await idle_task
        await face.shutdown()
        await driver.stop()
        db.close()


app = FastAPI(title="RAM", version=__version__, lifespan=lifespan)
for router in routers:
    app.include_router(router)


# ---------- frontend (SPA) ----------

dist = settings.frontend_dist
NO_CACHE = {"Cache-Control": "no-cache"}

if (dist / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")


@app.get("/{full_path:path}", include_in_schema=False)
async def spa(full_path: str):
    if full_path.startswith(("api/", "ws")):
        raise HTTPException(404)
    index = dist / "index.html"
    if not index.is_file():
        return HTMLResponse(
            "<h1>RAM</h1><p>O frontend ainda não foi buildado. Rode <code>npm run build</code> "
            "em <code>frontend/</code> ou use o servidor de desenvolvimento (<code>npm run dev</code>).</p>",
            status_code=503,
        )
    if full_path:
        candidate = (dist / full_path).resolve()
        if candidate.is_file() and dist.resolve() in candidate.parents:
            return FileResponse(candidate)
    return FileResponse(index, headers=NO_CACHE)
