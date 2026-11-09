import type { LostItem, LostItemInput } from "../types/achados";
import type { FaceAppearance, FaceState, Expression, Preset } from "../types/face";
import type { Cell, GameId, Hand, PptResult, VelhaLevel, VelhaResult } from "../types/games";
import { storage } from "./storage";

const TOKEN_KEY = "ram.token";

let token = storage.get(TOKEN_KEY);
const unauthorizedListeners = new Set<() => void>();

export function getToken() {
  return token;
}

export function setToken(value: string | null) {
  token = value;
  storage.set(TOKEN_KEY, value);
}

/** Avisado quando o backend recusa o token (expirou, senha trocada...). */
export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function errorMessage(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return "Alguns valores estão fora do permitido.";
  if (status === 0) return "Sem conexão com a RAM.";
  return `Erro ${status} no servidor.`;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, errorMessage(0, null));
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) unauthorizedListeners.forEach((l) => l());
    throw new ApiError(res.status, errorMessage(res.status, body));
  }
  return body as T;
}

/* ---------- Endpoints ---------- */

export const faceApi = {
  setAppearance: (appearance: FaceAppearance) =>
    api<FaceState>("/api/face/appearance", { method: "PUT", body: appearance }),
  setExpression: (expression: Expression, holdMs?: number) =>
    api<FaceState>("/api/face/expression", { method: "POST", body: { expression, holdMs } }),
  say: (text: string) => api<FaceState>("/api/face/say", { method: "POST", body: { text } }),
  clearSpeech: () => api<FaceState>("/api/face/say", { method: "DELETE" }),
};

export const presetsApi = {
  list: () => api<Preset[]>("/api/presets"),
  create: (name: string, appearance: FaceAppearance) =>
    api<Preset>("/api/presets", { method: "POST", body: { name, appearance } }),
  update: (id: number, patch: { name?: string; appearance?: FaceAppearance }) =>
    api<Preset>(`/api/presets/${id}`, { method: "PATCH", body: patch }),
  remove: (id: number) => api<void>(`/api/presets/${id}`, { method: "DELETE" }),
  apply: (id: number) => api<FaceState>(`/api/presets/${id}/apply`, { method: "POST" }),
};

export const gamesApi = {
  start: (game: GameId) => api<void>("/api/games/start", { method: "POST", body: { game } }),
  velha: (board: Cell[], level: VelhaLevel) => api<VelhaResult>("/api/games/velha", { method: "POST", body: { board, level } }),
  ppt: (choice: Hand) => api<PptResult>("/api/games/ppt", { method: "POST", body: { choice } }),
};

export const achadosApi = {
  list: () => api<LostItem[]>("/api/achados"),
  create: (item: LostItemInput) => api<LostItem>("/api/achados", { method: "POST", body: item }),
  update: (id: number, patch: Partial<LostItemInput> & { returned?: boolean; returnedTo?: string }) =>
    api<LostItem>(`/api/achados/${id}`, { method: "PATCH", body: patch }),
  remove: (id: number) => api<void>(`/api/achados/${id}`, { method: "DELETE" }),
};
