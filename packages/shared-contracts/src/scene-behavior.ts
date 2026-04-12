import { z } from "zod";
import { SceneTypeSchema } from "./scene-type.js";

/**
 * Modo operacional sugerido para o palco (Player pode aplicar quando presente;
 * senão continua a inferir a partir do `type` da scene).
 */
export const SceneBehaviorModeSchema = z.enum([
  "standard",
  "draw_operator_confirm",
  "placard",
  "transition",
]);

export type SceneBehaviorMode = z.infer<typeof SceneBehaviorModeSchema>;

/** Semântica opcional por scene — enxuta, sem dezenas de flags. */
export const SceneBehaviorMvpSchema = z.object({
  mode: SceneBehaviorModeSchema,
});

export type SceneBehaviorMvp = z.infer<typeof SceneBehaviorMvpSchema>;

/**
 * Preset por tipo de scene em branding: comportamento padrão quando a scene
 * não define `scene_behavior` próprio.
 */
export const SceneTypePresetMvpSchema = z.object({
  default_behavior_mode: SceneBehaviorModeSchema.optional(),
});

export type SceneTypePresetMvp = z.infer<typeof SceneTypePresetMvpSchema>;

/** Mapa opcional: uma entrada por `SceneType` (todas opcionais). */
export const BrandingSceneTypePresetsMvpSchema = z.object({
  opening: SceneTypePresetMvpSchema.optional(),
  institutional: SceneTypePresetMvpSchema.optional(),
  sponsor: SceneTypePresetMvpSchema.optional(),
  draw: SceneTypePresetMvpSchema.optional(),
  break: SceneTypePresetMvpSchema.optional(),
  closing: SceneTypePresetMvpSchema.optional(),
});

export type BrandingSceneTypePresetsMvp = z.infer<typeof BrandingSceneTypePresetsMvpSchema>;

/** Garante que só chaves válidas de tipo de scene existam no objeto (útil em testes). */
export const sceneTypesForPresets = SceneTypeSchema.options;
