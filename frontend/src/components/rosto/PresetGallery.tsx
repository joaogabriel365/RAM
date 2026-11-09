import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError, presetsApi } from "../../lib/api";
import { cx, deepEqual } from "../../lib/utils";
import { PRESET_CATEGORIES, USER_CATEGORY, type FaceAppearance, type Preset } from "../../types/face";
import { Face } from "../face/Face";
import { Button, Card, IconButton } from "../ui/controls";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";

interface Props {
  draft: FaceAppearance;
  onLoad: (preset: Preset) => void;
  /** salvar, renomear e excluir (só admin) */
  canEdit: boolean;
}

const ALL = "Todos";

export function PresetGallery({ draft, onLoad, canEdit }: Props) {
  const toast = useToast();
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const [category, setCategory] = useState(ALL);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  const fail = (err: unknown) => toast(err instanceof ApiError ? err.message : "Algo deu errado.", "erro");

  useEffect(() => {
    presetsApi.list().then(setPresets).catch(fail);
  }, []);

  const replace = (p: Preset) => setPresets((list) => list?.map((x) => (x.id === p.id ? p : x)) ?? null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { [ALL]: presets?.length ?? 0 };
    presets?.forEach((p) => (c[p.category] = (c[p.category] ?? 0) + 1));
    return c;
  }, [presets]);

  const visible = useMemo(() => {
    const order = (p: Preset) => {
      const i = PRESET_CATEGORIES.indexOf(p.category);
      return i < 0 ? PRESET_CATEGORIES.length : i;
    };
    return (presets ?? [])
      .filter((p) => category === ALL || p.category === category)
      .sort((a, b) => order(a) - order(b) || a.id - b.id);
  }, [presets, category]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const created = await presetsApi.create(name, draft);
      setPresets((list) => [...(list ?? []), created]);
      setNewName("");
      setCategory(USER_CATEGORY);
      toast(`Preset “${name}” salvo`, "ok");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <form onSubmit={save} className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={40}
            placeholder="Salvar o rosto atual como…"
            aria-label="Nome do novo preset"
            className="h-11 min-w-0 flex-1 rounded-card border border-line bg-surface-2 px-3 text-sm outline-none placeholder:text-ink-soft/70 focus:border-neon"
          />
          <Button type="submit" variant="primary" icon="save" disabled={busy || !newName.trim()}>
            Salvar
          </Button>
        </form>
      )}

      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {[ALL, ...PRESET_CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={cx(
              "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
              category === c ? "border-neon bg-neon/20 text-ink" : "border-line text-ink-soft hover:text-ink",
            )}
          >
            {c} <span className="ml-0.5 font-mono text-[10px] opacity-60">{counts[c] ?? 0}</span>
          </button>
        ))}
      </div>

      {presets === null ? (
        <p className="text-sm text-ink-soft">Carregando presets…</p>
      ) : visible.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-soft">
          {canEdit ? "Nenhum preset seu ainda. Personalize o rosto e salve com um nome acima." : "Nenhum preset nesta categoria."}
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {visible.map((p) => (
            <PresetCard
              key={p.id}
              preset={p}
              inUse={deepEqual(p.appearance, draft)}
              hovered={hovered === p.id}
              onHover={(h) => setHovered(h ? p.id : null)}
              onLoad={() => onLoad(p)}
              onChanged={replace}
              onDeleted={() => setPresets((list) => list?.filter((x) => x.id !== p.id) ?? null)}
              draft={draft}
              fail={fail}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  preset: Preset;
  inUse: boolean;
  hovered: boolean;
  onHover: (h: boolean) => void;
  onLoad: () => void;
  onChanged: (p: Preset) => void;
  onDeleted: () => void;
  draft: FaceAppearance;
  fail: (err: unknown) => void;
  canEdit: boolean;
}

function PresetCard({ preset: p, inUse, hovered, onHover, onLoad, onChanged, onDeleted, draft, fail, canEdit }: CardProps) {
  const toast = useToast();
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const [name, setName] = useState(p.name);

  async function rename(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean || clean === p.name) return setMode("view");
    try {
      onChanged(await presetsApi.update(p.id, { name: clean }));
      setMode("view");
    } catch (err) {
      fail(err);
    }
  }

  async function overwrite() {
    try {
      onChanged(await presetsApi.update(p.id, { appearance: draft }));
      toast(`“${p.name}” atualizado com o rosto atual`, "ok");
    } catch (err) {
      fail(err);
    }
  }

  async function remove() {
    try {
      await presetsApi.remove(p.id);
      onDeleted();
      toast(`Preset “${p.name}” excluído`, "ok");
    } catch (err) {
      fail(err);
    }
  }

  return (
    <div
      className={cx(
        "group flex flex-col overflow-hidden rounded-card border bg-surface/90 transition-all",
        inUse ? "border-neon shadow-neon" : "border-line hover:border-neon/60",
      )}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
    >
      <button type="button" onClick={onLoad} className="relative block w-full text-left" aria-label={`Carregar ${p.name}`}>
        <Face
          still
          appearance={p.appearance}
          expression={hovered ? "feliz" : p.appearance.behavior.mood}
          className="pointer-events-none aspect-[16/10] w-full"
        />
        {inUse && (
          <span
            className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-neon text-white shadow-neon"
            title="Em uso"
          >
            <Icon name="check" size={14} />
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        {mode === "rename" ? (
          <form onSubmit={rename} className="flex items-center gap-1">
            <input
              autoFocus
              value={name}
              maxLength={40}
              aria-label="Novo nome"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setMode("view")}
              className="h-8 min-w-0 flex-1 rounded-md border border-neon bg-surface px-2 text-sm outline-none"
            />
            <IconButton icon="check" label="Salvar nome" type="submit" className="size-8" />
          </form>
        ) : mode === "delete" ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="mr-auto text-ink-soft">Excluir?</span>
            <Button size="sm" variant="danger" className="h-8 px-2.5" onClick={remove}>
              Sim
            </Button>
            <Button size="sm" variant="subtle" className="h-8 px-2" onClick={() => setMode("view")}>
              Não
            </Button>
          </div>
        ) : (
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{p.name}</div>
              {p.description && <p className="line-clamp-2 text-[11px] leading-snug text-ink-soft">{p.description}</p>}
            </div>
            {p.factory ? (
              <Icon name="lock" size={13} className="mt-1 shrink-0 text-ink-soft/60" aria-label="Preset de fábrica" />
            ) : (
              canEdit && <div className="-mr-1 flex shrink-0">
                <IconButton icon="pencil" label="Renomear" className="size-7" onClick={() => setMode("rename")} />
                <IconButton icon="save" label="Salvar o rosto atual neste preset" className="size-7" onClick={overwrite} disabled={inUse} />
                <IconButton icon="trash" label="Excluir" className="size-7 hover:text-alert" onClick={() => setMode("delete")} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
