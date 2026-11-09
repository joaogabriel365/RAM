import { AnimatePresence, motion } from "framer-motion";
import type { Speech } from "../../types/face";
import { useTypewriter } from "./hooks";

/** Balão de fala do rosto. Usa unidades do container (cq*) para escalar junto com o rosto. */
export function SpeechBubble({ speech, instant }: { speech: Speech | null; instant: boolean }) {
  return <AnimatePresence>{speech && <Bubble key={speech.id} speech={speech} instant={instant} />}</AnimatePresence>;
}

function Bubble({ speech, instant }: { speech: Speech; instant: boolean }) {
  const { shown, done } = useTypewriter(speech.text, speech.id, instant);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: instant ? 0 : 0.25 }}
      className="absolute inset-x-0 mx-auto"
      // estreito o bastante para não cobrir o QR code do canto
      style={{ bottom: "6cqh", width: "min(70cqw, 130cqh)" }}
      aria-live="polite"
    >
      <div
        className="absolute left-1/2 border-neon bg-surface"
        style={{
          top: "-1.6cqmin",
          width: "3.2cqmin",
          height: "3.2cqmin",
          transform: "translateX(-50%) rotate(45deg)",
          borderLeftWidth: "0.35cqmin",
          borderTopWidth: "0.35cqmin",
        }}
      />
      <div
        className="relative border-neon bg-surface/95 text-ink"
        style={{
          borderWidth: "0.35cqmin",
          borderRadius: "2.6cqmin",
          padding: "2.4cqmin 3.4cqmin",
          fontSize: "4.8cqmin",
          lineHeight: 1.3,
          fontFamily: "var(--font-display)",
          boxShadow: "0 0 3cqmin rgb(176 38 255 / 0.45)",
        }}
      >
        {shown}
        {!done && (
          <span className="ram-caret text-neon-soft" aria-hidden>
            ▍
          </span>
        )}
      </div>
    </motion.div>
  );
}
