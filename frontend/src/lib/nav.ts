import type { IconName } from "../components/ui/Icon";

export interface NavItem {
  to: string;
  label: string;
  /** rótulo curto da barra inferior do celular */
  short: string;
  icon: IconName;
}

/** Abas do painel (topo no computador, barra inferior no celular). */
export const NAV: NavItem[] = [
  { to: "/", label: "Personalizar", short: "Rosto", icon: "face" },
  { to: "/jogos", label: "Mini-jogos", short: "Jogos", icon: "gamepad" },
  { to: "/achados", label: "Achados e perdidos", short: "Achados", icon: "box" },
];
