"""Mini-jogos contra a RAM: jogo da velha (minimax) e pedra-papel-tesoura."""

from __future__ import annotations

import random
from functools import lru_cache
from typing import Literal

Cell = Literal["", "X", "O"]
Level = Literal["facil", "normal", "dificil"]
Hand = Literal["pedra", "papel", "tesoura"]
Outcome = Literal["ram", "jogador", "empate"]

# O jogador é sempre X e a RAM é sempre O.
PLAYER, RAM = "X", "O"

LINES = (
    (0, 1, 2), (3, 4, 5), (6, 7, 8),
    (0, 3, 6), (1, 4, 7), (2, 5, 8),
    (0, 4, 8), (2, 4, 6),
)

# Chance de a RAM jogar uma casa qualquer em vez da melhor.
MISTAKE_CHANCE: dict[str, float] = {"facil": 0.6, "normal": 0.25, "dificil": 0.0}


class InvalidBoard(ValueError):
    pass


def winner(board: tuple[str, ...]) -> tuple[str | None, tuple[int, int, int] | None]:
    """("X" | "O", linha) se alguém fechou, ("empate", None) se encheu, (None, None) se segue."""
    for line in LINES:
        a, b, c = (board[i] for i in line)
        if a and a == b == c:
            return a, line
    if all(board):
        return "empate", None
    return None, None


@lru_cache(maxsize=None)
def _score(board: tuple[str, ...], turn: str) -> int:
    """Minimax do ponto de vista da RAM: +10 vence, -10 perde (vitórias rápidas valem mais)."""
    result, _ = winner(board)
    if result == RAM:
        return 10 + board.count("")
    if result == PLAYER:
        return -10 - board.count("")
    if result == "empate":
        return 0
    nxt = PLAYER if turn == RAM else RAM
    scores = [_score(board[:i] + (turn,) + board[i + 1 :], nxt) for i, v in enumerate(board) if not v]
    return max(scores) if turn == RAM else min(scores)


def ram_move(board: tuple[str, ...], level: Level) -> int:
    free = [i for i, v in enumerate(board) if not v]
    if random.random() < MISTAKE_CHANCE[level]:
        return random.choice(free)
    scored = [(_score(board[:i] + (RAM,) + board[i + 1 :], PLAYER), i) for i in free]
    best = max(s for s, _ in scored)
    return random.choice([i for s, i in scored if s == best])


def validate(board: list[str]) -> tuple[str, ...]:
    if len(board) != 9 or any(v not in ("", PLAYER, RAM) for v in board):
        raise InvalidBoard("Tabuleiro inválido.")
    xs, os = board.count(PLAYER), board.count(RAM)
    # quem começa pode ser qualquer um, então a diferença é no máximo 1
    if abs(xs - os) > 1:
        raise InvalidBoard("Jogadas fora de ordem.")
    return tuple(board)


def rps_outcome(player: Hand, ram: Hand) -> Outcome:
    beats = {"pedra": "tesoura", "papel": "pedra", "tesoura": "papel"}
    if player == ram:
        return "empate"
    return "jogador" if beats[player] == ram else "ram"


# ---------- falas e expressões de cada resultado ----------

REACTION_EXPRESSION = {"ram": "feliz", "jogador": "triste", "empate": "surpreso"}
REACTION_HOLD_MS = 3500

LINES_SAID: dict[str, dict[str, list[str]]] = {
    "velha": {
        "ram": ["Venci essa. Quer a revanche?", "Essa foi minha.", "Vitória da RAM."],
        "jogador": ["Você venceu. Parabéns!", "Boa, você jogou bem.", "Perdi essa. Vamos de novo?"],
        "empate": ["Deu velha.", "Empate — estamos no mesmo nível.", "Ninguém venceu dessa vez."],
    },
    "ppt": {
        "ram": ["Venci essa.", "Essa foi minha.", "Boa tentativa."],
        "jogador": ["Você venceu.", "Boa jogada.", "Perdi essa."],
        "empate": ["Empate.", "Pensamos igual.", "Deu empate de novo."],
    },
}

HAND_LABEL = {"pedra": "pedra", "papel": "papel", "tesoura": "tesoura"}

GREETINGS = {
    "velha": "Bora jogar jogo da velha! Você é o X.",
    "ppt": "Pedra, papel ou tesoura? Pode escolher!",
}


def reaction_text(game: str, outcome: Outcome, ram_hand: Hand | None = None) -> str:
    line = random.choice(LINES_SAID[game][outcome])
    return f"Eu joguei {HAND_LABEL[ram_hand]}. {line}" if ram_hand else line
