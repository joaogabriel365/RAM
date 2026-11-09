import { useRealtime } from "../../lib/realtime";
import { cx } from "../../lib/utils";

/** Bolinha + texto com o estado da conexão painel ↔ RAM. */
export function ConnectionPill({ compact = false }: { compact?: boolean }) {
  const status = useRealtime((s) => s.status);
  const robot = useRealtime((s) => s.robot);
  const ok = status === "conectado";
  const label = ok ? (robot?.driver === "mock" ? "Conectado · simulado" : "Conectado") : status === "conectando" ? "Conectando…" : "Desconectado";
  return (
    <span
      className={cx("inline-flex items-center gap-2 text-xs", ok ? "text-ink-soft" : "text-alert")}
      title={label}
      role="status"
    >
      <span className="relative flex size-2.5">
        {ok && <span className="absolute inset-0 animate-ping rounded-full bg-ok/60" />}
        <span className={cx("relative size-2.5 rounded-full", ok ? "bg-ok" : status === "conectando" ? "bg-ink-soft" : "bg-alert")} />
      </span>
      {!compact && label}
    </span>
  );
}

/** Faixa de aviso quando o WebSocket caiu. */
export function DisconnectedBanner() {
  const status = useRealtime((s) => s.status);
  if (status !== "desconectado") return null;
  return (
    <div className="sticky top-0 z-30 flex items-center justify-center gap-2 border-b border-alert/50 bg-alert/15 px-4 py-2 text-sm text-ink backdrop-blur" role="alert">
      <span className="size-2 animate-pulse rounded-full bg-alert" />
      Sem conexão com a RAM — tentando reconectar…
    </div>
  );
}
