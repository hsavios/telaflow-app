import type { SceneContract } from "@telaflow/shared-contracts";

/** Cenas ativas (`enabled`), ordenadas por `sort_order` e `scene_id` (mesmo critério do runtime). */
export function enabledScenesSorted(scenes: SceneContract[]): SceneContract[] {
  return [...scenes]
    .filter((s) => s.enabled)
    .sort((a, b) => {
      const o = a.sort_order - b.sort_order;
      return o !== 0 ? o : a.scene_id.localeCompare(b.scene_id);
    });
}
