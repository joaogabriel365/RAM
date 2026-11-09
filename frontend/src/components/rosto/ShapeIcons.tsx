import type { ReactNode } from "react";
import type { EyeShape, MouthStyle } from "../../types/face";

const common = { width: 36, height: 20, viewBox: "0 0 36 20", fill: "currentColor", "aria-hidden": true } as const;

export function EyeShapeIcon({ shape }: { shape: EyeShape }) {
  const pair = (el: (cx: number) => ReactNode) => (
    <svg {...common}>
      {el(10)}
      {el(26)}
    </svg>
  );
  switch (shape) {
    case "redondo":
      return pair((cx) => <circle cx={cx} cy={10} r={6} />);
    case "oval":
      return pair((cx) => <ellipse cx={cx} cy={10} rx={4.5} ry={7} />);
    case "retangulo":
      return pair((cx) => <rect x={cx - 6} y={5} width={12} height={10} rx={2} />);
    case "pixel":
      return pair((cx) => (
        <>
          <rect x={cx - 5} y={4} width={4} height={4} />
          <rect x={cx + 1} y={4} width={4} height={4} />
          <rect x={cx - 5} y={10} width={4} height={4} />
          <rect x={cx + 1} y={10} width={4} height={4} />
        </>
      ));
    case "anime":
      return pair((cx) => (
        <>
          <ellipse cx={cx} cy={10} rx={5} ry={7.5} />
          <circle cx={cx - 1.5} cy={7} r={1.6} fill="var(--color-bg)" />
        </>
      ));
    case "linha":
      return pair((cx) => <rect x={cx - 6} y={8.5} width={12} height={3} rx={1.5} />);
  }
}

export function MouthStyleIcon({ style }: { style: MouthStyle }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" } as const;
  switch (style) {
    case "sorriso":
      return (
        <svg {...common}>
          <path d="M8 7 Q18 19 28 7" {...stroke} />
        </svg>
      );
    case "linha":
      return (
        <svg {...common}>
          <path d="M8 10 Q18 13 28 10" {...stroke} />
        </svg>
      );
    case "onda":
      return (
        <svg {...common}>
          <path d="M6 10 Q12 4 18 10 T30 10" {...stroke} />
        </svg>
      );
    case "pixel":
      return (
        <svg {...common}>
          {[6, 11, 16, 21, 26].map((x, i) => (
            <rect key={x} x={x} y={i === 0 || i === 4 ? 6 : i === 2 ? 12 : 9} width={4} height={4} />
          ))}
        </svg>
      );
    case "gato":
      return (
        <svg {...common}>
          <path d="M9 8 Q13.5 16 18 8 Q22.5 16 27 8" {...stroke} />
        </svg>
      );
    case "nenhuma":
      return (
        <svg {...common}>
          <path d="M10 4 L26 16 M26 4 L10 16" {...stroke} strokeWidth={1.6} opacity={0.6} />
        </svg>
      );
  }
}
