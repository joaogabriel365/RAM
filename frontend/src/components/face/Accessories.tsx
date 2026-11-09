import { motion } from "framer-motion";
import type { GlassesStyle, Headwear } from "../../types/face";
import { EYE_Y, HEART_PATH } from "./geometry";

/* Acessórios desenhados no mesmo sistema de coordenadas do rosto (viewBox -400 -250 800 500). */

interface GlassesProps {
  style: GlassesStyle;
  color: string;
  eyeX: number;
  w: number;
  h: number;
  size: number;
}

export function Glasses({ style, color, eyeX, w, h, size }: GlassesProps) {
  if (style === "nenhum") return null;
  const fw = (w + 30) * size;
  const fh = Math.max(h + 26, 52) * size;
  const lens = { stroke: color, strokeWidth: 8, fill: color, fillOpacity: 0.07 };

  if (style === "visor") {
    const x = eyeX + fw;
    return (
      <g opacity={0.95}>
        <rect x={-x} y={EYE_Y - fh * 0.85} width={2 * x} height={fh * 1.7} rx={fh * 0.85} {...lens} fillOpacity={0.16} />
        <path
          d={`M ${-x + fh * 0.6} ${EYE_Y - fh * 0.55} H ${x - fh * 0.6}`}
          stroke="#FFFFFF"
          strokeOpacity={0.35}
          strokeWidth={6}
          strokeLinecap="round"
        />
      </g>
    );
  }

  const bridge = (
    <path
      d={`M ${-eyeX + fw} ${EYE_Y - 12} Q 0 ${EYE_Y - 36} ${eyeX - fw} ${EYE_Y - 12}`}
      stroke={color}
      strokeWidth={8}
      fill="none"
    />
  );

  return (
    <g opacity={0.92} strokeLinejoin="round">
      {[-1, 1].map((side) => {
        const cx = side * eyeX;
        if (style === "redondo") return <ellipse key={side} cx={cx} cy={EYE_Y} rx={fw} ry={fh} {...lens} />;
        if (style === "quadrado")
          return <rect key={side} x={cx - fw} y={EYE_Y - fh} width={2 * fw} height={2 * fh} rx={14} {...lens} />;
        // coração: escala o desenho base (140 de largura) para a armação
        const k = (fw * 2.2) / 140;
        return (
          <path
            key={side}
            d={HEART_PATH}
            transform={`translate(${cx} ${EYE_Y + 21 * k}) scale(${k})`}
            {...lens}
            strokeWidth={8 / k}
          />
        );
      })}
      {bridge}
    </g>
  );
}

interface HeadwearProps {
  type: Headwear;
  color: string;
  eyeX: number;
  animate: boolean;
}

export function HeadwearEl({ type, color, eyeX, animate }: HeadwearProps) {
  switch (type) {
    case "nenhum":
      return null;
    case "orelhas_gato":
      return (
        <g strokeLinejoin="round">
          {/* inclinadas para fora, nos "cantos da cabeça" */}
          {[-1, 1].map((s) => (
            <g key={s}>
              <path
                d={`M ${s * (eyeX - 30)} -196 L ${s * (eyeX + 78)} -232 L ${s * (eyeX + 112)} -138 Z`}
                fill={color}
                stroke={color}
                strokeWidth={14}
              />
              <path
                d={`M ${s * (eyeX + 6)} -192 L ${s * (eyeX + 74)} -214 L ${s * (eyeX + 94)} -156 Z`}
                fill="#FFB3E6"
                opacity={0.75}
              />
            </g>
          ))}
        </g>
      );
    case "chifres":
      return (
        <g>
          {[-1, 1].map((s) => (
            <path
              key={s}
              d={`M ${s * (eyeX - 45)} -160 Q ${s * (eyeX - 40)} -222 ${s * (eyeX + 42)} -236 Q ${s * (eyeX + 8)} -206 ${s * (eyeX + 30)} -158 Z`}
              fill={color}
            />
          ))}
        </g>
      );
    case "gorro_natal":
      return (
        <g>
          <path d="M -215 -176 C -140 -250 110 -254 228 -206 C 150 -214 120 -204 215 -176 Z" fill={color} />
          <rect x={-236} y={-192} width={472} height={32} rx={16} fill="#F8FAFC" />
          <circle cx={234} cy={-202} r={22} fill="#F8FAFC" />
        </g>
      );
    case "coroa":
      return (
        <g>
          <path
            d="M -120 -165 L -120 -216 L -62 -186 L 0 -234 L 62 -186 L 120 -216 L 120 -165 Z"
            fill={color}
            stroke={color}
            strokeWidth={8}
            strokeLinejoin="round"
          />
          <circle cx={0} cy={-196} r={11} fill="#22D3EE" />
          <circle cx={-72} cy={-178} r={8} fill="#FF3D71" />
          <circle cx={72} cy={-178} r={8} fill="#FF3D71" />
        </g>
      );
    case "antena":
      return (
        <g>
          <line x1={0} y1={-168} x2={0} y2={-212} stroke={color} strokeWidth={8} strokeLinecap="round" />
          <motion.circle
            cx={0}
            cy={-222}
            r={15}
            fill={color}
            initial={false}
            animate={animate ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
            transition={animate ? { duration: 1.6, repeat: Infinity } : { duration: 0 }}
          />
        </g>
      );
    case "laco": {
      const cx = eyeX + 30;
      const cy = -192;
      return (
        <g fill={color} strokeLinejoin="round">
          <path d={`M ${cx} ${cy} L ${cx - 62} ${cy - 36} L ${cx - 62} ${cy + 36} Z`} stroke={color} strokeWidth={10} />
          <path d={`M ${cx} ${cy} L ${cx + 62} ${cy - 36} L ${cx + 62} ${cy + 36} Z`} stroke={color} strokeWidth={10} />
          <circle cx={cx} cy={cy} r={15} fill="#FFFFFF" fillOpacity={0.25} stroke={color} strokeWidth={8} />
        </g>
      );
    }
  }
}
