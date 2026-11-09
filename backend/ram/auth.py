"""Login de admin com senha única e token assinado (HMAC), sem estado no servidor."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time

from fastapi import Depends, Header, HTTPException, Request, status

from .config import settings


def _secret(request: Request) -> bytes:
    return request.app.state.services.secret


def load_secret(db) -> bytes:
    if settings.secret_key:
        return settings.secret_key.encode()
    stored = db.get_setting("auth.secret")
    if not stored:
        stored = secrets.token_hex(32)
        db.set_setting("auth.secret", stored)
    return stored.encode()


def _sign(secret: bytes, payload: str) -> str:
    digest = hmac.new(secret, payload.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


def issue_token(secret: bytes) -> tuple[str, float]:
    expires = time.time() + settings.token_ttl_hours * 3600
    payload = f"admin.{int(expires)}"
    return f"{payload}.{_sign(secret, payload)}", expires


def verify_token(secret: bytes, token: str) -> bool:
    try:
        role, expires, signature = token.split(".")
    except ValueError:
        return False
    payload = f"{role}.{expires}"
    if not hmac.compare_digest(signature, _sign(secret, payload)):
        return False
    return role == "admin" and expires.isdigit() and int(expires) > time.time()


def check_password(password: str) -> bool:
    return hmac.compare_digest(password.encode(), settings.admin_password.encode())


def check_credentials(username: str, password: str) -> bool:
    # compara os dois sempre, para o tempo de resposta não revelar qual errou
    ok_user = hmac.compare_digest(username.strip().lower().encode(), settings.admin_user.lower().encode())
    return check_password(password) and ok_user


def _bearer(authorization: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


def is_admin(request: Request, authorization: str | None = Header(default=None)) -> bool:
    token = _bearer(authorization)
    return bool(token) and verify_token(_secret(request), token)


def require_admin(admin: bool = Depends(is_admin)) -> None:
    if not admin:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Faça login como admin.")
