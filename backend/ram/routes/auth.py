import asyncio

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import check_credentials, is_admin, issue_token
from ..face import CamelModel
from ..services import Services, get_services

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(CamelModel):
    username: str = "admin"
    password: str


class LoginOut(CamelModel):
    token: str
    expires_at: float


@router.post("/login", response_model=LoginOut)
async def login(body: LoginIn, services: Services = Depends(get_services)):
    if not check_credentials(body.username, body.password):
        await asyncio.sleep(0.6)  # deixa tentativa e erro mais lenta
        services.db.log_event("warn", "auth", "Tentativa de login de admin com dados errados")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário ou senha incorretos.")
    token, expires = issue_token(services.secret)
    services.db.log_event("info", "auth", "Admin entrou no painel")
    return LoginOut(token=token, expires_at=expires)


@router.get("/me")
async def me(admin: bool = Depends(is_admin)):
    return {"admin": admin}
