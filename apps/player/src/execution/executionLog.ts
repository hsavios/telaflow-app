/**
 * Registro de execução (MVP) — eventos em memória + persistência JSONL (sem Cloud).
 */

export type ExecutionLogLevel = "info" | "warn" | "error";

/** Códigos estáveis pedidos pelo produto (MVP). */
export const EXECUTION_LOG_CODES = {
  EXECUTION_STARTED: "execution_started",
  SCENE_ACTIVATED: "scene_activated",
  EXECUTION_FINISHED: "execution_finished",
  MEDIA_STARTED: "media_started",
  MEDIA_FAILED: "media_failed",
  DRAW_STARTED: "draw_started",
  DRAW_RESULT_GENERATED: "draw_result_generated",
  DRAW_RESULT_CONFIRMED: "draw_result_confirmed",
  DRAW_FAILED: "draw_failed",
  /** Comando operacional rejeitado pela política de estado (MVP). */
  COMMAND_BLOCKED: "command_blocked",
} as const;

export type ExecutionLogEntry = {
  id: string;
  at: string;
  level: ExecutionLogLevel;
  code: string;
  message: string;
};

let _seq = 0;

export function appendExecutionLog(
  prev: ExecutionLogEntry[],
  entry: Omit<ExecutionLogEntry, "id" | "at"> & { at?: string },
  max = 500,
): ExecutionLogEntry[] {
  _seq += 1;
  const row: ExecutionLogEntry = {
    id: `log_${Date.now()}_${_seq}`,
    at: entry.at ?? new Date().toISOString(),
    level: entry.level,
    code: entry.code,
    message: entry.message,
  };
  const next = [...prev, row];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** Linha JSONL: um objeto JSON por linha (append-only). */
export function toJsonlLine(entry: ExecutionLogEntry): string {
  const payload = {
    event: entry.code,
    at: entry.at,
    level: entry.level,
    message: entry.message,
    id: entry.id,
  };
  return `${JSON.stringify(payload)}\n`;
}
