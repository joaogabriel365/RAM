import type {
  BackgroundType,
  EyeShape,
  FaceAppearance,
  GlassesStyle,
  Headwear,
  MouthStyle,
  Personality,
} from "../types/face";
import { DEFAULT_APPEARANCE } from "../types/face";
import { contrast, HARMONIES, hsl, makePalette, type Palette } from "./color";

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
const between = (min: number, max: number, step = 0.05) => Math.round((min + Math.random() * (max - min)) / step) * step;
const chance = (p: number) => Math.random() < p;

/** Aplica uma paleta nas cores do rosto (e dos LEDs). */
export function applyPalette(a: FaceAppearance, p: Palette, includeBackground = true): FaceAppearance {
  return {
    ...a,
    eyes: { ...a.eyes, color: p.eyes, color2: p.eyes2, pupilColor: p.pupil },
    mouth: { ...a.mouth, color: p.mouth },
    extras: { ...a.extras, glassesColor: p.accent, headwearColor: p.accent },
    background: includeBackground ? { ...a.background, color: p.bg, color2: p.bg2, gridColor: p.pattern } : a.background,
    leds: { ...a.leds, color: p.eyes },
  };
}

/** "Surpreenda-me": um rosto aleatório, mas sempre com cores que combinam. */
export function randomAppearance(current: FaceAppearance): FaceAppearance {
  const palette = makePalette(hsl(Math.random() * 360, 90, 55), pick(HARMONIES).value);
  const base: FaceAppearance = {
    ...current,
    eyes: {
      ...current.eyes,
      shape: pick<EyeShape>(["redondo", "oval", "retangulo", "pixel", "anime", "linha"]),
      size: between(0.85, 1.25),
      spacing: between(0.85, 1.2),
      tilt: chance(0.3) ? between(-12, 12, 1) : 0,
      gradient: chance(0.4),
      pupilSize: between(0.7, 1.3),
      outline: chance(0.12),
      highlight: chance(0.4),
      glow: between(0.4, 0.95),
    },
    mouth: {
      ...current.mouth,
      style: pick<MouthStyle>(["sorriso", "sorriso", "linha", "onda", "pixel", "gato"]),
      width: between(0.75, 1.2),
      thickness: between(0.8, 1.4),
      offsetY: 0,
    },
    extras: {
      ...current.extras,
      brows: chance(0.35),
      blush: chance(0.35),
      glasses: chance(0.25) ? pick<GlassesStyle>(["redondo", "quadrado", "visor", "coracao"]) : "nenhum",
      headwear: chance(0.3) ? pick<Headwear>(["orelhas_gato", "chifres", "gorro_natal", "coroa", "antena", "laco"]) : "nenhum",
      fangs: chance(0.1),
    },
    layout: { scale: 1, offsetY: 0 },
    background: {
      ...current.background,
      type: pick<BackgroundType>(["solido", "gradiente", "grade", "pontos", "estrelas", "aurora"]),
      scanlines: between(0, 0.5),
      vignette: between(0.3, 0.7),
    },
    animation: {
      ...current.animation,
      personality: pick<Personality>(["serena", "curiosa", "brincalhona", "sonolenta"]),
      glitch: chance(0.15),
    },
  };
  return applyPalette(base, palette);
}

/** Avisos de legibilidade mostrados sobre a prévia. */
export function faceWarnings(a: FaceAppearance): string[] {
  const warnings: string[] = [];
  const bg = a.background.type === "gradiente" ? a.background.color2 : a.background.color;
  if (contrast(a.eyes.color, bg) < 2) warnings.push("Olhos com pouco contraste com o fundo");
  if (a.eyes.shape !== "linha" && !a.eyes.outline && contrast(a.eyes.color, a.eyes.pupilColor) < 1.4)
    warnings.push("Pupila quase invisível");
  if (a.mouth.style !== "nenhuma" && contrast(a.mouth.color, bg) < 2) warnings.push("Boca com pouco contraste");
  return warnings;
}

/* ---------- Importar / exportar ---------- */

const FILE_KIND = "ram-rosto";

export function exportAppearance(a: FaceAppearance, name = "rosto") {
  const payload = { kind: FILE_KIND, version: 2, name, appearance: a };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ram-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function mergeDefaults<T>(defaults: T, value: unknown): T {
  if (typeof defaults !== "object" || defaults === null) {
    return typeof value === typeof defaults ? (value as T) : defaults;
  }
  const source = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(defaults)) {
    out[key] = mergeDefaults((defaults as Record<string, unknown>)[key], source[key]);
  }
  return out as T;
}

/** Lê um arquivo exportado (ou só a aparência) e completa campos que faltarem. */
export async function importAppearance(file: File): Promise<FaceAppearance> {
  const data = JSON.parse(await file.text());
  const appearance = data?.kind === FILE_KIND ? data.appearance : data;
  if (typeof appearance !== "object" || !appearance?.eyes) throw new Error("Arquivo não é um rosto da RAM.");
  return mergeDefaults(DEFAULT_APPEARANCE, appearance);
}
