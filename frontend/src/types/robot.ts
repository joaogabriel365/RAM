/** Telemetria enviada pelo ESP32 (repassada pelo backend). */
export interface Telemetry {
  /** tensão da bateria em volts */
  bat: number;
  /** distâncias em cm: frente, esquerda, direita */
  dist: { f: number; l: number; r: number };
}

export interface RobotStatus {
  connected: boolean;
  driver: "mock" | "serial" | string;
}

export interface ServerInfo {
  name: string;
  version: string;
  mock: boolean;
  panelUrl: string;
  startedAt: number;
  /** Credenciais provisórias mostradas no login (só enquanto a senha padrão está em uso). */
  setupHint: { user: string; password: string } | null;
}
