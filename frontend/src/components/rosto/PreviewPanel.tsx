import { useEffect, useRef, useState, type PointerEvent } from "react";
import { faceWarnings } from "../../lib/faceTools";
import { storage } from "../../lib/storage";
import { cx } from "../../lib/utils";
import { EXPRESSIONS, type FaceAppearance, type FaceState } from "../../types/face";
import { Face } from "../face/Face";
import { Badge } from "../ui/controls";
import { Icon } from "../ui/Icon";

const ASPECTS = [
  { value: "16/10", label: "16:10", ratio: 16 / 10 },
  { value: "16/9", label: "16:9", ratio: 16 / 9 },
  { value: "4/3", label: "4:3", ratio: 4 / 3 },
  { value: "round", label: "Redonda", ratio: 1 },
] as const;
type Aspect = (typeof ASPECTS)[number]["value"];

const ASPECT_KEY = "ram.rosto.aspect";
const TEST_STEP_MS = 1800;

interface Props {
  draft: FaceAppearance;
  face: FaceState;
  dirty: boolean;
}

export function PreviewPanel({ draft, face, dirty }: Props) {
  const [aspect, setAspect] = useState<Aspect>(() => (storage.get(ASPECT_KEY) as Aspect) || "16/10");
  const [testing, setTesting] = useState(false);
  const [testIndex, setTestIndex] = useState(0);
  const [lookAt, setLookAt] = useState<{ x: number; y: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const ratio = ASPECTS.find((a) => a.value === aspect)?.ratio ?? 1.6;
  const warnings = faceWarnings(draft);
  const expression = testing ? EXPRESSIONS[testIndex].id : face.expression;

  useEffect(() => {
    if (!testing) return;
    setTestIndex(0);
    const id = window.setInterval(() => setTestIndex((i) => (i + 1) % EXPRESSIONS.length), TEST_STEP_MS);
    return () => window.clearInterval(id);
  }, [testing]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === boxRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function chooseAspect(value: Aspect) {
    setAspect(value);
    storage.set(ASPECT_KEY, value);
  }

  function follow(e: PointerEvent<HTMLDivElement>) {
    if (!draft.animation.followTouch) return;
    const r = e.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    setLookAt({ x: clamp(((e.clientX - r.left) / r.width) * 2 - 1), y: clamp(((e.clientY - r.top) / r.height) * 2 - 1) });
  }

  return (
    <div className="space-y-2">
      {/* área fixa; o rosto se encaixa nela no formato escolhido */}
      <div
        className="relative h-[27dvh] w-full lg:h-auto lg:aspect-[16/10]"
        style={{ containerType: "size" }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={boxRef}
            className={cx(
              "relative overflow-hidden border border-neon/40 bg-bg shadow-neon",
              aspect === "round" && !fullscreen ? "rounded-full" : "rounded-card",
            )}
            style={{ width: `min(100cqw, calc(100cqh * ${ratio}))`, aspectRatio: String(ratio) }}
            onPointerMove={follow}
            onPointerLeave={() => setLookAt(null)}
          >
            <Face
              appearance={draft}
              expression={expression}
              speech={face.speech}
              lookAt={lookAt}
              className="h-full w-full"
            />
            {aspect !== "round" && (
              <div className="pointer-events-none absolute top-2 left-2 flex flex-wrap gap-1.5">
                <Badge tone="neon">
                  <span className="size-1.5 rounded-full bg-neon-soft" /> Prévia
                </Badge>
                {dirty && <Badge tone="warn">não enviado</Badge>}
                {testing && <Badge tone="ok">{EXPRESSIONS[testIndex].label}</Badge>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-line bg-surface/80 p-0.5" role="radiogroup" aria-label="Formato da tela">
          {ASPECTS.map((a) => (
            <button
              key={a.value}
              type="button"
              role="radio"
              aria-checked={aspect === a.value}
              onClick={() => chooseAspect(a.value)}
              className={cx(
                "rounded-md px-2.5 py-1 font-mono text-[11px] transition-colors",
                aspect === a.value ? "bg-neon/25 text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setTesting((v) => !v)}
          aria-pressed={testing}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
            testing ? "border-ok/60 bg-ok/10 text-ok" : "border-line text-ink-soft hover:border-neon hover:text-ink",
          )}
          title="Passa por todas as expressões só na prévia (o robô não muda)"
        >
          <Icon name={testing ? "pause" : "play"} size={14} />
          <span className="hidden sm:inline">{testing ? "Parar teste" : "Testar expressões"}</span>
        </button>
        <button
          type="button"
          onClick={() => boxRef.current?.requestFullscreen?.()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-neon hover:text-ink"
          title="Ver a prévia em tela cheia"
        >
          <Icon name="maximize" size={14} />
          <span className="hidden sm:inline">Tela cheia</span>
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="status">
          {warnings.map((w) => (
            <Badge key={w} tone="warn">
              {w}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
