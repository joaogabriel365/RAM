import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cx } from "../../lib/utils";
import { Icon } from "./Icon";

type Tone = "ok" | "erro" | "info";
interface ToastItem {
  id: number;
  tone: Tone;
  text: string;
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {});

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone: Tone = "info") => {
    const id = nextId++;
    setItems((list) => [...list.slice(-2), { id, tone, text }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), tone === "erro" ? 5000 : 2800);
  }, []);
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={cx(
                "flex max-w-md items-center gap-2 rounded-card border bg-surface px-4 py-2.5 text-sm shadow-lg",
                t.tone === "ok" && "border-ok/60 text-ink",
                t.tone === "erro" && "border-alert text-ink shadow-alert",
                t.tone === "info" && "border-neon/60 text-ink",
              )}
            >
              <Icon
                name={t.tone === "erro" ? "x" : t.tone === "ok" ? "check" : "info"}
                size={16}
                className={t.tone === "erro" ? "text-alert" : t.tone === "ok" ? "text-ok" : "text-neon-soft"}
              />
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
