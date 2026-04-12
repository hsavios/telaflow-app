import type { SceneContract } from "@telaflow/shared-contracts";

/**
 * Estado derivado da mídia da cena atual (MVP — sem playback).
 * Ver `README.md` § Runtime Visual / resolução de mídia.
 */
export type SceneMediaDerivedState =
  | "no_media_required"
  | "media_bound"
  | "media_missing_binding"
  | "media_file_missing";

const cacheKey = (workspaceRoot: string, relative: string) => `${workspaceRoot}||${relative}`;

function hasMediaId(scene: SceneContract): boolean {
  const id = scene.media_id;
  return id != null && String(id).trim() !== "";
}

/**
 * Resolve o estado a partir de `media_id`, vínculos e cache de existência de ficheiro
 * (`file_exists_under_workspace`), alinhado ao painel de vínculos.
 */
export function resolveSceneMediaState(
  scene: SceneContract,
  workspaceRoot: string | null,
  bindings: Record<string, string>,
  fileExistsCache: Map<string, boolean>,
): SceneMediaDerivedState {
  if (!hasMediaId(scene)) {
    return "no_media_required";
  }
  const mediaId = scene.media_id as string;
  const rel = bindings[mediaId];
  if (!rel || !String(rel).trim()) {
    return "media_missing_binding";
  }
  const ws = workspaceRoot?.trim() || null;
  if (!ws) {
    return "media_file_missing";
  }
  const hit = fileExistsCache.get(cacheKey(ws, rel));
  if (hit === true) return "media_bound";
  return "media_file_missing";
}

export function describeSceneMediaDerivedStatePt(s: SceneMediaDerivedState): string {
  const m: Record<SceneMediaDerivedState, string> = {
    no_media_required: "Sem mídia obrigatória nesta cena",
    media_bound: "Mídia vinculada — ficheiro encontrado no workspace",
    media_missing_binding: "Mídia referenciada — falta vínculo a um ficheiro",
    media_file_missing: "Vínculo definido — ficheiro em falta ou workspace indisponível",
  };
  return m[s];
}
