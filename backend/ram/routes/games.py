"""Mini-jogos: abertos para qualquer um no painel (são para os visitantes), com o rosto reagindo."""

import random
import time
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import Field

from .. import games
from ..face import CamelModel
from ..services import Services, get_services

router = APIRouter(prefix="/api/games", tags=["mini-jogos"])

# Evita que um celular fique disparando falas sem parar no rosto.
SPEECH_COOLDOWN = 1.5
_last_speech = 0.0


async def _react(services: Services, game: str, outcome: games.Outcome, ram_hand: games.Hand | None = None) -> None:
    global _last_speech
    await services.face.set_expression(games.REACTION_EXPRESSION[outcome], hold_ms=games.REACTION_HOLD_MS)
    now = time.monotonic()
    if now - _last_speech >= SPEECH_COOLDOWN:
        _last_speech = now
        await services.face.say(games.reaction_text(game, outcome, ram_hand))


class StartIn(CamelModel):
    game: Literal["velha", "ppt"]


@router.post("/start", status_code=status.HTTP_204_NO_CONTENT)
async def start(body: StartIn, services: Services = Depends(get_services)):
    """Nova partida: a RAM fica animada e convida para jogar."""
    global _last_speech
    await services.face.set_expression("feliz", hold_ms=1500)
    now = time.monotonic()
    if now - _last_speech >= SPEECH_COOLDOWN:
        _last_speech = now
        await services.face.say(games.GREETINGS[body.game])


# ---------- jogo da velha ----------


class VelhaIn(CamelModel):
    board: list[str] = Field(min_length=9, max_length=9)
    level: games.Level = "normal"


class VelhaOut(CamelModel):
    board: list[str]
    ram_move: int | None
    winner: Literal["X", "O", "empate"] | None
    line: list[int] | None


@router.post("/velha", response_model=VelhaOut)
async def velha(body: VelhaIn, services: Services = Depends(get_services)):
    """Recebe o tabuleiro depois da jogada do jogador (ou vazio, se a RAM começa) e devolve a da RAM."""
    try:
        board = games.validate(body.board)
    except games.InvalidBoard as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from None

    result, line = games.winner(board)
    move = None
    if result is None:
        move = games.ram_move(board, body.level)
        board = board[:move] + (games.RAM,) + board[move + 1 :]
        result, line = games.winner(board)

    if result is None:
        await services.face.set_expression("pensando", hold_ms=1200)
    else:
        outcome: games.Outcome = "empate" if result == "empate" else ("ram" if result == games.RAM else "jogador")
        await _react(services, "velha", outcome)
        services.db.log_event("info", "jogos", f"Jogo da velha ({body.level}): {outcome}")

    return VelhaOut(board=list(board), ram_move=move, winner=result, line=list(line) if line else None)


# ---------- pedra, papel e tesoura ----------


class PptIn(CamelModel):
    choice: games.Hand


class PptOut(CamelModel):
    ram: games.Hand
    outcome: games.Outcome


@router.post("/ppt", response_model=PptOut)
async def ppt(body: PptIn, services: Services = Depends(get_services)):
    ram: games.Hand = random.choice(["pedra", "papel", "tesoura"])
    outcome = games.rps_outcome(body.choice, ram)
    await _react(services, "ppt", outcome, ram)
    return PptOut(ram=ram, outcome=outcome)
