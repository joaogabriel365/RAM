import { useRef, useState } from "react";
import { HARMONIES, makePalette, type Harmony } from "../../lib/color";
import { applyPalette, exportAppearance, importAppearance, randomAppearance } from "../../lib/faceTools";
import { cx } from "../../lib/utils";
import { DEFAULT_APPEARANCE } from "../../types/face";
import { Button, Card, ColorField, IconButton, Segmented, Toggle } from "../ui/controls";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";
import type { FaceDraft } from "./useFaceDraft";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

/** Desfazer/refazer, aleatório, harmonia de cores, importar/exportar e restaurar. */
export function EditorToolbar({ draft }: { draft: FaceDraft }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [harmonyOpen, setHarmonyOpen] = useState(false);
  const appearance = draft.draft!;

  async function onImport(file: File | undefined) {
    if (!file) return;
    try {
      const imported = await importAppearance(file);
      draft.update(() => imported);
      toast("Rosto importado", "ok");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Arquivo inválido.", "erro");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <Card className="no-scrollbar flex items-center gap-0.5 overflow-x-auto p-1.5">
        <IconButton icon="undo" label={`Desfazer (${mod}+Z)`} onClick={draft.undo} disabled={!draft.canUndo} />
        <IconButton icon="redo" label={`Refazer (${mod}+Shift+Z)`} onClick={draft.redo} disabled={!draft.canRedo} />
        <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden />
        <Button size="sm" variant="subtle" icon="dice" onClick={() => draft.update(randomAppearance)} title="Surpreenda-me: um rosto aleatório com cores que combinam">
          Aleatório
        </Button>
        <Button
          size="sm"
          variant="subtle"
          icon="palette"
          onClick={() => setHarmonyOpen((o) => !o)}
          aria-expanded={harmonyOpen}
          className={cx(harmonyOpen && "bg-surface-2 text-ink")}
        >
          Harmonia
        </Button>
        <span className="ml-auto" />
        <IconButton icon="download" label="Exportar rosto (.json)" onClick={() => exportAppearance(appearance)} />
        <IconButton icon="upload" label="Importar rosto (.json)" onClick={() => fileRef.current?.click()} />
        <IconButton icon="reset" label="Restaurar o Padrão RAM" onClick={() => draft.update(() => DEFAULT_APPEARANCE)} />
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => onImport(e.target.files?.[0])}
        />
      </Card>
      {harmonyOpen && <HarmonyPanel draft={draft} onClose={() => setHarmonyOpen(false)} />}
    </div>
  );
}

const PALETTE_LABELS: [keyof ReturnType<typeof makePalette>, string][] = [
  ["eyes", "Olhos"],
  ["eyes2", "Degradê"],
  ["pupil", "Pupila"],
  ["mouth", "Boca"],
  ["accent", "Acessórios"],
  ["bg2", "Fundo"],
];

function HarmonyPanel({ draft, onClose }: { draft: FaceDraft; onClose: () => void }) {
  const appearance = draft.draft!;
  const [base, setBase] = useState(appearance.eyes.color);
  const [harmony, setHarmony] = useState<Harmony>("analoga");
  const [withBackground, setWithBackground] = useState(true);
  const palette = makePalette(base, harmony);

  return (
    <Card className="space-y-4 border-neon/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <Icon name="palette" size={18} className="text-neon-soft" /> Harmonia de cores
        </h3>
        <IconButton icon="x" label="Fechar" onClick={onClose} />
      </div>
      <ColorField label="Cor base" value={base} onChange={setBase} />
      <Segmented label="Tipo de harmonia" value={harmony} onChange={setHarmony} options={HARMONIES} columns={5} />
      <div className="grid grid-cols-6 gap-1.5">
        {PALETTE_LABELS.map(([key, label]) => (
          <div key={key} className="space-y-1 text-center">
            <div className="h-10 rounded-md border border-line" style={{ background: palette[key], boxShadow: `0 0 10px ${palette[key]}55` }} />
            <span className="block truncate text-[10px] text-ink-soft">{label}</span>
          </div>
        ))}
      </div>
      <Toggle label="Incluir o fundo" checked={withBackground} onChange={setWithBackground} />
      <Button variant="primary" icon="check" className="w-full" onClick={() => draft.update((a) => applyPalette(a, palette, withBackground))}>
        Aplicar paleta
      </Button>
    </Card>
  );
}
