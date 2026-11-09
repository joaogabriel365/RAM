import type { CSSProperties } from "react";
import type { FaceBackground } from "../../types/face";

/** Estrelas em posições fixas (pseudoaleatórias), geradas uma vez. */
function starLayer(count: number, seed: number) {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const stars: string[] = [];
  for (let i = 0; i < count; i++) {
    const size = (0.8 + rnd() * 1.6).toFixed(1);
    const alpha = (0.45 + rnd() * 0.55).toFixed(2);
    stars.push(`radial-gradient(${size}px ${size}px at ${(rnd() * 100).toFixed(2)}% ${(rnd() * 100).toFixed(2)}%, rgb(255 255 255 / ${alpha}), transparent)`);
  }
  return stars.join(",");
}

const STARS_A = starLayer(70, 7);
const STARS_B = starLayer(45, 1337);

/** Fundo do rosto + efeitos de tela (scanlines, vinheta). */
export function Backdrop({ bg, animate }: { bg: FaceBackground; animate: boolean }) {
  return (
    <>
      <div className="absolute inset-0" style={baseStyle(bg)} />

      {bg.type === "estrelas" && (
        <>
          <div className={`absolute inset-0 ${animate ? "ram-twinkle" : ""}`} style={{ backgroundImage: STARS_A }} />
          <div
            className={`absolute inset-0 ${animate ? "ram-twinkle ram-twinkle-late" : ""}`}
            style={{ backgroundImage: STARS_B }}
          />
        </>
      )}

      {bg.type === "aurora" && (
        <div className="absolute inset-0 overflow-hidden" style={{ mixBlendMode: "screen" }}>
          {[
            { color: bg.color2, cls: "ram-aurora-a", pos: { left: "-10%", top: "-20%" } },
            { color: bg.gridColor, cls: "ram-aurora-b", pos: { right: "-15%", top: "5%" } },
            { color: bg.color2, cls: "ram-aurora-c", pos: { left: "20%", bottom: "-35%" } },
          ].map((b, i) => (
            <div
              key={i}
              className={`absolute ${animate ? b.cls : ""}`}
              style={{
                ...b.pos,
                width: "75%",
                height: "80%",
                opacity: 0.55,
                background: `radial-gradient(ellipse at center, ${b.color} 0%, transparent 65%)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0" style={overlayStyle(bg)} />
    </>
  );
}

function baseStyle(bg: FaceBackground): CSSProperties {
  switch (bg.type) {
    case "solido":
    case "aurora":
      return { backgroundColor: bg.color };
    case "gradiente":
    case "estrelas":
      return {
        backgroundColor: bg.color,
        backgroundImage: `radial-gradient(ellipse 85% 75% at 50% 40%, ${bg.color2}, ${bg.color})`,
      };
    case "grade":
      return {
        backgroundColor: bg.color,
        backgroundImage:
          `linear-gradient(${bg.gridColor}99 1px, transparent 1px),` +
          `linear-gradient(90deg, ${bg.gridColor}99 1px, transparent 1px),` +
          `linear-gradient(${bg.gridColor}40 1px, transparent 1px),` +
          `linear-gradient(90deg, ${bg.gridColor}40 1px, transparent 1px)`,
        backgroundSize: "10cqmin 10cqmin, 10cqmin 10cqmin, 2cqmin 2cqmin, 2cqmin 2cqmin",
        backgroundPosition: "center",
      };
    case "pontos":
      return {
        backgroundColor: bg.color,
        backgroundImage: `radial-gradient(circle at center, ${bg.gridColor} 0.3cqmin, transparent 0.36cqmin)`,
        backgroundSize: "2.4cqmin 2.4cqmin",
        backgroundPosition: "center",
      };
  }
}

function overlayStyle(bg: FaceBackground): CSSProperties {
  const layers: string[] = [];
  if (bg.vignette > 0) {
    layers.push(
      `radial-gradient(ellipse 75% 70% at 50% 45%, transparent ${Math.round(70 - bg.vignette * 30)}%, rgb(0 0 0 / ${(bg.vignette * 0.85).toFixed(2)}) 100%)`,
    );
  }
  if (bg.scanlines > 0) {
    const a = (bg.scanlines * 0.07).toFixed(3);
    const d = (bg.scanlines * 0.35).toFixed(3);
    layers.push(
      `repeating-linear-gradient(0deg, rgb(255 255 255 / ${a}) 0px, rgb(255 255 255 / ${a}) 1px, rgb(0 0 0 / ${d}) 1px, rgb(0 0 0 / ${d}) 2px, transparent 2px, transparent 4px)`,
    );
  }
  return layers.length ? { backgroundImage: layers.join(",") } : {};
}
