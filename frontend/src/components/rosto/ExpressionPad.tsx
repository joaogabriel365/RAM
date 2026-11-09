import { useState, type FormEvent } from "react";
import { ApiError, faceApi } from "../../lib/api";
import { realtime, useRealtime } from "../../lib/realtime";
import { cx } from "../../lib/utils";
import { DEFAULT_APPEARANCE, EXPRESSIONS, type Expression } from "../../types/face";
import { Face } from "../face/Face";
import { Button, Card } from "../ui/controls";
import { useToast } from "../ui/Toast";

/** Expressões que voltam sozinhas para a anterior. */
const HOLD_MS: Partial<Record<Expression, number>> = { piscadinha: 1600 };

export function ExpressionPad() {
  const current = useRealtime((s) => s.face?.expression);
  const sleeping = useRealtime((s) => s.face?.sleeping ?? false);
  const appearance = useRealtime((s) => s.face?.appearance) ?? DEFAULT_APPEARANCE;
  const toast = useToast();

  async function trigger(expression: Expression) {
    try {
      realtime.applyFace(await faceApi.setExpression(expression, HOLD_MS[expression]));
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Não foi possível mudar a expressão.", "erro");
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Expressão rápida</h3>
        {sleeping && <span className="text-xs text-ink-soft">dormindo por inatividade · toque para acordar</span>}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {EXPRESSIONS.map((e) => {
          const active = e.id === current;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => trigger(e.id)}
              aria-pressed={active}
              className={cx(
                "flex min-w-0 flex-col items-center gap-1 rounded-lg border p-1 text-[10px] transition-all active:scale-95 sm:text-[11px]",
                active ? "border-neon bg-neon/20 text-ink shadow-neon" : "border-line bg-surface-2/60 text-ink-soft hover:border-neon/60 hover:text-ink",
              )}
            >
              <Face still appearance={appearance} expression={e.id} className="pointer-events-none aspect-square w-full rounded" />
              {e.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

const QUICK_PHRASES = [
  "Oi! Eu sou a RAM, a assistente do Maker Paulista!",
  "Bem-vindo ao Maker! Quer conhecer o laboratório?",
  "Lembre-se: óculos de proteção sempre!",
];

export function SpeakBox() {
  const speaking = useRealtime((s) => !!s.face?.speech);
  const toast = useToast();
  const [text, setText] = useState("");

  async function say(value: string) {
    const clean = value.trim();
    if (!clean) return;
    try {
      realtime.applyFace(await faceApi.say(clean));
      setText("");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Não foi possível falar.", "erro");
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void say(text);
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Balão de fala</h3>
        {speaking && (
          <Button size="sm" variant="subtle" icon="x" onClick={() => faceApi.clearSpeech().then((s) => realtime.applyFace(s))}>
            Limpar
          </Button>
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          placeholder="O que a RAM deve dizer?"
          aria-label="Texto do balão de fala"
          className="h-11 min-w-0 flex-1 rounded-card border border-line bg-surface-2 px-3 text-sm outline-none placeholder:text-ink-soft/70 focus:border-neon"
        />
        <Button type="submit" variant="ghost" icon="chat" disabled={!text.trim()}>
          Falar
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_PHRASES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => say(p)}
            className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft transition-colors hover:border-neon hover:text-ink"
          >
            {p}
          </button>
        ))}
      </div>
    </Card>
  );
}
