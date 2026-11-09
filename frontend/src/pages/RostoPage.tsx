import { motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  AccessoriesPanel,
  BackgroundPanel,
  EyesPanel,
  LedsPanel,
  LedStrip,
  MotionPanel,
  MouthPanel,
} from "../components/rosto/EditorPanels";
import { EditorToolbar } from "../components/rosto/EditorToolbar";
import { ExpressionPad, SpeakBox } from "../components/rosto/ExpressionPad";
import { PresetGallery } from "../components/rosto/PresetGallery";
import { PreviewPanel } from "../components/rosto/PreviewPanel";
import { useFaceDraft, type FaceDraft, type SendState } from "../components/rosto/useFaceDraft";
import { LoginForm } from "../components/layout/LoginForm";
import { Button, Card, Toggle } from "../components/ui/controls";
import { Icon, type IconName } from "../components/ui/Icon";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../lib/auth";
import { useRealtime } from "../lib/realtime";
import { cx } from "../lib/utils";

type Section = "galeria" | "olhos" | "boca" | "acessorios" | "fundo" | "movimento" | "leds";

const SECTIONS: { value: Section; label: string; hint: string; icon: IconName }[] = [
  { value: "galeria", label: "Galeria", hint: "Visuais prontos e os seus presets", icon: "grid" },
  { value: "olhos", label: "Olhos", hint: "Formato, tamanho, cores e brilho", icon: "eye" },
  { value: "boca", label: "Boca", hint: "Estilo, largura e espessura", icon: "mouth" },
  { value: "acessorios", label: "Acessórios", hint: "Sobrancelhas, bochechas, óculos e chapéus", icon: "hat" },
  { value: "fundo", label: "Fundo e tela", hint: "Cor de fundo, efeitos de tela e enquadramento", icon: "layers" },
  { value: "movimento", label: "Movimento", hint: "Personalidade, piscadas e reações", icon: "sparkles" },
  { value: "leds", label: "LEDs", hint: "Cor e efeito das luzes do corpo", icon: "bulb" },
];

/** Marcado ao entrar numa seção pelo menu: aí "Voltar" é o mesmo que o voltar do navegador. */
type NavState = { fromMenu?: boolean } | null;

export function RostoPage() {
  const isAdmin = useAuth().isAdmin === true;
  const d = useFaceDraft(isAdmin);
  const face = useRealtime((s) => s.face);
  const toast = useToast();

  // A seção aberta fica na URL (?aba=olhos): o voltar do navegador e o recarregar funcionam.
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const section = SECTIONS.find((s) => s.value === params.get("aba")) ?? null;
  const openSection = (s: Section) => setParams({ aba: s }, { state: { fromMenu: true } });
  const backToMenu = () => ((location.state as NavState)?.fromMenu ? navigate(-1) : setParams({}, { replace: true }));

  // Ao trocar de seção, traz o editor de volta para a vista se ele tiver ficado para cima.
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    if (el.getBoundingClientRect().top < margin) el.scrollIntoView({ block: "start" });
  }, [section]);

  // Atalhos de teclado: desfazer / refazer e Esc para voltar ao menu (fora de campos de texto)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input[type=text], input[type=password], input:not([type]), textarea")) return;
      if (e.key === "Escape" && section && !document.fullscreenElement) {
        backToMenu();
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        d.undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        d.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!d.draft || !face) {
    return <p className="text-ink-soft">Conectando à RAM…</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Personalize a RAM</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Mude olhos, boca, cores e fundo da tela. A prévia mostra exatamente como vai ficar a tela do robô.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-6">
        {/* No celular vira itens soltos do grid, para a prévia grudar abaixo da barra do topo (53px). */}
        <div className="contents lg:sticky lg:top-[77px] lg:block lg:space-y-4 lg:self-start">
          <div className="sticky top-[53px] z-10 -mx-4 bg-bg/90 px-4 pt-1 pb-2 backdrop-blur md:-mx-8 md:px-8 lg:static lg:m-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <PreviewPanel draft={d.draft} face={face} dirty={d.dirty} />
          </div>

          {isAdmin ? (
            <>
              <SendBar
                live={d.live}
                setLive={d.setLive}
                dirty={d.dirty}
                sendState={d.sendState}
                onSend={d.sendNow}
                onDiscard={d.discard}
              />
              <ExpressionPad />
              <SpeakBox />
            </>
          ) : (
            <LockedSendCard dirty={d.dirty} onDiscard={d.discard} onLogin={() => d.dirty && void d.sendNow()} />
          )}
        </div>

        {/* scroll-mt: abaixo da barra do topo e, no celular, também da prévia grudada */}
        <div ref={editorRef} className="scroll-mt-[calc(53px+27dvh+64px)] space-y-4 lg:scroll-mt-[93px]">
          <EditorToolbar draft={d} />
          {section === null ? (
            <SectionMenu d={d} onOpen={openSection} />
          ) : (
            <Card className="p-4">
              <div className="mb-5 flex items-center gap-3 border-b border-line pb-3">
                <Button variant="subtle" size="sm" icon="back" onClick={backToMenu} title="Voltar ao menu (Esc)">
                  Voltar
                </Button>
                <h2 className="flex items-center gap-2 font-semibold">
                  <Icon name={section.icon} size={18} className="text-neon-soft" />
                  {section.label}
                </h2>
              </div>
              <div className={cx(section.value !== "galeria" && "space-y-7")}>
                {section.value === "galeria" && (
                  <PresetGallery
                    draft={d.draft}
                    canEdit={isAdmin}
                    onLoad={(p) => {
                      d.update(() => p.appearance);
                      toast(`“${p.name}” carregado${d.live ? " na RAM" : " na prévia"}`, "ok");
                    }}
                  />
                )}
                {section.value === "olhos" && <EyesPanel d={d} />}
                {section.value === "boca" && <MouthPanel d={d} />}
                {section.value === "acessorios" && <AccessoriesPanel d={d} />}
                {section.value === "fundo" && <BackgroundPanel d={d} />}
                {section.value === "movimento" && <MotionPanel d={d} />}
                {section.value === "leds" && <LedsPanel d={d} />}
              </div>
              <div className="mt-6 border-t border-line pt-3">
                <Button variant="subtle" size="sm" icon="back" onClick={backToMenu}>
                  Voltar ao menu
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

const Swatch = ({ color }: { color: string }) => (
  <span className="size-5 shrink-0 rounded-full border border-line" style={{ background: color, boxShadow: `0 0 8px ${color}66` }} />
);

/** Menu inicial do editor: cada linha abre uma seção (que tem botão de voltar). */
function SectionMenu({ d, onOpen }: { d: FaceDraft; onOpen: (s: Section) => void }) {
  const a = d.draft!;
  const aside: Partial<Record<Section, ReactNode>> = {
    olhos: <Swatch color={a.eyes.color} />,
    fundo: <Swatch color={a.background.color} />,
    leds: <LedStrip count={5} leds={{ ...a.leds, color: a.leds.syncEyes ? a.eyes.color : a.leds.color }} />,
  };
  return (
    <Card className="divide-y divide-line overflow-hidden">
      {SECTIONS.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => onOpen(s.value)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/70"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-neon/40 bg-neon/10 text-neon-soft">
            <Icon name={s.icon} size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{s.label}</span>
            <span className="block truncate text-xs text-ink-soft">{s.hint}</span>
          </span>
          {aside[s.value]}
          <Icon name="chevron" size={18} className="shrink-0 text-ink-soft" />
        </button>
      ))}
    </Card>
  );
}

/** No lugar do "Enviar pra RAM" para quem ainda não entrou como admin. */
function LockedSendCard({ dirty, onDiscard, onLogin }: { dirty: boolean; onDiscard: () => void; onLogin: () => void }) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Enviar pra RAM</h3>
          <p className="mt-0.5 text-sm text-ink-soft">
            {dirty ? "Gostou? Entre como admin para aplicar no robô." : "Você está editando só a prévia. Entre como admin para aplicar no robô."}
          </p>
        </div>
        {dirty && (
          <Button variant="subtle" size="sm" icon="undo" onClick={onDiscard}>
            Descartar
          </Button>
        )}
      </div>
      <LoginForm onSuccess={onLogin} />
    </Card>
  );
}

function SendBar({
  live,
  setLive,
  dirty,
  sendState,
  onSend,
  onDiscard,
}: {
  live: boolean;
  setLive: (v: boolean) => void;
  dirty: boolean;
  sendState: SendState;
  onSend: () => void;
  onDiscard: () => void;
}) {
  const labels: Record<SendState, string> = {
    idle: "Enviar pra RAM",
    sending: "Enviando…",
    ok: "Enviado!",
    erro: "Falhou — tentar de novo",
  };
  return (
    <Card className="flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-[11rem] flex-1">
        <Toggle
          label="Ao vivo"
          description={live ? "Cada mudança vai direto pra RAM" : "Mudanças só na prévia"}
          checked={live}
          onChange={setLive}
        />
      </div>
      {dirty && !live && (
        <Button variant="subtle" size="sm" icon="undo" onClick={onDiscard}>
          Descartar
        </Button>
      )}
      <motion.div animate={sendState === "ok" ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}>
        <Button
          variant={sendState === "erro" ? "danger" : "primary"}
          icon={sendState === "ok" ? "check" : "send"}
          onClick={onSend}
          disabled={sendState === "sending"}
          className={cx(
            "min-w-[11.5rem]",
            sendState === "ok" && "bg-accent text-bg shadow-accent hover:bg-accent",
            dirty && !live && sendState === "idle" && "animate-pulse",
          )}
        >
          {labels[sendState]}
        </Button>
      </motion.div>
    </Card>
  );
}
