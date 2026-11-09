import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { NAV } from "../../lib/nav";
import { cx } from "../../lib/utils";
import { Icon } from "../ui/Icon";
import { ConnectionPill, DisconnectedBanner } from "./ConnectionPill";
import { LoginGate } from "./LoginGate";
import { Logo } from "./Logo";

/** Barra do topo com as abas (no celular, as abas ficam numa barra embaixo). */
export function PanelLayout() {
  return (
    <LoginGate>
      <div className="min-h-dvh">
      {/* altura de 53px: a prévia do celular gruda logo abaixo (RostoPage) */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 md:px-8">
          <Link to="/" aria-label="Início" className="shrink-0">
            <Logo className="h-8" />
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-line bg-surface/70 p-0.5 md:flex" aria-label="Abas">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cx(
                    "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-all",
                    isActive ? "bg-neon text-white shadow-neon" : "text-ink-soft hover:bg-surface-2 hover:text-ink",
                  )
                }
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <span className="ml-auto hidden xl:inline-flex">
            <ConnectionPill />
          </span>
          <span className="ml-auto inline-flex xl:hidden">
            <ConnectionPill compact />
          </span>
          {/* mesma guia; o /face mostra um "Voltar" quando chega por aqui (no quiosque não aparece) */}
          <Link
            to="/face"
            state={{ fromPanel: true }}
            className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-neon-soft"
            title="Ver a tela do robô"
          >
            <Icon name="external" size={17} /> <span className="hidden xl:inline">Ver o rosto</span>
          </Link>
          <AccountMenu />
        </div>
        <DisconnectedBanner />
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-16">
        <Outlet />
      </main>

      {/* Abas do celular */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-surface/95 backdrop-blur md:hidden"
        style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))`, paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Abas"
      >
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cx("flex flex-col items-center gap-1 py-2.5 text-[11px]", isActive ? "text-neon-soft" : "text-ink-soft")
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} size={22} className={isActive ? "drop-shadow-[0_0_6px_var(--color-neon)]" : ""} />
                {item.short}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      </div>
    </LoginGate>
  );
}

/** Dentro do painel o acesso já passou pela porta de entrada, então aqui é só sair. */
function AccountMenu() {
  const { logout } = useAuth();
  return (
    <button type="button" onClick={logout} className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink" title="Sair do painel">
      <Icon name="logout" size={18} />
      <span className="hidden xl:inline">Sair</span>
    </button>
  );
}
