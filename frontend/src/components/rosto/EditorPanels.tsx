import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  EXPRESSIONS,
  type BackgroundType,
  type EyeShape,
  type FaceLeds,
  type GlassesStyle,
  type Headwear,
  type LedEffect,
  type MouthStyle,
  type Personality,
} from "../../types/face";
import { ColorField, Group, Segmented, Slider, Toggle } from "../ui/controls";
import { EyeShapeIcon, MouthStyleIcon } from "./ShapeIcons";
import type { FaceDraft } from "./useFaceDraft";

const pct = (v: number) => `${Math.round(v * 100)}%`;
const deg = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v)}°`;
const px = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v)}`;

/* ---------- Olhos ---------- */

const EYE_SHAPES: { value: EyeShape; label: string }[] = [
  { value: "redondo", label: "Redondo" },
  { value: "oval", label: "Oval" },
  { value: "retangulo", label: "Retângulo" },
  { value: "pixel", label: "Pixel" },
  { value: "anime", label: "Anime" },
  { value: "linha", label: "Linha" },
];

export function EyesPanel({ d }: { d: FaceDraft }) {
  const eyes = d.draft!.eyes;
  const set = <K extends keyof typeof eyes>(k: K, v: (typeof eyes)[K]) => d.set("eyes", k, v);
  return (
    <>
      <Group title="Formato">
        <Segmented
          label="Formato dos olhos"
          value={eyes.shape}
          onChange={(v) => set("shape", v)}
          options={EYE_SHAPES.map((o) => ({ ...o, icon: <EyeShapeIcon shape={o.value} /> }))}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Slider label="Tamanho" value={eyes.size} min={0.5} max={1.6} format={pct} onChange={(v) => set("size", v)} />
          <Slider label="Espaçamento" value={eyes.spacing} min={0.6} max={1.4} format={pct} onChange={(v) => set("spacing", v)} />
          <Slider label="Inclinação" value={eyes.tilt} min={-25} max={25} step={1} format={deg} onChange={(v) => set("tilt", v)} />
          <Slider label="Tamanho da pupila" value={eyes.pupilSize} min={0.4} max={1.6} format={pct} onChange={(v) => set("pupilSize", v)} />
        </div>
      </Group>
      <Group title="Cores">
        <ColorField label="Cor dos olhos" value={eyes.color} onChange={(v) => set("color", v)} />
        <Toggle label="Degradê" description="Mistura duas cores de cima para baixo" checked={eyes.gradient} onChange={(v) => set("gradient", v)} />
        {eyes.gradient && <ColorField label="Segunda cor" value={eyes.color2} onChange={(v) => set("color2", v)} />}
        <ColorField label="Cor da pupila" value={eyes.pupilColor} onChange={(v) => set("pupilColor", v)} />
      </Group>
      <Group title="Acabamento">
        <Slider label="Intensidade do brilho" value={eyes.glow} min={0} max={1} format={pct} onChange={(v) => set("glow", v)} />
        <Toggle label="Só contorno" description="Olhos vazados, estilo neon de letreiro" checked={eyes.outline} onChange={(v) => set("outline", v)} />
        <Toggle label="Reflexo de luz" description="Um brilho no canto que dá vida ao olhar" checked={eyes.highlight} onChange={(v) => set("highlight", v)} />
      </Group>
    </>
  );
}

/* ---------- Boca ---------- */

const MOUTH_STYLES: { value: MouthStyle; label: string }[] = [
  { value: "sorriso", label: "Sorriso" },
  { value: "linha", label: "Linha" },
  { value: "onda", label: "Onda" },
  { value: "pixel", label: "Pixel" },
  { value: "gato", label: "Gato" },
  { value: "nenhuma", label: "Nenhuma" },
];

export function MouthPanel({ d }: { d: FaceDraft }) {
  const mouth = d.draft!.mouth;
  const set = <K extends keyof typeof mouth>(k: K, v: (typeof mouth)[K]) => d.set("mouth", k, v);
  return (
    <>
      <Group title="Estilo">
        <Segmented
          label="Estilo da boca"
          value={mouth.style}
          onChange={(v) => set("style", v)}
          options={MOUTH_STYLES.map((o) => ({ ...o, icon: <MouthStyleIcon style={o.value} /> }))}
        />
        <ColorField label="Cor da boca" value={mouth.color} onChange={(v) => set("color", v)} />
      </Group>
      <Group title="Proporções">
        <div className="grid gap-5 sm:grid-cols-2">
          <Slider label="Largura" value={mouth.width} min={0.5} max={1.6} format={pct} onChange={(v) => set("width", v)} />
          <Slider label="Espessura" value={mouth.thickness} min={0.5} max={2} format={pct} onChange={(v) => set("thickness", v)} />
        </div>
        <Slider label="Posição vertical" value={mouth.offsetY} min={-60} max={60} step={1} format={px} onChange={(v) => set("offsetY", v)} />
      </Group>
      <Group title="Detalhes">
        <Toggle label="Presas" description="Dois dentinhos de vampiro" checked={d.draft!.extras.fangs} onChange={(v) => d.set("extras", "fangs", v)} />
      </Group>
    </>
  );
}

/* ---------- Acessórios ---------- */

const GLASSES: { value: GlassesStyle; label: string; icon: string }[] = [
  { value: "nenhum", label: "Nenhum", icon: "—" },
  { value: "redondo", label: "Redondos", icon: "◯◯" },
  { value: "quadrado", label: "Quadrados", icon: "▢▢" },
  { value: "visor", label: "Visor", icon: "▭" },
  { value: "coracao", label: "Coração", icon: "♡♡" },
];

const HEADWEAR: { value: Headwear; label: string }[] = [
  { value: "nenhum", label: "Nenhum" },
  { value: "orelhas_gato", label: "Orelhas" },
  { value: "chifres", label: "Chifres" },
  { value: "gorro_natal", label: "Gorro" },
  { value: "coroa", label: "Coroa" },
  { value: "antena", label: "Antena" },
  { value: "laco", label: "Laço" },
];

const symbol = (s: string): ReactNode => <span className="text-base leading-none">{s}</span>;

export function AccessoriesPanel({ d }: { d: FaceDraft }) {
  const extras = d.draft!.extras;
  const set = <K extends keyof typeof extras>(k: K, v: (typeof extras)[K]) => d.set("extras", k, v);
  return (
    <>
      <Group title="Rosto">
        <Toggle label="Sobrancelhas" description="Reforçam as expressões (bravo, triste, curioso)" checked={extras.brows} onChange={(v) => set("brows", v)} />
        <Toggle label="Bochechas coradas" checked={extras.blush} onChange={(v) => set("blush", v)} />
        {extras.blush && <ColorField label="Cor das bochechas" value={extras.blushColor} onChange={(v) => set("blushColor", v)} />}
      </Group>
      <Group title="Óculos">
        <Segmented
          label="Estilo dos óculos"
          value={extras.glasses}
          onChange={(v) => set("glasses", v)}
          columns={5}
          options={GLASSES.map((g) => ({ value: g.value, label: g.label, icon: symbol(g.icon) }))}
        />
        {extras.glasses !== "nenhum" && (
          <ColorField label="Cor da armação" value={extras.glassesColor} onChange={(v) => set("glassesColor", v)} />
        )}
      </Group>
      <Group title="Na cabeça">
        <Segmented
          label="Acessório na cabeça"
          value={extras.headwear}
          onChange={(v) => set("headwear", v)}
          columns={4}
          options={HEADWEAR.map((h) => ({ value: h.value, label: h.label }))}
        />
        {extras.headwear !== "nenhum" && (
          <ColorField label="Cor do acessório" value={extras.headwearColor} onChange={(v) => set("headwearColor", v)} />
        )}
      </Group>
    </>
  );
}

/* ---------- Fundo e tela ---------- */

const BACKGROUNDS: { value: BackgroundType; label: string }[] = [
  { value: "solido", label: "Sólido" },
  { value: "gradiente", label: "Gradiente" },
  { value: "grade", label: "Grade" },
  { value: "pontos", label: "Pontos" },
  { value: "estrelas", label: "Estrelas" },
  { value: "aurora", label: "Aurora" },
];

const BG_PREVIEW: Record<BackgroundType, string> = {
  solido: "#2A2140",
  gradiente: "radial-gradient(circle, #6B2FA8, #12101A)",
  grade: "linear-gradient(#6B2FA8 1px, transparent 1px) 0 0/6px 6px, linear-gradient(90deg, #6B2FA8 1px, #12101A 1px) 0 0/6px 6px",
  pontos: "radial-gradient(circle, #9A6BD8 1px, #12101A 1.5px) 0 0/5px 5px",
  estrelas: "radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 60%, #fff, transparent), radial-gradient(1px 1px at 40% 80%, #fff, transparent), #0A0820",
  aurora: "radial-gradient(circle at 30% 30%, #0EA5A0, transparent 60%), radial-gradient(circle at 70% 60%, #7C3AED, transparent 60%), #05040C",
};

export function BackgroundPanel({ d }: { d: FaceDraft }) {
  const { background: bg, layout } = d.draft!;
  const set = <K extends keyof typeof bg>(k: K, v: (typeof bg)[K]) => d.set("background", k, v);
  const usesColor2 = bg.type === "gradiente" || bg.type === "estrelas" || bg.type === "aurora";
  const usesPattern = bg.type === "grade" || bg.type === "pontos" || bg.type === "aurora";
  return (
    <>
      <Group title="Fundo">
        <Segmented
          label="Tipo de fundo"
          value={bg.type}
          onChange={(v) => set("type", v)}
          options={BACKGROUNDS.map((b) => ({
            ...b,
            icon: <span className="block h-4 w-8 rounded-sm border border-line" style={{ background: BG_PREVIEW[b.value] }} />,
          }))}
        />
        <ColorField label="Cor de fundo" value={bg.color} onChange={(v) => set("color", v)} />
        {usesColor2 && (
          <ColorField label={bg.type === "aurora" ? "Cor da aurora 1" : "Cor do centro"} value={bg.color2} onChange={(v) => set("color2", v)} />
        )}
        {usesPattern && (
          <ColorField
            label={bg.type === "aurora" ? "Cor da aurora 2" : bg.type === "pontos" ? "Cor dos pontos" : "Cor da grade"}
            value={bg.gridColor}
            onChange={(v) => set("gridColor", v)}
          />
        )}
      </Group>
      <Group title="Efeitos de tela (CRT)">
        <div className="grid gap-5 sm:grid-cols-2">
          <Slider label="Linhas de varredura" value={bg.scanlines} min={0} max={1} format={pct} onChange={(v) => set("scanlines", v)} />
          <Slider label="Vinheta" value={bg.vignette} min={0} max={1} format={pct} onChange={(v) => set("vignette", v)} />
        </div>
      </Group>
      <Group title="Enquadramento">
        <div className="grid gap-5 sm:grid-cols-2">
          <Slider label="Tamanho do rosto" value={layout.scale} min={0.7} max={1.3} format={pct} onChange={(v) => d.set("layout", "scale", v)} />
          <Slider label="Posição vertical" value={layout.offsetY} min={-60} max={60} step={1} format={px} onChange={(v) => d.set("layout", "offsetY", v)} />
        </div>
        <p className="text-xs text-ink-soft">Use para encaixar o rosto na moldura da cabeça do robô.</p>
      </Group>
    </>
  );
}

/* ---------- Movimento e comportamento ---------- */

const PERSONALITIES: { value: Personality; label: string; hint: string }[] = [
  { value: "serena", label: "Serena", hint: "Olhar calmo e lento. Ideal para recepção." },
  { value: "curiosa", label: "Curiosa", hint: "Olha para todo lado e às vezes fica curiosa ou pensativa." },
  { value: "brincalhona", label: "Brincalhona", hint: "Pisca, sorri e se anima com facilidade. Boa para eventos." },
  { value: "sonolenta", label: "Sonolenta", hint: "Pálpebras pesadas, piscadas lentas e cochilos rápidos." },
];

const MOODS = EXPRESSIONS.filter((e) => !["dormindo", "piscadinha"].includes(e.id));

export function MotionPanel({ d }: { d: FaceDraft }) {
  const { animation: anim, behavior } = d.draft!;
  const setA = <K extends keyof typeof anim>(k: K, v: (typeof anim)[K]) => d.set("animation", k, v);
  const setB = <K extends keyof typeof behavior>(k: K, v: (typeof behavior)[K]) => d.set("behavior", k, v);
  return (
    <>
      <Group title="Personalidade">
        <Segmented
          label="Personalidade"
          value={anim.personality}
          onChange={(v) => setA("personality", v)}
          columns={4}
          options={PERSONALITIES.map((p) => ({ value: p.value, label: p.label }))}
        />
        <p className="text-xs text-ink-soft">{PERSONALITIES.find((p) => p.value === anim.personality)?.hint}</p>
        <Segmented
          label="Humor base (expressão de repouso)"
          value={behavior.mood}
          onChange={(v) => setB("mood", v)}
          columns={4}
          options={MOODS.map((m) => ({ value: m.id, label: m.label }))}
        />
      </Group>
      <Group title="Animação">
        <Slider
          label="Frequência da piscada"
          value={anim.blinkRate}
          min={0}
          max={40}
          step={1}
          format={(v) => (v === 0 ? "não pisca" : `${v}/min`)}
          onChange={(v) => setA("blinkRate", v)}
        />
        <Slider
          label="Velocidade das transições"
          value={anim.transitionSpeed}
          min={0.25}
          max={3}
          step={0.05}
          format={(v) => `${v.toFixed(2)}×`}
          onChange={(v) => setA("transitionSpeed", v)}
        />
        <Toggle label="Respiração" description="O rosto sobe e desce bem de leve" checked={anim.breathing} onChange={(v) => setA("breathing", v)} />
        <Toggle label="Olhos seguem o toque" description="Olha para onde tocarem na tela (e para o mouse na prévia)" checked={anim.followTouch} onChange={(v) => setA("followTouch", v)} />
        <Toggle label="Efeito glitch" description="Falhas de sinal de vez em quando" checked={anim.glitch} onChange={(v) => setA("glitch", v)} />
      </Group>
      <Group title="Reações automáticas">
        <Toggle label="Ao ser tocado" description="Fica feliz (ou acorda surpreso)" checked={behavior.reactTouch} onChange={(v) => setB("reactTouch", v)} />
        <Toggle label="Obstáculo perto" description="Leva um susto quando algo chega a menos de 25 cm" checked={behavior.reactObstacle} onChange={(v) => setB("reactObstacle", v)} />
        <Toggle label="Bateria fraca" description="Fica triste e pede para carregar" checked={behavior.reactBattery} onChange={(v) => setB("reactBattery", v)} />
      </Group>
    </>
  );
}

/* ---------- LEDs ---------- */

const LED_EFFECTS: { value: LedEffect; label: string }[] = [
  { value: "fixo", label: "Fixo" },
  { value: "respirando", label: "Respirando" },
  { value: "arco_iris", label: "Arco-íris" },
  { value: "piscando", label: "Piscando" },
];

export function LedsPanel({ d }: { d: FaceDraft }) {
  const { leds, eyes } = d.draft!;
  const set = <K extends keyof typeof leds>(k: K, v: (typeof leds)[K]) => d.set("leds", k, v);
  const color = leds.syncEyes ? eyes.color : leds.color;
  return (
    <>
      <div className="flex items-center justify-center rounded-card border border-line bg-bg/70 py-5">
        <LedStrip leds={{ ...leds, color }} count={14} />
      </div>
      <Group title="Cor">
        <Toggle label="Mesma cor dos olhos" checked={leds.syncEyes} onChange={(v) => set("syncEyes", v)} />
        {!leds.syncEyes && <ColorField label="Cor dos LEDs" value={leds.color} onChange={(v) => set("color", v)} />}
      </Group>
      <Group title="Efeito">
        <Segmented label="Efeito" value={leds.effect} onChange={(v) => set("effect", v)} options={LED_EFFECTS} columns={4} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Slider label="Brilho" value={leds.brightness} min={0} max={1} format={pct} onChange={(v) => set("brightness", v)} />
          <Slider label="Velocidade" value={leds.speed} min={0.25} max={3} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => set("speed", v)} />
        </div>
        <p className="text-xs text-ink-soft">Os LEDs ficam no ESP32 e são atualizados junto com o rosto.</p>
      </Group>
    </>
  );
}

/** Fita de LED simulada mostrando cor, efeito, brilho e velocidade. */
export function LedStrip({ leds, count = 8 }: { leds: FaceLeds; count?: number }) {
  const duration = (leds.effect === "piscando" ? 0.8 : 2.4) / leds.speed;
  return (
    <div className="flex gap-1.5" aria-hidden style={{ opacity: 0.25 + leds.brightness * 0.75 }}>
      {Array.from({ length: count }, (_, i) => {
        const color = leds.effect === "arco_iris" ? `hsl(${(i * 360) / count} 100% 60%)` : leds.color;
        const anim =
          leds.effect === "respirando"
            ? { opacity: [0.25, 1, 0.25] }
            : leds.effect === "piscando"
              ? { opacity: [1, 0.1, 1] }
              : leds.effect === "arco_iris"
                ? { filter: ["hue-rotate(0deg)", "hue-rotate(360deg)"] }
                : { opacity: 1 };
        return (
          <motion.span
            key={i}
            className="size-2.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
            animate={anim}
            transition={{ duration, repeat: Infinity, ease: leds.effect === "piscando" ? "linear" : "easeInOut" }}
          />
        );
      })}
    </div>
  );
}
