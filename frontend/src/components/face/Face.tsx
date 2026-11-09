import { AnimatePresence, motion, useReducedMotion, type Transition } from "framer-motion";
import { useId, type ReactNode } from "react";
import type { EyeShape, Expression, FaceAppearance, FaceEyes, FaceMouth, Speech } from "../../types/face";
import { Glasses, HeadwearEl } from "./Accessories";
import { Backdrop } from "./Backdrop";
import {
  EXPRESSION_PARAMS,
  EYE_DIMS,
  EYE_X,
  EYE_Y,
  HEART_PATH,
  MOUTH_Y,
  PIXEL,
  PIXEL_CELLS,
  VIEWBOX,
  lidPath,
  mouthPath,
  mouthPixels,
  mouthTopMid,
  type BrowParams,
  type EyeParams,
  type ExpressionParams,
  type MouthParams,
} from "./geometry";
import { PERSONALITY, useBlink, useGlitch, useIdleGaze, useMicroExpression } from "./hooks";
import { SpeechBubble } from "./SpeechBubble";

const HEART_COLOR = "#FF4FA3";

type Gaze = { x: number; y: number };

export interface FaceProps {
  appearance: FaceAppearance;
  expression: Expression;
  speech?: Speech | null;
  /** olhar vagando e microexpressões quando ocioso */
  idle?: boolean;
  /** força o olhar para um ponto (-1..1); usado para seguir toque/mouse */
  lookAt?: Gaze | null;
  /** miniatura: sem piscadas nem animações contínuas (economiza CPU na galeria) */
  still?: boolean;
  className?: string;
  /** sobreposições (QR code, indicadores) por cima do rosto */
  children?: ReactNode;
}

/** Pálpebras meio caídas da personalidade "sonolenta" quando está neutra. */
function droopy(p: ExpressionParams): ExpressionParams {
  const lid = (e: EyeParams): EyeParams => ({ ...e, inner: Math.max(e.inner, -0.42), outer: Math.max(e.outer, -0.42) });
  return { ...p, left: lid(p.left), right: lid(p.right) };
}

/**
 * O rosto da RAM. Componente único usado no /face, na prévia da aba Rosto, na galeria e no Início.
 * Escala pelo tamanho do container (container queries), então funciona em qualquer caixa.
 */
export function Face({
  appearance,
  expression,
  speech = null,
  idle = true,
  lookAt = null,
  still = false,
  className = "",
  children,
}: FaceProps) {
  const reduced = useReducedMotion() ?? false;
  const live = !still && !reduced;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { eyes, mouth, extras, layout, background, animation, behavior } = appearance;
  const personality = animation.personality;

  const resting = expression === behavior.mood && !speech;
  const micro = useMicroExpression(live && idle && resting, personality);
  const shown = micro ?? expression;
  let p = EXPRESSION_PARAMS[shown] ?? EXPRESSION_PARAMS.neutro;
  if (personality === "sonolenta" && shown === "neutro") p = droopy(p);

  const blinking = useBlink(animation.blinkRate, !still && !p.noBlink, PERSONALITY[personality].slowBlink);
  const idleGaze = useIdleGaze(live && idle && !p.gaze && !lookAt, personality);
  const glitching = useGlitch(animation.glitch && live);
  const gaze = lookAt ?? p.gaze ?? idleGaze;

  const t: Transition = reduced ? { duration: 0 } : { duration: 0.35 / animation.transitionSpeed, ease: [0.4, 0, 0.2, 1] };
  const glow = eyes.glow > 0.02 ? `url(#glow-${uid})` : undefined;
  const { w, h } = EYE_DIMS[eyes.shape];
  const eyeX = EYE_X * eyes.spacing;
  const blush = extras.blush ? Math.max(0.5, p.blush) : p.hearts ? p.blush : 0;
  const eyeFill = eyes.gradient ? `url(#eyegrad-${uid})` : eyes.color;
  // com chapéu/orelhas, desce o rosto um pouco para o acessório caber na tela
  const headroom = extras.headwear !== "nenhum" ? 16 : 0;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ containerType: "size" }}>
      <Backdrop bg={background} animate={live} />

      <svg
        viewBox={VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        className={`absolute inset-0 h-full w-full ${glitching ? "ram-glitching" : ""}`}
        role="img"
        aria-label={`Rosto da RAM: ${shown}`}
      >
        <defs>
          <filter id={`glow-${uid}`} filterUnits="userSpaceOnUse" x={-500} y={-500} width={1000} height={1000}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={3 + eyes.glow * 12} result="blur" />
            <feComponentTransfer in="blur" result="glow">
              <feFuncA type="linear" slope={0.4 + eyes.glow * 1.4} />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`soft-${uid}`} filterUnits="userSpaceOnUse" x={-500} y={-500} width={1000} height={1000}>
            <feGaussianBlur stdDeviation={10} />
          </filter>
          {/* em coordenadas do olho, para valer igual em todos os formatos */}
          <linearGradient id={`eyegrad-${uid}`} gradientUnits="userSpaceOnUse" x1={0} y1={-90} x2={0} y2={90}>
            <stop offset="0%" stopColor={eyes.color} />
            <stop offset="100%" stopColor={eyes.color2} />
          </linearGradient>
        </defs>

        <motion.g
          initial={false}
          animate={{ y: layout.offsetY + headroom + (speech ? -60 : 0), scale: layout.scale * (speech ? 0.82 : 1) }}
          transition={t}
        >
          <motion.g
            initial={false}
            animate={animation.breathing && live ? { scale: [1, 1.012, 1], y: [0, -3, 0] } : { scale: 1, y: 0 }}
            transition={animation.breathing && live ? { duration: 4.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
          >
            <g filter={glow}>
              <HeadwearEl type={extras.headwear} color={extras.headwearColor} eyeX={eyeX} animate={live} />
            </g>

            <motion.g initial={false} animate={{ opacity: blush * 0.6 }} transition={t} filter={`url(#soft-${uid})`}>
              {[-1, 1].map((side) => (
                <ellipse
                  key={side}
                  cx={side * (eyeX + 12)}
                  cy={EYE_Y + h * eyes.size + 40}
                  rx={48}
                  ry={20}
                  fill={extras.blushColor}
                />
              ))}
            </motion.g>

            {([-1, 1] as const).map((side) => (
              <Eye
                key={side}
                uid={uid}
                side={side}
                x={side * eyeX}
                eyes={eyes}
                fill={eyeFill}
                p={side < 0 ? p.left : p.right}
                gaze={gaze}
                blinking={blinking}
                hearts={!!p.hearts}
                filter={glow}
                t={t}
                animate={live}
                reduced={reduced}
              />
            ))}

            {extras.brows &&
              ([-1, 1] as const).map((side) => (
                <Brow
                  key={side}
                  side={side}
                  x={side * eyeX}
                  top={EYE_Y - h * eyes.size * (side < 0 ? p.left.scale : p.right.scale) - 36}
                  b={side < 0 ? p.browLeft : p.browRight}
                  color={eyes.color}
                  filter={glow}
                  t={t}
                />
              ))}

            <Glasses style={extras.glasses} color={extras.glassesColor} eyeX={eyeX} w={w} h={h} size={eyes.size} />

            <Mouth mouth={mouth} fangs={extras.fangs} p={p.mouth} filter={glow} t={t} />

            {p.zzz && <Zzz x={eyeX + 60} color={eyes.color} animate={live} />}
            {p.thinking && <ThinkingDots x={eyeX + 40} color={eyes.color} animate={live} />}
          </motion.g>
        </motion.g>
      </svg>

      <SpeechBubble speech={speech} instant={reduced} />
      {children}
    </div>
  );
}

/* ---------- Olho ---------- */

interface EyeProps {
  uid: string;
  side: -1 | 1;
  x: number;
  eyes: FaceEyes;
  fill: string;
  p: EyeParams;
  gaze: Gaze;
  blinking: boolean;
  hearts: boolean;
  filter?: string;
  t: Transition;
  animate: boolean;
  reduced: boolean;
}

function Eye({ uid, side, x, eyes, fill, p, gaze, blinking, hearts, filter, t, animate, reduced }: EyeProps) {
  const { w, h } = EYE_DIMS[eyes.shape];
  const lidId = `lid-${uid}-${side}`;
  const shapeId = `shape-${uid}-${side}`;
  // "inner" é o canto voltado para o nariz.
  const topLeft = side < 0 ? p.outer : p.inner;
  const topRight = side < 0 ? p.inner : p.outer;
  // olho feliz/fechado ("^") fica só o arco, sem pupila
  const pupil = eyes.pupilSize * p.pupil * Math.max(0, 1 - p.smile * 1.25);
  const showHighlight = eyes.highlight && eyes.shape !== "anime" && eyes.shape !== "linha";

  return (
    <g transform={`translate(${x} ${EYE_Y})`} filter={filter}>
      <motion.g
        initial={false}
        animate={{
          x: gaze.x * 12,
          y: gaze.y * 10,
          scale: eyes.size * p.scale,
          rotate: side < 0 ? -eyes.tilt : eyes.tilt,
        }}
        transition={t}
      >
        <clipPath id={lidId}>
          <motion.path initial={false} animate={{ d: lidPath(w, h, topLeft, topRight, p.smile) }} transition={t} />
        </clipPath>
        <clipPath id={shapeId}>
          <EyeShapeEl shape={eyes.shape} w={w} h={h} />
        </clipPath>

        <motion.g
          initial={false}
          animate={{ opacity: hearts ? 0 : 1, scaleY: blinking ? 0.06 : 1 }}
          transition={{ opacity: t, scaleY: { duration: reduced ? 0 : 0.07 } }}
        >
          <g clipPath={`url(#${lidId})`}>
            <g clipPath={`url(#${shapeId})`}>
              <EyeShapeEl shape={eyes.shape} w={w} h={h} fill={fill} outline={eyes.outline} />
              <Pupil shape={eyes.shape} w={w} h={h} size={pupil} gaze={gaze} color={eyes.pupilColor} t={t} />
              {showHighlight && (
                <ellipse
                  cx={-w * 0.4}
                  cy={-h * 0.45}
                  rx={w * 0.2}
                  ry={h * 0.13}
                  transform={`rotate(-30 ${-w * 0.4} ${-h * 0.45})`}
                  fill="#FFFFFF"
                  opacity={0.8}
                />
              )}
            </g>
          </g>
        </motion.g>

        <AnimatePresence>
          {hearts && (
            <motion.path
              key="heart"
              d={HEART_PATH}
              fill={HEART_COLOR}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: animate ? [1, 1.12, 1] : 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                opacity: t,
                scale: animate ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { duration: 0 },
              }}
            />
          )}
        </AnimatePresence>
      </motion.g>
    </g>
  );
}

function EyeShapeEl({ shape, w, h, fill, outline }: { shape: EyeShape; w: number; h: number; fill?: string; outline?: boolean }) {
  // contorno: traço grosso (metade fica dentro do recorte) + preenchimento bem leve
  const paint = fill
    ? outline
      ? { fill, fillOpacity: 0.1, stroke: fill, strokeWidth: shape === "pixel" ? 6 : 18 }
      : { fill }
    : {};
  switch (shape) {
    case "redondo":
      return <circle r={w} {...paint} />;
    case "oval":
    case "anime":
      return <ellipse rx={w} ry={h} {...paint} />;
    case "retangulo":
      return <rect x={-w} y={-h} width={2 * w} height={2 * h} rx={16} {...paint} />;
    case "linha":
      return <rect x={-w} y={-h} width={2 * w} height={2 * h} rx={h} {...paint} />;
    case "pixel":
      return (
        <>
          {PIXEL_CELLS.map((c) => (
            <rect key={`${c.x},${c.y}`} x={c.x + 1} y={c.y + 1} width={PIXEL - 2} height={PIXEL - 2} rx={3} {...paint} />
          ))}
        </>
      );
  }
}

interface PupilProps {
  shape: EyeShape;
  w: number;
  h: number;
  size: number;
  gaze: Gaze;
  color: string;
  t: Transition;
}

function Pupil({ shape, w, h, size, gaze, color, t }: PupilProps) {
  switch (shape) {
    case "linha":
      return null;
    case "pixel": {
      const cells = Math.round(2 * size);
      if (cells < 1) return null;
      const s = cells * PIXEL;
      const snap = (v: number) => Math.round((v - s / 2 + PIXEL / 2) / PIXEL) * PIXEL - PIXEL / 2;
      return (
        <motion.rect
          width={s}
          height={s}
          fill={color}
          initial={false}
          animate={{ x: snap(gaze.x * 1.5 * PIXEL), y: snap(gaze.y * 1.5 * PIXEL) }}
          transition={{ duration: 0.12, ease: "linear" }}
        />
      );
    }
    case "retangulo": {
      const pw = w * 0.42 * size;
      const ph = h * 0.6 * size;
      return (
        <motion.rect
          rx={8}
          fill={color}
          initial={false}
          animate={{
            attrX: gaze.x * (w - pw) * 0.7 - pw / 2,
            attrY: gaze.y * (h - ph) * 0.7 - ph / 2,
            width: pw,
            height: ph,
          }}
          transition={t}
        />
      );
    }
    case "anime": {
      const r = w * 0.62 * size;
      const cx = gaze.x * w * 0.3;
      const cy = gaze.y * h * 0.25 + 6;
      return (
        <>
          <motion.circle fill={color} initial={false} animate={{ cx, cy, r }} transition={t} />
          <motion.circle fill="#FFFFFF" initial={false} animate={{ cx: cx - r * 0.38, cy: cy - r * 0.42, r: r * 0.28 }} transition={t} />
          <motion.circle
            fill="#FFFFFF"
            opacity={0.85}
            initial={false}
            animate={{ cx: cx + r * 0.4, cy: cy + r * 0.38, r: r * 0.13 }}
            transition={t}
          />
        </>
      );
    }
    default: {
      const r = Math.min(w, h) * 0.42 * size;
      return (
        <motion.circle
          fill={color}
          initial={false}
          animate={{ cx: gaze.x * Math.max(0, w - r) * 0.65, cy: gaze.y * Math.max(0, h - r) * 0.65, r }}
          transition={t}
        />
      );
    }
  }
}

/* ---------- Sobrancelhas e boca ---------- */

interface BrowProps {
  side: -1 | 1;
  x: number;
  top: number;
  b: BrowParams;
  color: string;
  filter?: string;
  t: Transition;
}

function Brow({ side, x, top, b, color, filter, t }: BrowProps) {
  return (
    <g transform={`translate(${x} 0)`} filter={filter}>
      <motion.g initial={false} animate={{ y: top - b.lift, rotate: side < 0 ? b.angle : -b.angle }} transition={t}>
        <line x1={-46} x2={46} y1={0} y2={0} stroke={color} strokeWidth={12} strokeLinecap="round" />
      </motion.g>
    </g>
  );
}

interface MouthProps {
  mouth: FaceMouth;
  fangs: boolean;
  p: MouthParams;
  filter?: string;
  t: Transition;
}

function Mouth({ mouth, fangs, p: expr, filter, t }: MouthProps) {
  const { style, color } = mouth;
  if (style === "nenhuma") return null;
  const p = { ...expr, width: expr.width * mouth.width };
  const stroke = 12 * mouth.thickness;
  const fangY = mouthTopMid(style, p);
  const fangX = Math.max(14, 22 * p.width);
  return (
    <g transform={`translate(0 ${MOUTH_Y + mouth.offsetY})`}>
      <motion.g initial={false} animate={{ x: p.offsetX }} transition={t}>
        <g filter={filter}>
          {style === "pixel" ? (
            mouthPixels(p).map((c, i) => {
              const size = 16 * Math.min(1.4, mouth.thickness);
              return (
                <motion.rect
                  key={i}
                  width={size}
                  height={size}
                  rx={2}
                  fill={color}
                  initial={false}
                  animate={{ x: c.x - size / 2, y: c.y - size / 2 }}
                  transition={t}
                />
              );
            })
          ) : (
            <motion.path
              key={style}
              initial={false}
              animate={{ d: mouthPath(style, p) }}
              transition={t}
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={style === "onda" || style === "gato" ? "none" : color}
              fillOpacity={0.22}
            />
          )}
        </g>
        {fangs && (
          <motion.g initial={false} animate={{ y: fangY + stroke / 2 - 2 }} transition={t} fill="#FFFFFF">
            <path d={`M ${-fangX - 9} 0 L ${-fangX + 9} 0 L ${-fangX} 22 Z`} />
            <path d={`M ${fangX - 9} 0 L ${fangX + 9} 0 L ${fangX} 22 Z`} />
          </motion.g>
        )}
      </motion.g>
    </g>
  );
}

/* ---------- Detalhes de expressão ---------- */

function Zzz({ x, color, animate }: { x: number; color: string; animate: boolean }) {
  return (
    <g fill={color} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
      {[0, 1, 2].map((i) => (
        <motion.text
          key={i}
          x={x + i * 30}
          y={-140 - i * 32}
          fontSize={30 + i * 10}
          initial={{ opacity: animate ? 0 : 0.85 }}
          animate={animate ? { opacity: [0, 1, 0], y: [12, -24] } : { opacity: 0.85 }}
          transition={animate ? { duration: 2.4, repeat: Infinity, delay: i * 0.6, ease: "easeOut" } : { duration: 0 }}
        >
          Z
        </motion.text>
      ))}
    </g>
  );
}

function ThinkingDots({ x, color, animate }: { x: number; color: string; animate: boolean }) {
  const dots = [
    { dx: 0, y: -150, r: 8 },
    { dx: 36, y: -182, r: 12 },
    { dx: 84, y: -208, r: 17 },
  ];
  return (
    <g fill={color}>
      {dots.map((d, i) => (
        <motion.circle
          key={i}
          cx={x + d.dx}
          cy={d.y}
          r={d.r}
          initial={{ opacity: animate ? 0.3 : 0.8 }}
          animate={animate ? { opacity: [0.25, 1, 0.25] } : { opacity: 0.8 }}
          transition={animate ? { duration: 1.4, repeat: Infinity, delay: i * 0.25 } : { duration: 0 }}
        />
      ))}
    </g>
  );
}
