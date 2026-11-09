import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Face } from "../components/face/Face";
import { Icon } from "../components/ui/Icon";
import { realtime, useRealtime, visitorUrl } from "../lib/realtime";
import { cx } from "../lib/utils";
import { DEFAULT_APPEARANCE } from "../types/face";

/** Mantém a tela da cabeça acesa (quando o navegador permite). */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        /* sem suporte ou sem permissão: o modo quiosque cuida disso */
      }
    };
    const onVisible = () => document.visibilityState === "visible" && request();
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, []);
}

/** Rota /face: o rosto em tela cheia na cabeça do robô. Sem menu. */
export function FacePage() {
  const face = useRealtime((s) => s.face);
  const status = useRealtime((s) => s.status);
  const info = useRealtime((s) => s.info);
  const [lookAt, setLookAt] = useState<{ x: number; y: number } | null>(null);
  const lookTimer = useRef<number | undefined>(undefined);
  const navigate = useNavigate();
  // Aberto pelo painel ("Ver o rosto"): mostra o botão de voltar. No quiosque nunca aparece.
  const fromPanel = !!(useLocation().state as { fromPanel?: boolean } | null)?.fromPanel;
  useWakeLock();

  useEffect(() => {
    document.title = "RAM · Rosto";
    return () => window.clearTimeout(lookTimer.current);
  }, []);

  useEffect(() => {
    if (!fromPanel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && navigate(-1);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fromPanel, navigate]);

  /** Os olhos acompanham o dedo e voltam ao normal 2,5 s depois. */
  function look(e: PointerEvent<HTMLDivElement>) {
    if (!face?.appearance.animation.followTouch) return;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    setLookAt({ x: clamp((e.clientX / window.innerWidth) * 2 - 1), y: clamp((e.clientY / window.innerHeight) * 2 - 1) });
    window.clearTimeout(lookTimer.current);
    lookTimer.current = window.setTimeout(() => setLookAt(null), 2500);
  }

  return (
    <div
      className={cx("fixed inset-0 touch-none select-none bg-bg", !fromPanel && "cursor-none")}
      onPointerDown={(e) => {
        realtime.send({ type: "touch" });
        look(e);
      }}
      onPointerMove={(e) => e.buttons > 0 && look(e)}
    >
      {fromPanel && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 inline-flex h-10 items-center gap-2 rounded-card border border-line bg-bg/70 px-3.5 text-sm text-ink-soft backdrop-blur transition-colors hover:border-neon hover:text-ink"
          title="Voltar ao painel (Esc)"
        >
          <Icon name="back" size={18} /> Voltar
        </button>
      )}
      <Face
        appearance={face?.appearance ?? DEFAULT_APPEARANCE}
        expression={face?.expression ?? "neutro"}
        speech={face?.speech}
        lookAt={lookAt}
        className="h-full w-full"
      >
        {status !== "conectado" && (
          <div
            className="absolute flex items-center rounded-full border border-alert/60 bg-bg/80 text-alert"
            style={{
              top: fromPanel ? "calc(3cqmin + 3.5rem)" : "3cqmin",
              left: "3cqmin",
              gap: "1cqmin",
              padding: "0.8cqmin 2cqmin",
              fontSize: "2.4cqmin",
            }}
            role="status"
          >
            <Icon name="wifiOff" style={{ width: "3cqmin", height: "3cqmin" }} />
            {status === "conectando" ? "conectando…" : "desconectado"}
          </div>
        )}

        <div
          className="absolute flex flex-col items-center rounded-xl bg-white/95 text-bg"
          style={{ right: "2.5cqmin", bottom: "2.5cqmin", padding: "1cqmin", gap: "0.6cqmin" }}
        >
          <QRCodeSVG
            value={visitorUrl(info)}
            bgColor="transparent"
            fgColor="#07060B"
            marginSize={0}
            style={{ width: "12cqmin", height: "12cqmin" }}
          />
          <span style={{ fontSize: "1.6cqmin", fontFamily: "var(--font-display)", fontWeight: 600 }}>Fale comigo</span>
        </div>
      </Face>
    </div>
  );
}
