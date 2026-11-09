import { type ReactNode } from "react";
import { useAuth } from "../../lib/auth";
import { useRealtime } from "../../lib/realtime";
import { Card } from "../ui/controls";
import { Icon } from "../ui/Icon";
import { ConnectionPill } from "./ConnectionPill";
import { LoginForm } from "./LoginForm";
import { Logo } from "./Logo";

/** Porta de entrada do painel: sem login, mostra a tela de acesso (o /face não passa por aqui). */
export function LoginGate({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  const hint = useRealtime((s) => s.info?.setupHint);

  if (isAdmin === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-soft">
        <span className="size-2.5 animate-ping rounded-full bg-neon" />
        <span className="ml-3">Verificando acesso…</span>
      </div>
    );
  }

  if (isAdmin) return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6">
        <Logo className="mx-auto mb-5 h-14" />
        <h1 className="text-center text-xl font-semibold">Entrar no painel</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">Acesse para controlar e personalizar a RAM.</p>

        {hint && (
          <div className="mt-5 rounded-card border border-neon/40 bg-neon/5 p-3 text-sm">
            <div className="mb-1.5 flex items-center gap-1.5 text-neon-soft">
              <Icon name="info" size={15} />
              <span className="font-medium">Acesso provisório</span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-xs">
              <dt className="text-ink-soft">usuário</dt>
              <dd className="select-all">{hint.user}</dd>
              <dt className="text-ink-soft">senha</dt>
              <dd className="select-all">{hint.password}</dd>
            </dl>
            <p className="mt-2 font-sans text-[11px] text-ink-soft">
              Troque a senha em <code className="text-ink">backend/.env</code> para este aviso sumir.
            </p>
          </div>
        )}

        <div className="mt-5">
          <LoginForm autoFocus />
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 border-t border-line pt-4 text-sm">
          <ConnectionPill />
          <a href="/face" className="inline-flex items-center gap-1.5 text-ink-soft hover:text-neon-soft" title="Ver a tela do robô">
            <Icon name="external" size={15} /> Ver o rosto
          </a>
        </div>
      </Card>
    </div>
  );
}
