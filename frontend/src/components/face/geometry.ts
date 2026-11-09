import type { EyeShape, Expression, MouthStyle } from "../../types/face";

/* Sistema de coordenadas do SVG: origem no centro, viewBox -400 -250 800 500. */
export const VIEWBOX = "-400 -250 800 500";
export const EYE_Y = -40;
export const EYE_X = 150;
export const MOUTH_Y = 125;

/** Meia-largura (w) e meia-altura (h) de cada formato de olho, antes da escala. */
export const EYE_DIMS: Record<EyeShape, { w: number; h: number }> = {
  redondo: { w: 70, h: 70 },
  oval: { w: 56, h: 82 },
  retangulo: { w: 72, h: 58 },
  pixel: { w: 70, h: 70 },
  anime: { w: 58, h: 84 },
  linha: { w: 78, h: 18 },
};

export const PIXEL = 20;

/** Células do olho "pixel": grade 7×7 recortada em círculo. */
export const PIXEL_CELLS: { x: number; y: number }[] = (() => {
  const cells: { x: number; y: number }[] = [];
  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      if (Math.hypot(i, j) <= 3.3) cells.push({ x: i * PIXEL - PIXEL / 2, y: j * PIXEL - PIXEL / 2 });
    }
  }
  return cells;
})();

/* ---------- Parâmetros por expressão ---------- */

const OPEN = -1.3; // pálpebra acima do olho = totalmente aberto

export interface EyeParams {
  /** posição da pálpebra no canto de dentro / de fora (em unidades de h; -1.3 = aberto) */
  inner: number;
  outer: number;
  /** 0–1: curva de baixo subindo (olho feliz "^") */
  smile: number;
  scale: number;
  pupil: number;
}

export interface BrowParams {
  /** graus; positivo = ponta de dentro para baixo (bravo) */
  angle: number;
  /** px para cima */
  lift: number;
}

export interface MouthParams {
  /** -1 (triste) a 1 (sorriso) */
  curve: number;
  /** 0–1 */
  open: number;
  width: number;
  offsetX: number;
}

export interface ExpressionParams {
  left: EyeParams;
  right: EyeParams;
  gaze?: { x: number; y: number };
  mouth: MouthParams;
  browLeft: BrowParams;
  browRight: BrowParams;
  blush: number;
  hearts?: boolean;
  zzz?: boolean;
  thinking?: boolean;
  /** pausa as piscadas */
  noBlink?: boolean;
}

const eye = (p: Partial<EyeParams> = {}): EyeParams => ({
  inner: OPEN,
  outer: OPEN,
  smile: 0,
  scale: 1,
  pupil: 1,
  ...p,
});
const mouth = (p: Partial<MouthParams> = {}): MouthParams => ({
  curve: 0.3,
  open: 0,
  width: 1,
  offsetX: 0,
  ...p,
});
const brow = (angle = 0, lift = 0): BrowParams => ({ angle, lift });

export const EXPRESSION_PARAMS: Record<Expression, ExpressionParams> = {
  neutro: {
    left: eye(),
    right: eye(),
    mouth: mouth(),
    browLeft: brow(),
    browRight: brow(),
    blush: 0,
  },
  feliz: {
    left: eye({ smile: 0.8, scale: 1.03 }),
    right: eye({ smile: 0.8, scale: 1.03 }),
    mouth: mouth({ curve: 1, open: 0.45, width: 1.1 }),
    browLeft: brow(-6, 10),
    browRight: brow(-6, 10),
    blush: 0.6,
  },
  curioso: {
    left: eye({ scale: 1.12, pupil: 1.1 }),
    right: eye({ inner: -0.45, outer: -0.7, scale: 0.92 }),
    gaze: { x: 0.35, y: -0.1 },
    mouth: mouth({ curve: 0.15, width: 0.55, offsetX: 25 }),
    browLeft: brow(-10, 20),
    browRight: brow(8, -4),
    blush: 0,
  },
  surpreso: {
    left: eye({ scale: 1.15, pupil: 0.6 }),
    right: eye({ scale: 1.15, pupil: 0.6 }),
    mouth: mouth({ curve: 0, open: 1, width: 0.4 }),
    browLeft: brow(-4, 28),
    browRight: brow(-4, 28),
    blush: 0,
  },
  bravo: {
    left: eye({ inner: -0.25, outer: -0.95, pupil: 0.85 }),
    right: eye({ inner: -0.25, outer: -0.95, pupil: 0.85 }),
    mouth: mouth({ curve: -0.4, width: 0.75 }),
    browLeft: brow(20, -12),
    browRight: brow(20, -12),
    blush: 0,
  },
  triste: {
    left: eye({ inner: -1.05, outer: -0.35, scale: 0.96, pupil: 1.05 }),
    right: eye({ inner: -1.05, outer: -0.35, scale: 0.96, pupil: 1.05 }),
    gaze: { x: 0, y: 0.45 },
    mouth: mouth({ curve: -0.75, width: 0.7 }),
    browLeft: brow(-16, 6),
    browRight: brow(-16, 6),
    blush: 0,
  },
  dormindo: {
    left: eye({ inner: 0.62, outer: 0.62 }),
    right: eye({ inner: 0.62, outer: 0.62 }),
    gaze: { x: 0, y: 0.2 },
    mouth: mouth({ curve: 0.1, width: 0.4 }),
    browLeft: brow(0, -8),
    browRight: brow(0, -8),
    blush: 0,
    zzz: true,
    noBlink: true,
  },
  piscadinha: {
    left: eye({ smile: 0.3, scale: 1.04 }),
    right: eye({ smile: 1 }),
    mouth: mouth({ curve: 0.9, open: 0.2, width: 0.9, offsetX: -12 }),
    browLeft: brow(-6, 14),
    browRight: brow(10, -4),
    blush: 0.5,
    noBlink: true,
  },
  apaixonado: {
    left: eye(),
    right: eye(),
    mouth: mouth({ curve: 1, open: 0.3 }),
    browLeft: brow(-8, 12),
    browRight: brow(-8, 12),
    blush: 1,
    hearts: true,
    noBlink: true,
  },
  pensando: {
    left: eye({ inner: -0.7, outer: -0.95, scale: 0.98, pupil: 0.9 }),
    right: eye({ inner: -0.7, outer: -0.95, scale: 0.98, pupil: 0.9 }),
    gaze: { x: 0.55, y: -0.55 },
    mouth: mouth({ curve: -0.05, width: 0.45, offsetX: 35 }),
    browLeft: brow(0, 4),
    browRight: brow(-10, 18),
    blush: 0,
    thinking: true,
  },
};

/* ---------- Caminhos SVG ---------- */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const r = (n: number) => Math.round(n * 10) / 10;

/**
 * Região visível do olho (clipPath): reta de cima = pálpebra (inclinável),
 * curva de baixo = "bochecha" que sobe no olho feliz.
 * Sempre a mesma estrutura de comandos para o framer-motion interpolar o `d`.
 */
export function lidPath(w: number, h: number, topLeft: number, topRight: number, smile: number) {
  const m = 30;
  const x = w + m;
  const yB = h + m;
  const cy = lerp(yB, -1.7 * h - m, smile);
  return `M ${r(-x)} ${r(topLeft * h)} L ${r(x)} ${r(topRight * h)} L ${r(x)} ${r(yB)} Q 0 ${r(cy)} ${r(-x)} ${r(yB)} Z`;
}

const MOUTH_K = 50;

export function mouthPath(style: MouthStyle, p: MouthParams): string {
  const w = 95 * p.width;
  if (style === "gato") {
    // "ω": dois arquinhos que se encontram no meio
    const cw = w * 0.6;
    const dip = 26 + p.curve * 12 + p.open * 10;
    return `M ${r(-cw)} 0 Q ${r(-cw / 2)} ${r(dip * 2)} 0 0 Q ${r(cw / 2)} ${r(dip * 2)} ${r(cw)} 0`;
  }
  if (style === "onda") {
    const end = -p.curve * 22;
    const mid = p.curve * 8;
    const a = 22 + p.open * 10;
    return `M ${r(-w)} ${r(end)} Q ${r(-w / 2)} ${r(mid - a)} 0 ${r(mid)} Q ${r(w / 2)} ${r(mid + a)} ${r(w)} ${r(end)}`;
  }
  const k = style === "linha" ? 0.35 : 1;
  const openK = style === "linha" ? 0.6 : 1;
  const center = p.curve * MOUTH_K * k;
  const half = p.open * 35 * openK;
  // Controle da quadrática = 2× o ponto desejado no meio da curva.
  const top = 2 * (center - half);
  const bottom = 2 * (center + half);
  return `M ${r(-w)} 0 Q 0 ${r(top)} ${r(w)} 0 Q 0 ${r(bottom)} ${r(-w)} 0 Z`;
}

/** Altura do lábio de cima no meio da boca (onde as presas penduram). */
export function mouthTopMid(style: MouthStyle, p: MouthParams): number {
  if (style === "gato") return 0;
  if (style === "onda") return p.curve * 8;
  if (style === "pixel") return Math.round((p.curve * MOUTH_K) / 18) * 18 - Math.round(p.open * 1.4) * 18 + 8;
  const k = style === "linha" ? 0.35 : 1;
  const openK = style === "linha" ? 0.6 : 1;
  return p.curve * MOUTH_K * k - p.open * 35 * openK;
}

/** Blocos da boca "pixel". */
export function mouthPixels(p: MouthParams): { x: number; y: number }[] {
  const count = 9;
  const step = 18 * Math.max(0.5, p.width);
  const cells: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = (2 * i) / (count - 1) - 1;
    const base = p.curve * MOUTH_K * (1 - t * t);
    const snapped = Math.round(base / 18) * 18;
    const inner = Math.abs(t) < 0.7;
    const half = inner ? Math.round(p.open * 1.4) * 18 : 0;
    cells.push({ x: t * step * 4, y: snapped - half });
    // segunda fileira só quando a boca abre
    cells.push({ x: t * step * 4, y: snapped + half });
  }
  return cells;
}

export const HEART_PATH =
  "M 0 38 C -14 26 -70 -6 -70 -38 C -70 -66 -34 -80 0 -48 C 34 -80 70 -66 70 -38 C 70 -6 14 26 0 38 Z";
