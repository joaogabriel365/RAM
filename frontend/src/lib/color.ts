/* Utilidades de cor: conversão HSL, contraste (WCAG) e harmonias. */

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): Hsl {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return { h, s: s * 100, l: l * 100 };
}

export function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`.toUpperCase();
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Razão de contraste WCAG (1 – 21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------- Harmonias ---------- */

export type Harmony = "monocromatica" | "analoga" | "complementar" | "triadica" | "neon";

export const HARMONIES: { value: Harmony; label: string }[] = [
  { value: "monocromatica", label: "Mono" },
  { value: "analoga", label: "Análoga" },
  { value: "complementar", label: "Complementar" },
  { value: "triadica", label: "Triádica" },
  { value: "neon", label: "Neon" },
];

export interface Palette {
  eyes: string;
  eyes2: string;
  pupil: string;
  mouth: string;
  accent: string;
  bg: string;
  bg2: string;
  pattern: string;
}

/** Gera uma paleta completa para o rosto a partir de uma cor base. */
export function makePalette(base: string, harmony: Harmony): Palette {
  const { h, s } = hexToHsl(base);
  const sat = Math.max(70, s);
  const dark = (hue: number) => ({ bg: hsl(hue, 45, 4), bg2: hsl(hue, 55, 14), pattern: hsl(hue, 45, 22) });
  switch (harmony) {
    case "monocromatica":
      return { eyes: hsl(h, sat, 58), eyes2: hsl(h, sat, 76), pupil: hsl(h, 100, 95), mouth: hsl(h, sat, 78), accent: hsl(h, sat, 66), ...dark(h) };
    case "analoga":
      return { eyes: hsl(h, sat, 58), eyes2: hsl(h + 35, sat, 62), pupil: hsl(h, 100, 95), mouth: hsl(h - 35, sat, 70), accent: hsl(h + 35, sat, 60), ...dark(h + 15) };
    case "complementar":
      return { eyes: hsl(h, sat, 58), eyes2: hsl(h + 30, sat, 66), pupil: hsl(h, 60, 10), mouth: hsl(h + 180, sat, 62), accent: hsl(h + 180, sat, 58), ...dark(h) };
    case "triadica":
      return { eyes: hsl(h, sat, 58), eyes2: hsl(h + 120, sat, 62), pupil: hsl(h, 100, 95), mouth: hsl(h + 240, sat, 66), accent: hsl(h + 120, sat, 58), ...dark(h + 240) };
    case "neon":
      return { eyes: hsl(h, 100, 55), eyes2: hsl(h + 60, 100, 60), pupil: hsl(h, 100, 96), mouth: hsl(h + 150, 100, 58), accent: hsl(h + 150, 100, 55), ...dark(h + 200) };
  }
}
