// Espelho de backend/ram/face.py — mantenha os dois em sincronia.

export type EyeShape = "redondo" | "oval" | "retangulo" | "pixel" | "anime" | "linha";
export type MouthStyle = "sorriso" | "linha" | "onda" | "pixel" | "gato" | "nenhuma";
export type BackgroundType = "solido" | "gradiente" | "grade" | "pontos" | "estrelas" | "aurora";
export type GlassesStyle = "nenhum" | "redondo" | "quadrado" | "visor" | "coracao";
export type Headwear = "nenhum" | "orelhas_gato" | "chifres" | "gorro_natal" | "coroa" | "antena" | "laco";
export type Personality = "serena" | "curiosa" | "brincalhona" | "sonolenta";
export type LedEffect = "fixo" | "respirando" | "arco_iris" | "piscando";
export type Expression =
  | "neutro"
  | "feliz"
  | "curioso"
  | "surpreso"
  | "bravo"
  | "triste"
  | "dormindo"
  | "piscadinha"
  | "apaixonado"
  | "pensando";

/** Cor no formato #RRGGBB. */
export type HexColor = string;

export interface FaceEyes {
  shape: EyeShape;
  /** 0.5 – 1.6 */
  size: number;
  /** 0.6 – 1.4 */
  spacing: number;
  /** graus, -25 – 25; positivo = cantos de fora para cima */
  tilt: number;
  color: HexColor;
  gradient: boolean;
  /** segunda cor do degradê (embaixo) */
  color2: HexColor;
  pupilColor: HexColor;
  /** 0.4 – 1.6 */
  pupilSize: number;
  /** só o contorno, sem preenchimento */
  outline: boolean;
  /** reflexo de luz no olho */
  highlight: boolean;
  /** 0 – 1 */
  glow: number;
}

export interface FaceMouth {
  style: MouthStyle;
  color: HexColor;
  /** 0.5 – 1.6 */
  width: number;
  /** 0.5 – 2 */
  thickness: number;
  /** px no SVG, -60 – 60 (positivo = para baixo) */
  offsetY: number;
}

export interface FaceExtras {
  brows: boolean;
  blush: boolean;
  blushColor: HexColor;
  glasses: GlassesStyle;
  glassesColor: HexColor;
  headwear: Headwear;
  headwearColor: HexColor;
  fangs: boolean;
}

export interface FaceLayout {
  /** 0.7 – 1.3 */
  scale: number;
  /** -60 – 60 */
  offsetY: number;
}

export interface FaceBackground {
  type: BackgroundType;
  color: HexColor;
  color2: HexColor;
  /** cor do padrão (grade, pontos, aurora) */
  gridColor: HexColor;
  /** 0 – 1 */
  scanlines: number;
  /** 0 – 1 */
  vignette: number;
}

export interface FaceAnimation {
  /** piscadas por minuto, 0 – 40 */
  blinkRate: number;
  /** multiplicador, 0.25 – 3 */
  transitionSpeed: number;
  glitch: boolean;
  breathing: boolean;
  personality: Personality;
  /** olhos seguem o toque / o mouse */
  followTouch: boolean;
}

export interface FaceBehavior {
  /** expressão de repouso */
  mood: Expression;
  reactTouch: boolean;
  reactObstacle: boolean;
  reactBattery: boolean;
}

export interface FaceLeds {
  color: HexColor;
  effect: LedEffect;
  /** 0 – 1 */
  brightness: number;
  /** 0.25 – 3 */
  speed: number;
  /** usa a cor dos olhos */
  syncEyes: boolean;
}

/** Tudo que é salvo num preset. */
export interface FaceAppearance {
  eyes: FaceEyes;
  mouth: FaceMouth;
  extras: FaceExtras;
  layout: FaceLayout;
  background: FaceBackground;
  animation: FaceAnimation;
  behavior: FaceBehavior;
  leds: FaceLeds;
}

export interface Speech {
  id: number;
  text: string;
  ts: number;
}

/** Estado completo do rosto — a fonte da verdade fica no backend. */
export interface FaceState {
  appearance: FaceAppearance;
  expression: Expression;
  speech: Speech | null;
  /** true quando dormiu por inatividade */
  sleeping: boolean;
  /** incrementa a cada mudança no backend */
  rev: number;
}

export interface Preset {
  id: number;
  name: string;
  appearance: FaceAppearance;
  factory: boolean;
  category: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export const USER_CATEGORY = "Meus presets";
export const PRESET_CATEGORIES = ["Clássicos", "Temas", "Eventos", "Festas", USER_CATEGORY];

export const EXPRESSIONS: { id: Expression; label: string }[] = [
  { id: "neutro", label: "Neutro" },
  { id: "feliz", label: "Feliz" },
  { id: "curioso", label: "Curioso" },
  { id: "surpreso", label: "Surpreso" },
  { id: "bravo", label: "Bravo" },
  { id: "triste", label: "Triste" },
  { id: "dormindo", label: "Dormindo" },
  { id: "piscadinha", label: "Piscadinha" },
  { id: "apaixonado", label: "Apaixonado" },
  { id: "pensando", label: "Pensando" },
];

/** Padrão RAM — igual ao padrão do backend. */
export const DEFAULT_APPEARANCE: FaceAppearance = {
  eyes: {
    shape: "redondo",
    size: 1,
    spacing: 1,
    tilt: 0,
    color: "#B026FF",
    gradient: false,
    color2: "#22D3EE",
    pupilColor: "#F5E9FF",
    pupilSize: 1,
    outline: false,
    highlight: false,
    glow: 0.6,
  },
  mouth: { style: "sorriso", color: "#D58CFF", width: 1, thickness: 1, offsetY: 0 },
  extras: {
    brows: false,
    blush: false,
    blushColor: "#FF5FA2",
    glasses: "nenhum",
    glassesColor: "#E9DDFF",
    headwear: "nenhum",
    headwearColor: "#B026FF",
    fangs: false,
  },
  layout: { scale: 1, offsetY: 0 },
  background: { type: "grade", color: "#07060B", color2: "#1A0F2E", gridColor: "#2A2140", scanlines: 0.25, vignette: 0.5 },
  animation: { blinkRate: 14, transitionSpeed: 1, glitch: false, breathing: true, personality: "serena", followTouch: true },
  behavior: { mood: "neutro", reactTouch: true, reactObstacle: true, reactBattery: true },
  leds: { color: "#B026FF", effect: "respirando", brightness: 0.8, speed: 1, syncEyes: false },
};
