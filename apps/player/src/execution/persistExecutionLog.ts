import { invoke } from "@tauri-apps/api/core";

/**
 * Anexa uma linha JSONL em `{basePath}/.telaflow/execution-log.jsonl`.
 * `basePath` = workspace ou pasta do pack (fallback).
 */
export async function persistExecutionJsonl(basePath: string, line: string): Promise<void> {
  const trimmed = basePath.trim();
  if (!trimmed) return;
  try {
    await invoke("append_execution_jsonl", { basePath: trimmed, line });
  } catch (e) {
    console.error("[execution-log] falha ao persistir:", e);
  }
}
