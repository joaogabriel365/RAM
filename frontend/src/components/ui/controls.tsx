import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "../../lib/utils";
import { Icon, type IconName } from "./Icon";

/* ---------- Botão ---------- */

type Variant = "primary" | "ghost" | "subtle" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-neon text-white shadow-neon hover:shadow-neon-strong hover:bg-[#bd45ff] active:scale-[0.98] disabled:bg-line disabled:text-ink-soft disabled:shadow-none",
  ghost: "border border-line text-ink hover:border-neon hover:text-neon-soft active:scale-[0.98]",
  subtle: "text-ink-soft hover:bg-surface-2 hover:text-ink",
  danger: "bg-alert text-white shadow-alert hover:brightness-110 active:scale-[0.98]",
};

export function Button({
  variant = "ghost",
  icon,
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-card font-medium transition-all duration-150 disabled:cursor-not-allowed",
        size === "sm" ? "h-9 px-2.5 text-sm" : "h-11 px-4",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cx(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

/* ---------- Cartões e seções ---------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-card border border-line bg-surface/90 backdrop-blur-sm", className)}>{children}</div>;
}

export function Section({
  title,
  icon,
  defaultOpen = true,
  aside,
  children,
}: {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <Card>
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
        >
          {icon && <span className="text-neon-soft">{icon}</span>}
          <h3 className="flex-1 text-base font-semibold tracking-tight">{title}</h3>
          <span className={cx("text-ink-soft transition-transform", open ? "rotate-180" : "")} aria-hidden>
            ▾
          </span>
        </button>
        {aside}
      </div>
      {open && (
        <div id={id} className="space-y-5 border-t border-line px-4 py-4">
          {children}
        </div>
      )}
    </Card>
  );
}

export function Field({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-ink-soft">{label}</span>
        {value !== undefined && <span className="font-mono text-xs text-neon-soft">{value}</span>}
      </div>
      {children}
    </div>
  );
}

/* ---------- Controles ---------- */

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  format = (v) => v.toFixed(2),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <Field label={label} value={format(value)}>
      <input
        type="range"
        className="ram-range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ["--fill" as string]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-sm">{label}</span>
        {description && <span className="block text-xs text-ink-soft">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
          checked ? "border-neon bg-neon/40 shadow-neon" : "border-line bg-surface-2",
        )}
      >
        <span
          className={cx(
            "absolute top-1/2 size-5 -translate-y-1/2 rounded-full transition-all",
            checked ? "left-6 bg-white" : "left-1 bg-ink-soft",
          )}
        />
      </button>
    </label>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  columns,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  columns?: number;
}) {
  return (
    <Field label={label}>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns ?? Math.min(options.length, 3)}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cx(
                "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs transition-all",
                active
                  ? "border-neon bg-neon/15 text-ink shadow-neon"
                  : "border-line bg-surface-2/60 text-ink-soft hover:border-neon/60 hover:text-ink",
              )}
            >
              {o.icon}
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}

const SWATCHES = ["#B026FF", "#D58CFF", "#22D3EE", "#ED145B", "#FF7A00", "#7CFF3B", "#FFE14D", "#F5E9FF", "#FFFFFF", "#07060B"];

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  const [editing, setEditing] = useState(false);
  const shown = editing ? text : value.toUpperCase();
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <label
          className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-line"
          style={{ background: value, boxShadow: `0 0 14px ${value}66` }}
          title="Escolher cor"
        >
          <input
            type="color"
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <input
          type="text"
          aria-label={`${label} (hex)`}
          value={shown}
          maxLength={7}
          onFocus={() => {
            setText(value.toUpperCase());
            setEditing(true);
          }}
          onBlur={() => setEditing(false)}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            setText(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toUpperCase());
          }}
          className="h-11 w-24 rounded-lg border border-line bg-surface-2 px-2 font-mono text-sm uppercase text-ink outline-none focus:border-neon"
        />
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              aria-label={`Usar ${c}`}
              onClick={() => onChange(c)}
              className={cx(
                "size-6 rounded-md border transition-transform hover:scale-110",
                c.toUpperCase() === value.toUpperCase() ? "border-white" : "border-line",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
    </Field>
  );
}

/** Abas horizontais (roláveis no celular). */
export function Tabs<T extends string>({
  value,
  tabs,
  onChange,
  label,
}: {
  value: T;
  tabs: { value: T; label: string; icon?: IconName }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cx(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-all",
              active ? "border-neon bg-neon/20 text-ink shadow-neon" : "border-line bg-surface/80 text-ink-soft hover:border-neon/60 hover:text-ink",
            )}
          >
            {t.icon && <Icon name={t.icon} size={16} />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Subtítulo de um grupo de controles dentro de um painel. */
export function Group({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-1.5">
        <h4 className="font-mono text-[11px] tracking-[0.14em] text-neon-soft uppercase">{title}</h4>
        {aside}
      </div>
      {children}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "ok" | "warn" | "neon"; children: ReactNode }) {
  const tones = {
    neutral: "border-line text-ink-soft",
    ok: "border-ok/50 text-ok",
    warn: "border-alert/60 text-alert",
    neon: "border-neon/60 text-neon-soft",
  };
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}
