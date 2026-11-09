import { cx } from "../../lib/utils";

/** Logo oficial (public/logo-ram.svg) com brilho neon por CSS. */
export function Logo({ className }: { className?: string }) {
  return <img src="/logo-ram.svg" alt="RAM" draggable={false} className={cx("logo-glow select-none", className)} />;
}
