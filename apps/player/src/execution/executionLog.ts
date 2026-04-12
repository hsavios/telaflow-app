/**
 * Registo mínimo de execução / transições (MVP) — memória em sessão, sem Cloud.
 */

export type ExecutionLogLevel = "info" | "warn" | "error";

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
  max = 300,
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
