import type { CloudDrawConfig, CloudMediaRequirement, CloudScene } from "@/lib/cloud-api";
import type { SceneType } from "@/lib/scene-types";
import { SCENE_TYPES } from "@/lib/scene-types";

/** Cenas habilitadas, na ordem do roteiro (como no Player). */
export function orderedPreviewScenes(scenes: CloudScene[]): CloudScene[] {
  return [...scenes]
    .filter((s) => s.enabled)
    .sort((a, b) => a.sort_order - b.sort_order || a.scene_id.localeCompare(b.scene_id));
}

export function isSceneType(t: string): t is SceneType {
  return (SCENE_TYPES as readonly string[]).includes(t);
}

export function mediaRequirementForScene(
  mediaRequirements: CloudMediaRequirement[],
  scene: CloudScene,
): CloudMediaRequirement | null {
  const id = scene.media_id?.trim();
  if (!id) return null;
  return mediaRequirements.find((m) => m.media_id === id) ?? null;
}

export function drawConfigForScene(
  drawConfigs: CloudDrawConfig[],
  scene: CloudScene,
): CloudDrawConfig | null {
  const id = scene.draw_config_id?.trim();
  if (!id) return null;
  return drawConfigs.find((d) => d.draw_config_id === id) ?? null;
}

/** Igual à ideia do Player: intervalo explícito ou 1–1000. */
export function effectiveNumberRangePreview(dc: CloudDrawConfig): {
  min: number;
  max: number;
} {
  const nr = dc.number_range;
  if (
    nr &&
    typeof nr.min === "number" &&
    typeof nr.max === "number" &&
    nr.max >= nr.min
  ) {
    return { min: nr.min, max: nr.max };
  }
  return { min: 1, max: 1000 };
}
