import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Badge, Button, Card } from "../components/ui/controls";
import { Icon } from "../components/ui/Icon";
import { useToast } from "../components/ui/Toast";
import { ApiError, achadosApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { cx } from "../lib/utils";
import type { LostItem } from "../types/achados";

type Filter = "guardados" | "devolvidos" | "todos";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "guardados", label: "No lab" },
  { value: "devolvidos", label: "Devolvidos" },
  { value: "todos", label: "Todos" },
];

const inputClass =
  "h-11 w-full min-w-0 rounded-card border border-line bg-surface-2 px-3 text-sm outline-none placeholder:text-ink-soft/70 focus:border-neon";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const dateBR = (iso: string) => iso.split("-").reverse().join("/");
const tsBR = (ts: number) => new Date(ts * 1000).toLocaleDateString("pt-BR");
const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Aba Achados e perdidos: todo mundo vê; o admin registra e dá baixa. */
export function AchadosPage() {
  const isAdmin = useAuth().isAdmin === true;
  const toast = useToast();
  const [items, setItems] = useState<LostItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>("guardados");
  const [search, setSearch] = useState("");

  const fail = (err: unknown) => toast(err instanceof ApiError ? err.message : "Algo deu errado.", "erro");

  useEffect(() => {
    achadosApi.list().then(setItems).catch(fail);
  }, []);

  const replace = (it: LostItem) => setItems((list) => list?.map((x) => (x.id === it.id ? it : x)) ?? null);

  const counts = useMemo(
    () => ({
      guardados: items?.filter((i) => !i.returned).length ?? 0,
      devolvidos: items?.filter((i) => i.returned).length ?? 0,
      todos: items?.length ?? 0,
    }),
    [items],
  );

  const visible = useMemo(() => {
    const q = normalize(search.trim());
    return (items ?? []).filter(
      (i) =>
        (filter === "todos" || i.returned === (filter === "devolvidos")) &&
        (!q || normalize(`${i.name} ${i.description} ${i.place}`).includes(q)),
    );
  }, [items, filter, search]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Achados e perdidos</h1>
        <p className="mt-1 text-sm text-ink-soft">Esqueceu algo no Maker? Veja se está aqui e fale com a equipe do laboratório.</p>
      </header>

      {isAdmin && <NewItemForm onCreated={(it) => setItems((list) => [it, ...(list ?? [])])} fail={fail} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar: garrafa, casaco, carregador…"
            aria-label="Procurar item"
            className={cx(inputClass, "pl-10")}
          />
        </div>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Filtrar itens">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cx(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
                filter === f.value ? "border-neon bg-neon/20 text-ink" : "border-line text-ink-soft hover:text-ink",
              )}
            >
              {f.label} <span className="ml-0.5 font-mono text-[10px] opacity-60">{counts[f.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {items === null ? (
        <p className="text-sm text-ink-soft">Carregando itens…</p>
      ) : visible.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <Icon name="box" size={32} className="text-neon-soft" />
          <p className="font-medium">{search ? "Nada encontrado com essa busca." : filter === "devolvidos" ? "Nenhum item devolvido ainda." : "Nenhum item guardado no momento."}</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {visible.map((it) => (
              <motion.div key={it.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                <ItemCard
                  item={it}
                  canEdit={isAdmin}
                  onChanged={replace}
                  onDeleted={() => setItems((list) => list?.filter((x) => x.id !== it.id) ?? null)}
                  fail={fail}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function NewItemForm({ onCreated, fail }: { onCreated: (it: LostItem) => void; fail: (err: unknown) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [foundOn, setFoundOn] = useState(todayISO);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const it = await achadosApi.create({ name: name.trim(), place: place.trim(), foundOn, description: description.trim() });
      onCreated(it);
      toast(`“${it.name}” registrado`, "ok");
      setName("");
      setPlace("");
      setDescription("");
      setFoundOn(todayISO());
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>
        Registrar item
      </Button>
    );
  }

  return (
    <Card className="border-neon/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Registrar item encontrado</h2>
        <Button size="sm" variant="subtle" icon="x" onClick={() => setOpen(false)}>
          Fechar
        </Button>
      </div>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="text-ink-soft">O que é *</span>
          <input autoFocus required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Garrafa azul" className={inputClass} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-ink-soft">Onde foi encontrado</span>
          <input maxLength={80} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ex.: Bancada 3" className={inputClass} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-ink-soft">Data</span>
          <input type="date" required value={foundOn} max={todayISO()} onChange={(e) => setFoundOn(e.target.value)} className={cx(inputClass, "[color-scheme:dark]")} />
        </label>
        <label className="space-y-1.5 text-sm sm:col-span-2">
          <span className="text-ink-soft">Detalhes</span>
          <textarea
            maxLength={300}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cor, marca, adesivos… o que ajudar o dono a reconhecer"
            className={cx(inputClass, "h-auto py-2.5")}
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" icon="save" disabled={busy || !name.trim()}>
            {busy ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

interface CardProps {
  item: LostItem;
  canEdit: boolean;
  onChanged: (it: LostItem) => void;
  onDeleted: () => void;
  fail: (err: unknown) => void;
}

function ItemCard({ item: it, canEdit, onChanged, onDeleted, fail }: CardProps) {
  const toast = useToast();
  const [mode, setMode] = useState<"view" | "return" | "delete">("view");
  const [returnedTo, setReturnedTo] = useState("");

  async function markReturned(e: FormEvent) {
    e.preventDefault();
    try {
      onChanged(await achadosApi.update(it.id, { returned: true, returnedTo: returnedTo.trim() }));
      toast(`“${it.name}” devolvido`, "ok");
      setMode("view");
    } catch (err) {
      fail(err);
    }
  }

  async function undoReturn() {
    try {
      onChanged(await achadosApi.update(it.id, { returned: false }));
    } catch (err) {
      fail(err);
    }
  }

  async function remove() {
    try {
      await achadosApi.remove(it.id);
      onDeleted();
      toast(`“${it.name}” excluído`, "ok");
    } catch (err) {
      fail(err);
    }
  }

  return (
    <Card className={cx("flex h-full flex-col gap-3 p-4", it.returned && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">{it.name}</h3>
        {it.returned ? <Badge tone="ok">Devolvido</Badge> : <Badge tone="neon">No lab</Badge>}
      </div>
      {it.description && <p className="text-sm text-ink-soft">{it.description}</p>}
      <div className="mt-auto space-y-1 text-xs text-ink-soft">
        <p>
          Encontrado em {dateBR(it.foundOn)}
          {it.place && <> · {it.place}</>}
        </p>
        {it.returned && it.returnedAt && (
          <p className="text-ok">
            Devolvido em {tsBR(it.returnedAt)}
            {it.returnedTo && <> para {it.returnedTo}</>}
          </p>
        )}
      </div>

      {canEdit &&
        (mode === "return" ? (
          <form onSubmit={markReturned} className="flex gap-2 border-t border-line pt-3">
            <input
              autoFocus
              maxLength={80}
              value={returnedTo}
              onChange={(e) => setReturnedTo(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setMode("view")}
              placeholder="Para quem? (opcional)"
              aria-label="Devolvido para"
              className={cx(inputClass, "h-9")}
            />
            <Button type="submit" size="sm" variant="primary" icon="check">
              OK
            </Button>
          </form>
        ) : mode === "delete" ? (
          <div className="flex items-center gap-2 border-t border-line pt-3 text-sm">
            <span className="mr-auto text-ink-soft">Excluir este item?</span>
            <Button size="sm" variant="danger" onClick={remove}>
              Sim
            </Button>
            <Button size="sm" variant="subtle" onClick={() => setMode("view")}>
              Não
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 border-t border-line pt-3">
            {it.returned ? (
              <Button size="sm" variant="subtle" icon="undo" onClick={undoReturn}>
                Voltar para o lab
              </Button>
            ) : (
              <Button size="sm" variant="ghost" icon="check" onClick={() => setMode("return")}>
                Devolvido
              </Button>
            )}
            <Button size="sm" variant="subtle" icon="trash" className="ml-auto hover:text-alert" onClick={() => setMode("delete")} aria-label="Excluir" />
          </div>
        ))}
    </Card>
  );
}
