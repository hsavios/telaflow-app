import { z } from "zod";
import { DrawConfigIdSchema, EventIdSchema, MediaIdSchema, SceneIdSchema } from "./ids.js";
import { SceneBehaviorMvpSchema } from "./scene-behavior.js";
import { SceneTypeSchema } from "./scene-type.js";

/**
 * Scene contract — PHASE_1_EXECUTION_SPEC §8 + optional links (EVENT_EDITOR_FEATURE_SPEC).
 * `media_id` / `draw_config_id` nullish: omitted, null, or set when valid in the same event at persistence.
 */
export const SceneContractSchema = z.object({
  scene_id: SceneIdSchema,
  event_id: EventIdSchema,
  /** Ordering within the event; uniqueness per event is enforced at persistence / export, not in this schema. */
  sort_order: z.number().int().nonnegative(),
  type: SceneTypeSchema,
  name: z.string().min(1).max(512),
  /** When false, the scene is skipped at runtime without removing it from the event definition. */
  enabled: z.boolean().default(true),
  media_id: MediaIdSchema.nullish(),
  draw_config_id: DrawConfigIdSchema.nullish(),
  /** Semântica operacional opcional (Pack Authoring MVP). */
  scene_behavior: SceneBehaviorMvpSchema.nullish(),
});

export type SceneContract = z.infer<typeof SceneContractSchema>;
