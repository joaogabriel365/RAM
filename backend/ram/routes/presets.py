from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import Field

from ..auth import require_admin
from ..db import DuplicateName
from ..face import CamelModel, FaceAppearance, FaceState
from ..services import Services, get_services

# Listar é público (a galeria aparece para visitantes); alterar e aplicar exigem admin.
router = APIRouter(prefix="/api/presets", tags=["presets"])
admin = [Depends(require_admin)]

class Preset(CamelModel):
    id: int
    name: str
    appearance: FaceAppearance
    factory: bool
    category: str
    description: str
    created_at: float
    updated_at: float


class PresetCreate(CamelModel):
    name: str = Field(min_length=1, max_length=40)
    appearance: FaceAppearance


class PresetUpdate(CamelModel):
    name: str | None = Field(None, min_length=1, max_length=40)
    appearance: FaceAppearance | None = None


def _get_or_404(services: Services, preset_id: int) -> dict:
    preset = services.db.get_preset(preset_id)
    if not preset:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Preset não encontrado.")
    return preset


def _duplicate(name: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, f"Já existe um preset chamado “{name}”.")


@router.get("", response_model=list[Preset])
async def list_presets(services: Services = Depends(get_services)):
    return services.db.list_presets()


@router.post("", response_model=Preset, status_code=status.HTTP_201_CREATED, dependencies=admin)
async def create_preset(body: PresetCreate, services: Services = Depends(get_services)):
    name = body.name.strip()
    try:
        preset = services.db.create_preset(name, body.appearance.model_dump(mode="json"))
    except DuplicateName:
        raise _duplicate(name) from None
    services.db.log_event("info", "presets", f"Preset “{name}” salvo")
    return preset


@router.patch("/{preset_id}", response_model=Preset, dependencies=admin)
async def update_preset(preset_id: int, body: PresetUpdate, services: Services = Depends(get_services)):
    preset = _get_or_404(services, preset_id)
    if preset["factory"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Presets de fábrica não podem ser alterados.")
    name = body.name.strip() if body.name else None
    appearance = body.appearance.model_dump(mode="json") if body.appearance else None
    try:
        return services.db.update_preset(preset_id, name=name, appearance=appearance)
    except DuplicateName:
        raise _duplicate(name or "") from None


@router.delete("/{preset_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=admin)
async def delete_preset(preset_id: int, services: Services = Depends(get_services)):
    preset = _get_or_404(services, preset_id)
    if preset["factory"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Presets de fábrica não podem ser excluídos.")
    services.db.delete_preset(preset_id)
    services.db.log_event("info", "presets", f"Preset “{preset['name']}” excluído")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{preset_id}/apply", response_model=FaceState, dependencies=admin)
async def apply_preset(preset_id: int, services: Services = Depends(get_services)):
    preset = _get_or_404(services, preset_id)
    services.db.log_event("info", "presets", f"Preset “{preset['name']}” aplicado no rosto")
    return await services.face.set_appearance(FaceAppearance.model_validate(preset["appearance"]))
