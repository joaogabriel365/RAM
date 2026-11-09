import { useSyncExternalStore } from "react";
import type { FaceState } from "../types/face";
import type { RobotStatus, ServerInfo, Telemetry } from "../types/robot";

export type ConnectionStatus = "conectando" | "conectado" | "desconectado";

export interface RealtimeState {
  status: ConnectionStatus;
  face: FaceState | null;
  robot: RobotStatus | null;
  telemetry: Telemetry | null;
  telemetryTs: number | null;
  info: ServerInfo | null;
}

type ServerMessage =
  | {
      type: "hello";
      info: ServerInfo;
      face: FaceState;
      robot: RobotStatus;
      telemetry: { data: Telemetry | null; ts: number | null };
    }
  | { type: "face"; state: FaceState }
  | { type: "telemetry"; data: Telemetry; ts: number }
  | { type: "robot"; connected: boolean; driver: string }
  | { type: "pong" };

const PING_EVERY = 10_000;
/** Sem nenhuma mensagem por esse tempo = conexão morta (Wi-Fi caiu sem avisar). */
const DEAD_AFTER = 25_000;
const MAX_BACKOFF = 5_000;

/**
 * Uma única conexão WebSocket para o app inteiro, com reconexão automática.
 * Os componentes leem pedaços do estado com `useRealtime(s => s.algo)`.
 */
class RealtimeStore {
  state: RealtimeState = {
    status: "conectando",
    face: null,
    robot: null,
    telemetry: null,
    telemetryTs: null,
    info: null,
  };
  private listeners = new Set<() => void>();
  private ws: WebSocket | null = null;
  private attempt = 0;
  private reconnectTimer: number | undefined;
  private pingTimer: number | undefined;
  private lastMessageAt = 0;
  private started = false;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<RealtimeState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.connect();
    document.addEventListener("visibilitychange", () => {
      // celular voltou do bloqueio: tenta na hora em vez de esperar o backoff
      if (document.visibilityState === "visible" && this.state.status !== "conectado") this.reconnectNow();
    });
    window.addEventListener("online", () => this.reconnectNow());
  }

  send(message: object): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  /** Aplica um estado recebido por REST, se for mais novo que o atual. */
  applyFace(face: FaceState) {
    if (!this.state.face || face.rev >= this.state.face.rev) this.set({ face });
  }

  private connect() {
    window.clearTimeout(this.reconnectTimer);
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.lastMessageAt = Date.now();
      this.set({ status: "conectado" });
      window.clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => {
        if (Date.now() - this.lastMessageAt > DEAD_AFTER) ws.close();
        else this.send({ type: "ping" });
      }, PING_EVERY);
    };
    ws.onmessage = (event) => {
      this.lastMessageAt = Date.now();
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      this.handle(msg);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      window.clearInterval(this.pingTimer);
      this.ws = null;
      this.set({ status: "desconectado" });
      const delay = Math.min(MAX_BACKOFF, 500 * 2 ** this.attempt) + Math.random() * 300;
      this.attempt += 1;
      this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
    };
    ws.onerror = () => ws.close();
  }

  private reconnectNow() {
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return;
    this.attempt = 0;
    this.connect();
  }

  private handle(msg: ServerMessage) {
    switch (msg.type) {
      case "hello":
        this.set({
          info: msg.info,
          face: msg.face,
          robot: { connected: msg.robot.connected, driver: msg.robot.driver },
          telemetry: msg.telemetry.data,
          telemetryTs: msg.telemetry.ts,
        });
        break;
      case "face":
        this.applyFace(msg.state);
        break;
      case "telemetry":
        this.set({ telemetry: msg.data, telemetryTs: msg.ts });
        break;
      case "robot":
        this.set({ robot: { connected: msg.connected, driver: msg.driver } });
        break;
    }
  }
}

export const realtime = new RealtimeStore();

export function useRealtime<T>(selector: (s: RealtimeState) => T): T {
  return useSyncExternalStore(realtime.subscribe, () => selector(realtime.state));
}

/** URL que o QR code mostra para visitantes. */
export function visitorUrl(info: ServerInfo | null): string {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  if (!local) return location.origin + "/";
  return (info?.panelUrl ?? location.origin) + "/";
}
