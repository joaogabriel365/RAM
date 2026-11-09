import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Face } from "../components/face/Face";
import { Badge, Button, Card, Segmented } from "../components/ui/controls";
import { Icon, type IconName } from "../components/ui/Icon";
import { useToast } from "../components/ui/Toast";
import { ApiError, gamesApi } from "../lib/api";
import { useRealtime } from "../lib/realtime";
import { storage } from "../lib/storage";
import { cx } from "../lib/utils";
import type { Cell, GameId, Hand, Outcome, PptResult, VelhaLevel, VelhaResult } from "../types/games";

const GAMES: { id: GameId; label: string; icon: IconName; hint: string }[] = [
  { id: "velha", label: "Jogo da velha", icon: "grid", hint: "Você é o X. Consegue vencer a RAM?" },
  { id: "ppt", label: "Pedra, papel e tesoura", icon: "gamepad", hint: "Uma rodada rápida contra a RAM." },
];

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/** Aba Mini-jogos: jogados pelo celular, com o rosto da RAM reagindo ao vivo. */
export function GamesPage() {
  const [params, setParams] = useSearchParams();
  const game: GameId = params.get("jogo") === "ppt" ? "ppt" : "velha";
  const score = useScore(game);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Mini-jogos</h1>
        <p className="mt-1 text-sm text-ink-soft">Jogue contra a RAM pelo celular. O rosto dela reage quando ganha ou perde.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-6">
        <div className="space-y-4 lg:sticky lg:top-[77px] lg:self-start">
          <LiveFace />
          <Scoreboard score={score.value} onReset={score.reset} />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Escolha o jogo">
            {GAMES.map((g) => (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={game === g.id}
                onClick={() => setParams(g.id === "velha" ? {} : { jogo: g.id }, { replace: true })}
                className={cx(
                  "flex items-center gap-3 rounded-card border p-3 text-left transition-all",
                  game === g.id ? "border-neon bg-neon/15 shadow-neon" : "border-line bg-surface/80 hover:border-neon/60",
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-neon/40 bg-neon/10 text-neon-soft">
                  <Icon name={g.icon} size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{g.label}</span>
                  <span className="hidden text-xs text-ink-soft sm:block">{g.hint}</span>
                </span>
              </button>
            ))}
          </div>
          {game === "velha" ? <Velha onEnd={score.add} /> : <Ppt onEnd={score.add} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- rosto ao vivo e placar ---------- */

function LiveFace() {
  const face = useRealtime((s) => s.face);
  return (
    <div className="relative h-[24dvh] w-full lg:h-auto lg:aspect-[16/10]" style={{ containerType: "size" }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative aspect-[16/10] overflow-hidden rounded-card border border-neon/40 bg-bg shadow-neon"
          style={{ width: "min(100cqw, calc(100cqh * 1.6))" }}
        >
          {face ? (
            <Face appearance={face.appearance} expression={face.expression} speech={face.speech} className="h-full w-full" />
          ) : (
            <p className="p-4 text-sm text-ink-soft">Conectando à RAM…</p>
          )}
          <div className="pointer-events-none absolute top-2 left-2">
            <Badge tone="ok">
              <span className="size-1.5 animate-pulse rounded-full bg-ok" /> RAM ao vivo
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

type Score = Record<Outcome, number>;
const ZERO: Score = { jogador: 0, empate: 0, ram: 0 };

/** Placar por jogo, guardado neste aparelho. */
function useScore(game: GameId) {
  const key = `ram.jogos.placar.${game}`;
  const read = (): Score => {
    try {
      return { ...ZERO, ...JSON.parse(storage.get(key) || "{}") };
    } catch {
      return ZERO;
    }
  };
  const [scores, setScores] = useState<Partial<Record<GameId, Score>>>({});
  const value = scores[game] ?? read();
  const save = (next: Score) => {
    storage.set(key, JSON.stringify(next));
    setScores((s) => ({ ...s, [game]: next }));
  };
  return {
    value,
    add: (o: Outcome) => save({ ...value, [o]: value[o] + 1 }),
    reset: () => save(ZERO),
  };
}

function Scoreboard({ score, onReset }: { score: Score; onReset: () => void }) {
  const cells: { label: string; value: number; tone: string }[] = [
    { label: "Você", value: score.jogador, tone: "text-accent" },
    { label: "Empates", value: score.empate, tone: "text-ink-soft" },
    { label: "RAM", value: score.ram, tone: "text-neon-soft" },
  ];
  return (
    <Card className="flex items-center gap-2 p-3">
      <div className="grid flex-1 grid-cols-3 text-center">
        {cells.map((c) => (
          <div key={c.label}>
            <div className={cx("font-mono text-2xl font-bold", c.tone)}>{c.value}</div>
            <div className="text-xs text-ink-soft">{c.label}</div>
          </div>
        ))}
      </div>
      <Button size="sm" variant="subtle" icon="reset" onClick={onReset} title="Zerar o placar deste jogo" aria-label="Zerar placar" />
    </Card>
  );
}

/* ---------- jogo da velha ---------- */

const EMPTY: Cell[] = Array(9).fill("");
const LEVELS: { value: VelhaLevel; label: string }[] = [
  { value: "facil", label: "Fácil" },
  { value: "normal", label: "Normal" },
  { value: "dificil", label: "Difícil" },
];
const LEVEL_KEY = "ram.jogos.velha.nivel";

function Velha({ onEnd }: { onEnd: (o: Outcome) => void }) {
  const toast = useToast();
  const [board, setBoard] = useState<Cell[]>(EMPTY);
  const [level, setLevelState] = useState<VelhaLevel>(() => (storage.get(LEVEL_KEY) as VelhaLevel) || "normal");
  const [ramStarted, setRamStarted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [end, setEnd] = useState<Pick<VelhaResult, "winner" | "line"> | null>(null);
  // Respostas de uma partida antiga (clicou "Nova partida" no meio) são ignoradas.
  const round = useRef(0);

  const setLevel = (v: VelhaLevel) => {
    setLevelState(v);
    storage.set(LEVEL_KEY, v);
  };

  /** Manda o tabuleiro e aplica a jogada da RAM; se falhar, volta para `before`. */
  async function ramTurn(next: Cell[], before: Cell[]) {
    const id = round.current;
    setThinking(true);
    try {
      const [r] = await Promise.all([gamesApi.velha(next, level), wait(550)]);
      if (id !== round.current) return;
      setBoard(r.board);
      if (r.winner) {
        setEnd({ winner: r.winner, line: r.line });
        onEnd(r.winner === "empate" ? "empate" : r.winner === "X" ? "jogador" : "ram");
      }
    } catch (err) {
      if (id !== round.current) return;
      toast(err instanceof ApiError ? err.message : "Não foi possível falar com a RAM.", "erro");
      setBoard(before);
    } finally {
      if (id === round.current) setThinking(false);
    }
  }

  function play(i: number) {
    if (board[i] || thinking || end) return;
    const next = board.map((c, j) => (j === i ? "X" : c));
    setBoard(next);
    void ramTurn(next, board);
  }

  function newGame() {
    round.current += 1;
    const ramFirst = !ramStarted; // alterna quem começa
    setRamStarted(ramFirst);
    setBoard(EMPTY);
    setEnd(null);
    setThinking(false);
    void gamesApi.start("velha").catch(() => undefined);
    if (ramFirst) void ramTurn(EMPTY, EMPTY);
  }

  const status = end
    ? end.winner === "X"
      ? "Você venceu."
      : end.winner === "O"
        ? "A RAM venceu."
        : "Deu velha (empate)."
    : thinking
      ? "A RAM está pensando…"
      : "Sua vez — você é o X";

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className={cx("text-lg font-semibold", end?.winner === "X" && "text-accent", end?.winner === "O" && "text-neon-soft")} role="status">
          {status}
        </p>
        <Button size="sm" variant={end ? "primary" : "ghost"} icon="reset" onClick={newGame}>
          Nova partida
        </Button>
      </div>

      <div className="mx-auto grid aspect-square w-full max-w-sm grid-cols-3 gap-2">
        {board.map((cell, i) => {
          const winning = end?.line?.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => play(i)}
              disabled={!!cell || thinking || !!end}
              aria-label={cell ? `Casa ${i + 1}: ${cell === "X" ? "você" : "RAM"}` : `Jogar na casa ${i + 1}`}
              className={cx(
                "flex items-center justify-center rounded-card border text-5xl font-bold transition-all sm:text-6xl",
                winning ? "border-neon bg-neon/20 shadow-neon" : "border-line bg-surface-2/70",
                !cell && !thinking && !end && "hover:border-neon/60 hover:bg-surface-2 active:scale-95",
              )}
            >
              <AnimatePresence>
                {cell && (
                  <motion.span
                    key={cell}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cell === "X" ? "text-accent drop-shadow-[0_0_10px_var(--color-accent)]" : "text-neon-soft drop-shadow-[0_0_10px_var(--color-neon)]"}
                  >
                    {cell}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      <Segmented label="Dificuldade" value={level} onChange={setLevel} options={LEVELS} />
      <p className="text-xs text-ink-soft">Quem começa alterna a cada nova partida.</p>
    </Card>
  );
}

/* ---------- pedra, papel e tesoura ---------- */

const HANDS: { id: Hand; label: string }[] = [
  { id: "pedra", label: "Pedra" },
  { id: "papel", label: "Papel" },
  { id: "tesoura", label: "Tesoura" },
];
const labelOf = (h: Hand) => HANDS.find((x) => x.id === h)!.label;
const COUNTDOWN = ["Pedra…", "papel…", "tesoura!"];

/** Ícone de linha para cada jogada (sem emoji). */
function HandGlyph({ hand, className }: { hand: Hand | null; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {hand === null && <path d="M12 8.5a2 2 0 1 1 1.8 3c-.8.5-1.3 1-1.3 2 M12 16.5h.01" />}
      {hand === "pedra" && <path d="M4 13c0-4 3.6-7 8-7s8 2.5 8 6-3.2 6-8 6-8-1-8-5z" />}
      {hand === "papel" && (
        <>
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v4h4" />
        </>
      )}
      {hand === "tesoura" && (
        <>
          <circle cx="6" cy="17" r="2.4" />
          <circle cx="6" cy="7" r="2.4" />
          <path d="M8 8.6 20 18 M8 15.4 20 6 M12 12l2 1.6" />
        </>
      )}
    </svg>
  );
}

function Ppt({ onEnd }: { onEnd: (o: Outcome) => void }) {
  const toast = useToast();
  const [mine, setMine] = useState<Hand | null>(null);
  const [count, setCount] = useState<string | null>(null);
  const [result, setResult] = useState<PptResult | null>(null);
  const busy = count !== null;

  async function choose(hand: Hand) {
    if (busy) return;
    setMine(hand);
    setResult(null);
    for (const word of COUNTDOWN) {
      setCount(word);
      await wait(400);
    }
    try {
      const r = await gamesApi.ppt(hand);
      setResult(r);
      onEnd(r.outcome);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Não foi possível falar com a RAM.", "erro");
      setMine(null);
    } finally {
      setCount(null);
    }
  }

  const headline = result
    ? { jogador: "Você venceu.", ram: "A RAM venceu.", empate: "Empate." }[result.outcome]
    : count ?? "Escolha sua jogada";

  return (
    <Card className="space-y-5 p-4">
      <p
        className={cx(
          "text-center text-lg font-semibold",
          result?.outcome === "jogador" && "text-accent",
          result?.outcome === "ram" && "text-neon-soft",
        )}
        role="status"
      >
        {headline}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Duel label="Você" hand={mine} tone="accent" winner={result?.outcome === "jogador"} />
        <Duel label="RAM" hand={result ? result.ram : null} tone="neon" winner={result?.outcome === "ram"} shaking={busy} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {HANDS.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => choose(h.id)}
            disabled={busy}
            className="flex flex-col items-center gap-1.5 rounded-card border border-line bg-surface-2/70 py-3 text-sm transition-all hover:border-neon/60 hover:text-ink active:scale-95 disabled:opacity-50"
          >
            <HandGlyph hand={h.id} className="h-8 w-8" />
            {h.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

function Duel({ label, hand, tone, winner, shaking = false }: { label: string; hand: Hand | null; tone: "accent" | "neon"; winner: boolean; shaking?: boolean }) {
  return (
    <div
      className={cx(
        "flex flex-col items-center gap-2.5 rounded-card border py-5 transition-all",
        winner ? (tone === "accent" ? "border-accent bg-accent/10" : "border-neon bg-neon/15 shadow-neon") : "border-line bg-surface-2/40",
      )}
    >
      <motion.div
        className={cx(tone === "accent" ? "text-accent" : "text-neon-soft")}
        animate={shaking ? { y: [0, -10, 0] } : { y: 0 }}
        transition={shaking ? { duration: 0.4, repeat: Infinity } : { duration: 0.2 }}
      >
        <HandGlyph hand={hand} className="h-12 w-12" />
      </motion.div>
      <span className="text-xs text-ink-soft">{label}</span>
      <span className={cx("text-sm font-medium", tone === "accent" ? "text-accent" : "text-neon-soft")}>{hand ? labelOf(hand) : "—"}</span>
    </div>
  );
}
