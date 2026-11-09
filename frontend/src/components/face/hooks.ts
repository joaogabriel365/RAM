import { useEffect, useRef, useState } from "react";
import type { Expression, Personality } from "../../types/face";

const rand = (min: number, max: number) => min + Math.random() * (max - min);

interface PersonalityProfile {
  /** intervalo entre mudanças de olhar (ms) */
  gazeEvery: [number, number];
  /** quão longe o olhar vai (0–1) */
  reach: number;
  /** chance de voltar ao centro */
  center: number;
  /** microexpressões espontâneas quando está em repouso */
  micro?: { every: [number, number]; pick: Expression[]; duration: number };
  /** piscadas mais lentas */
  slowBlink?: boolean;
}

export const PERSONALITY: Record<Personality, PersonalityProfile> = {
  serena: { gazeEvery: [3000, 6500], reach: 0.35, center: 0.5 },
  curiosa: {
    gazeEvery: [700, 2200],
    reach: 0.8,
    center: 0.2,
    micro: { every: [9000, 18000], pick: ["curioso", "surpreso", "pensando"], duration: 1800 },
  },
  brincalhona: {
    gazeEvery: [1000, 3000],
    reach: 0.6,
    center: 0.3,
    micro: { every: [8000, 16000], pick: ["piscadinha", "feliz", "apaixonado"], duration: 1500 },
  },
  sonolenta: {
    gazeEvery: [4000, 8000],
    reach: 0.25,
    center: 0.6,
    micro: { every: [14000, 24000], pick: ["dormindo"], duration: 2200 },
    slowBlink: true,
  },
};

/** Piscadas em intervalos aleatórios em torno de `perMinute` (às vezes piscada dupla). */
export function useBlink(perMinute: number, enabled: boolean, slow = false) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!enabled || perMinute <= 0) {
      setClosed(false);
      return;
    }
    let timer: number;
    const avg = 60_000 / perMinute;
    const closedFor = slow ? 280 : 110;
    const blink = (thenDouble: boolean) => {
      setClosed(true);
      timer = window.setTimeout(() => {
        setClosed(false);
        timer = thenDouble
          ? window.setTimeout(() => blink(false), 140)
          : window.setTimeout(() => blink(!slow && Math.random() < 0.15), avg * rand(0.5, 1.5));
      }, closedFor);
    };
    timer = window.setTimeout(() => blink(false), avg * rand(0.3, 1));
    return () => window.clearTimeout(timer);
  }, [perMinute, enabled, slow]);
  return closed;
}

/** Olhar vagando quando o rosto está ocioso, no ritmo da personalidade. */
export function useIdleGaze(enabled: boolean, personality: Personality) {
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!enabled) {
      setGaze({ x: 0, y: 0 });
      return;
    }
    const { gazeEvery, reach, center } = PERSONALITY[personality];
    let timer: number;
    const next = () => {
      setGaze(Math.random() < center ? { x: 0, y: 0 } : { x: rand(-reach, reach), y: rand(-reach, reach) * 0.6 });
      timer = window.setTimeout(next, rand(...gazeEvery));
    };
    timer = window.setTimeout(next, rand(800, 2000));
    return () => window.clearTimeout(timer);
  }, [enabled, personality]);
  return gaze;
}

/** Expressões rápidas e espontâneas (só na tela; não mudam o estado do backend). */
export function useMicroExpression(enabled: boolean, personality: Personality) {
  const [micro, setMicro] = useState<Expression | null>(null);
  useEffect(() => {
    const profile = PERSONALITY[personality].micro;
    setMicro(null);
    if (!enabled || !profile) return;
    let timer: number;
    const loop = () => {
      timer = window.setTimeout(() => {
        setMicro(profile.pick[Math.floor(Math.random() * profile.pick.length)]);
        timer = window.setTimeout(() => {
          setMicro(null);
          loop();
        }, profile.duration);
      }, rand(...profile.every));
    };
    loop();
    return () => window.clearTimeout(timer);
  }, [enabled, personality]);
  return micro;
}

/** Pequenas falhas de "sinal" em momentos aleatórios. */
export function useGlitch(enabled: boolean) {
  const [glitching, setGlitching] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setGlitching(false);
      return;
    }
    let timer: number;
    const loop = () => {
      timer = window.setTimeout(() => {
        setGlitching(true);
        timer = window.setTimeout(() => {
          setGlitching(false);
          loop();
        }, 220);
      }, rand(2500, 7000));
    };
    loop();
    return () => window.clearTimeout(timer);
  }, [enabled]);
  return glitching;
}

/** Texto aparecendo como se estivesse sendo digitado. Reinicia quando `key` muda. */
export function useTypewriter(text: string, key: unknown, instant: boolean, charsPerSecond = 32) {
  const [count, setCount] = useState(instant ? text.length : 0);
  const textRef = useRef(text);
  textRef.current = text;
  useEffect(() => {
    if (instant) {
      setCount(textRef.current.length);
      return;
    }
    setCount(0);
    const interval = window.setInterval(() => {
      setCount((c) => {
        if (c >= textRef.current.length) {
          window.clearInterval(interval);
          return c;
        }
        return c + 1;
      });
    }, 1000 / charsPerSecond);
    return () => window.clearInterval(interval);
  }, [key, instant, charsPerSecond]);
  return { shown: text.slice(0, count), done: count >= text.length };
}
