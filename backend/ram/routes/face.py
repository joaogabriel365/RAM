from fastapi import APIRouter, Depends
from pydantic import Field

from ..auth import require_admin
from ..face import CamelModel, Expression, FaceAppearance, FaceState
from ..services import Services, get_services

router = APIRouter(prefix="/api/face", tags=["rosto"])


class ExpressionIn(CamelModel):
    expression: Expression
    hold_ms: int | None = Field(None, ge=200, le=60_000)


class SayIn(CamelModel):
    text: str = Field(min_length=1, max_length=280)


@router.get("", response_model=FaceState)
async def get_face(services: Services = Depends(get_services)):
    return services.face.state


@router.put("/appearance", response_model=FaceState, dependencies=[Depends(require_admin)])
async def put_appearance(body: FaceAppearance, services: Services = Depends(get_services)):
    return await services.face.set_appearance(body)


@router.post("/expression", response_model=FaceState, dependencies=[Depends(require_admin)])
async def post_expression(body: ExpressionIn, services: Services = Depends(get_services)):
    return await services.face.set_expression(body.expression, body.hold_ms)


@router.post("/say", response_model=FaceState, dependencies=[Depends(require_admin)])
async def post_say(body: SayIn, services: Services = Depends(get_services)):
    return await services.face.say(body.text.strip())


@router.delete("/say", response_model=FaceState, dependencies=[Depends(require_admin)])
async def delete_say(services: Services = Depends(get_services)):
    return await services.face.clear_speech()
