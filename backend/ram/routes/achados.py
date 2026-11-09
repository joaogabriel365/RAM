"""Achados e perdidos do lab: qualquer um vê a lista; só o admin cadastra e dá baixa."""

import time
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import Field

from ..auth import require_admin
from ..face import CamelModel
from ..services import Services, get_services

router = APIRouter(prefix="/api/achados", tags=["achados e perdidos"])
admin = [Depends(require_admin)]


class LostItem(CamelModel):
    id: int
    name: str
    description: str
    place: str
    found_on: date
    returned: bool
    returned_to: str
    returned_at: float | None
    created_at: float


class LostCreate(CamelModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field("", max_length=300)
    place: str = Field("", max_length=80)
    found_on: date


class LostUpdate(CamelModel):
    name: str | None = Field(None, min_length=1, max_length=80)
    description: str | None = Field(None, max_length=300)
    place: str | None = Field(None, max_length=80)
    found_on: date | None = None
    returned: bool | None = None
    returned_to: str | None = Field(None, max_length=80)


def _get_or_404(services: Services, item_id: int) -> dict:
    item = services.db.get_lost(item_id)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item não encontrado.")
    return item


@router.get("", response_model=list[LostItem])
async def list_items(services: Services = Depends(get_services)):
    return services.db.list_lost()


@router.post("", response_model=LostItem, status_code=status.HTTP_201_CREATED, dependencies=admin)
async def create_item(body: LostCreate, services: Services = Depends(get_services)):
    item = services.db.create_lost(
        body.name.strip(), body.description.strip(), body.place.strip(), body.found_on.isoformat()
    )
    services.db.log_event("info", "achados", f"Item registrado: {item['name']}")
    return item


@router.patch("/{item_id}", response_model=LostItem, dependencies=admin)
async def update_item(item_id: int, body: LostUpdate, services: Services = Depends(get_services)):
    item = _get_or_404(services, item_id)
    changes: dict = {}
    for key in ("name", "description", "place", "returned_to"):
        value = getattr(body, key)
        if value is not None:
            changes[key] = value.strip()
    if body.found_on is not None:
        changes["found_on"] = body.found_on.isoformat()
    if body.returned is not None and body.returned != item["returned"]:
        changes["returned"] = int(body.returned)
        changes["returned_at"] = time.time() if body.returned else None
        if not body.returned:
            changes["returned_to"] = ""
        services.db.log_event(
            "info", "achados", f"{item['name']}: {'devolvido' if body.returned else 'voltou para guardados'}"
        )
    return services.db.update_lost(item_id, **changes)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=admin)
async def delete_item(item_id: int, services: Services = Depends(get_services)):
    item = _get_or_404(services, item_id)
    services.db.delete_lost(item_id)
    services.db.log_event("info", "achados", f"Item excluído: {item['name']}")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
