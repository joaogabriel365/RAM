import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ApiError, faceApi } from "../../lib/api";
import { realtime, useRealtime } from "../../lib/realtime";
import { storage } from "../../lib/storage";
import { deepEqual } from "../../lib/utils";
import type { FaceAppearance } from "../../types/face";
import { useToast } from "../ui/Toast";

export type SendState = "idle" | "sending" | "ok" | "erro";

const LIVE_KEY = "ram.rosto.live";
/** Ignora o "eco" do próprio envio que chega pelo WebSocket logo depois de uma edição. */
const ECHO_WINDOW = 1000;
/** Edições mais próximas que isso (arrastar um slider) viram um passo só no histórico. */
const HISTORY_MERGE_MS = 600;
const HISTORY_LIMIT = 80;

/**
 * Rascunho da aparência editado no painel.
 * - Ao vivo: cada mudança vai para o backend (envios encadeados, sempre o valor mais novo).
 * - Sem ao vivo: edita só a prévia até clicar em "Enviar pra RAM".
 * - Histórico com desfazer/refazer.
 * - Sem `canSend` (visitante sem login) nunca envia: o "ao vivo" fica desligado.
 */
export function useFaceDraft(canSend: boolean) {
  const server = useRealtime((s) => s.face?.appearance ?? null);
  const toast = useToast();

  const [liveSetting, setLiveState] = useState(() => storage.get(LIVE_KEY) !== "0");
  const live = liveSetting && canSend;
  const [draft, setDraftState] = useState<FaceAppearance | null>(server);
  const [dirty, setDirty] = useState(false);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const draftRef = useRef(draft);
  const liveRef = useRef(live);
  liveRef.current = live;
  const lastEdit = useRef(0);
  const pending = useRef<FaceAppearance | null>(null);
  const inflight = useRef(false);
  const okTimer = useRef<number | undefined>(undefined);
  const past = useRef<FaceAppearance[]>([]);
  const future = useRef<FaceAppearance[]>([]);
  const lastPush = useRef(0);

  const setDraft = (value: FaceAppearance) => {
    draftRef.current = value;
    setDraftState(value);
  };

  // Mudanças vindas do backend (outro painel, preset aplicado...) entram no rascunho
  // a menos que haja edição local não enviada.
  useEffect(() => {
    if (!server) return;
    if (!draftRef.current) return setDraft(server);
    if (live && Date.now() - lastEdit.current < ECHO_WINDOW) return;
    if (!dirty) setDraft(server);
  }, [server, live, dirty]);

  useEffect(() => () => window.clearTimeout(okTimer.current), []);

  const flush = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      while (pending.current) {
        const next = pending.current;
        pending.current = null;
        try {
          realtime.applyFace(await faceApi.setAppearance(next));
        } catch (err) {
          setDirty(true);
          toast(err instanceof ApiError ? err.message : "Não foi possível enviar.", "erro");
          break;
        }
      }
    } finally {
      inflight.current = false;
    }
  }, [toast]);

  /** Coloca um valor no rascunho e envia (ao vivo) ou marca como pendente. */
  const commit = useCallback(
    (next: FaceAppearance) => {
      setDraft(next);
      lastEdit.current = Date.now();
      if (liveRef.current) {
        pending.current = next;
        void flush();
      } else {
        setDirty(true);
      }
    },
    [flush],
  );

  const update = useCallback(
    (fn: (a: FaceAppearance) => FaceAppearance) => {
      const current = draftRef.current;
      if (!current) return;
      const next = fn(current);
      if (deepEqual(next, current)) return;
      const now = Date.now();
      if (now - lastPush.current > HISTORY_MERGE_MS) {
        past.current.push(current);
        if (past.current.length > HISTORY_LIMIT) past.current.shift();
      }
      lastPush.current = now;
      future.current = [];
      commit(next);
      rerender();
    },
    [commit],
  );

  /** Altera um campo: set("eyes", "color", "#fff"). */
  const set = useCallback(
    <S extends keyof FaceAppearance, K extends keyof FaceAppearance[S]>(section: S, key: K, value: FaceAppearance[S][K]) =>
      update((a) => ({ ...a, [section]: { ...a[section], [key]: value } })),
    [update],
  );

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous || !draftRef.current) return;
    future.current.push(draftRef.current);
    lastPush.current = 0;
    commit(previous);
    rerender();
  }, [commit]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !draftRef.current) return;
    past.current.push(draftRef.current);
    lastPush.current = 0;
    commit(next);
    rerender();
  }, [commit]);

  const sendNow = useCallback(async () => {
    const current = draftRef.current;
    if (!current) return;
    window.clearTimeout(okTimer.current);
    setSendState("sending");
    try {
      realtime.applyFace(await faceApi.setAppearance(current));
      setDirty(false);
      setSendState("ok");
      okTimer.current = window.setTimeout(() => setSendState("idle"), 1800);
    } catch (err) {
      setSendState("erro");
      toast(err instanceof ApiError ? err.message : "Não foi possível enviar.", "erro");
    }
  }, [toast]);

  const discard = useCallback(() => {
    const s = realtime.state.face?.appearance;
    if (s) setDraft(s);
    setDirty(false);
  }, []);

  const setLive = useCallback(
    (value: boolean) => {
      liveRef.current = value && canSend;
      setLiveState(value);
      storage.set(LIVE_KEY, value ? "1" : "0");
      if (liveRef.current && dirty && draftRef.current) {
        pending.current = draftRef.current;
        setDirty(false);
        void flush();
      }
    },
    [canSend, dirty, flush],
  );

  return {
    draft,
    dirty,
    live,
    setLive,
    update,
    set,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    sendNow,
    sendState,
    discard,
  };
}

export type FaceDraft = ReturnType<typeof useFaceDraft>;
