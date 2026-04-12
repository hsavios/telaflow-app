/**
 * Invocações Tauri — SQLite local (`.telaflow/telaflow-player.db`) para exclusões e retomada.
 */

import { invoke } from "@tauri-apps/api/core";

import type { PlayerActiveSession } from "../pack/playerPackState.js";

export function basePathParaEstadoLocal(s: PlayerActiveSession): string {
  return (s.workspaceRoot && s.workspaceRoot.trim()) || s.packRoot;
}

export async function drawExclusionsLoad(
  basePath: string,
  exportId: string,
): Promise<Array<{ resetKey: string; number: number }>> {
  const rows = await invoke<Array<{ resetKey: string; number: number }>>("draw_exclusions_list", {
    basePath,
    exportId,
  });
  return Array.isArray(rows) ? rows : [];
}

export async function drawExclusionRecord(
  basePath: string,
  exportId: string,
  resetKey: string,
  number: number,
): Promise<void> {
  await invoke("draw_exclusion_record", {
    basePath,
    exportId,
    resetKey,
    number,
  });
}

export async function sessionCheckpointLoad(
  basePath: string,
  exportId: string,
  packRoot: string,
): Promise<number | null> {
  const v = await invoke<number | null>("session_checkpoint_load", {
    basePath,
    exportId,
    packRoot,
  });
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function sessionCheckpointSave(
  basePath: string,
  exportId: string,
  packRoot: string,
  sceneIndex: number,
): Promise<void> {
  await invoke("session_checkpoint_save", {
    basePath,
    exportId,
    packRoot,
    sceneIndex,
  });
}

export async function sessionCheckpointClear(
  basePath: string,
  exportId: string,
  packRoot: string,
): Promise<void> {
  await invoke("session_checkpoint_clear", {
    basePath,
    exportId,
    packRoot,
  });
}
