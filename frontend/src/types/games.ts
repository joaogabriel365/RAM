/** Mini-jogos (espelha backend/ram/games.py). O jogador é sempre X; a RAM, O. */

export type GameId = "velha" | "ppt";
export type Cell = "" | "X" | "O";
export type VelhaLevel = "facil" | "normal" | "dificil";
export type Hand = "pedra" | "papel" | "tesoura";
/** Quem ganhou, do ponto de vista do painel. */
export type Outcome = "ram" | "jogador" | "empate";

export interface VelhaResult {
  board: Cell[];
  ramMove: number | null;
  winner: "X" | "O" | "empate" | null;
  line: number[] | null;
}

export interface PptResult {
  ram: Hand;
  outcome: Outcome;
}
