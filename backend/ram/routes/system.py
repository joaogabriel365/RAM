import logging

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from .. import __version__
from ..config import settings
from ..services import Services, get_services, panel_url

router = APIRouter(tags=["sistema"])
log = logging.getLogger("ram.ws")


def info(services: Services) -> dict:
    return {
        "name": "RAM",
        "version": __version__,
        "mock": settings.mock_robot,
        "panelUrl": panel_url(),
        "startedAt": services.started_at,
        # Credenciais provisórias mostradas na tela de login. Somem quando ADMIN_PASSWORD
        # deixa de ser a padrão (troque em backend/.env).
        "setupHint": (
            {"user": settings.admin_user, "password": settings.admin_password}
            if settings.using_default_password
            else None
        ),
    }


@router.get("/api/info")
async def get_info(services: Services = Depends(get_services)):
    return info(services)


@router.websocket("/ws")
async def websocket(ws: WebSocket):
    services: Services = ws.app.state.services
    await services.hub.connect(ws)
    try:
        await ws.send_json(
            {
                "type": "hello",
                "info": info(services),
                "face": services.face.state.model_dump(mode="json"),
                "robot": services.robot_message(),
                "telemetry": services.telemetry_message(),
            }
        )
        while True:
            msg = await ws.receive_json()
            kind = msg.get("type") if isinstance(msg, dict) else None
            if kind == "ping":
                await ws.send_json({"type": "pong"})
            elif kind == "touch":
                await services.face.touch()
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # JSON inválido, conexão caiu no meio do envio etc.
        log.debug("WS encerrado: %r", exc)
    finally:
        services.hub.disconnect(ws)
