import { z } from "zod";
import { EventIdSchema, SceneIdSchema } from "./ids.js";
import { SceneTypeSchema } from "./scene-type.js";

/** Minimal Scene — PHASE_1_EXECUTION_SPEC §8 */
export const SceneContractSchema = z.object({
  scene_id: SceneIdSchema,
  event_id: EventIdSchema,
  /** Ordering within the event; uniqueness per event is enforced at persistence / export, not in this schema. */
  sort_order: z.number().int().nonnegative(),
  type: SceneTypeSchema,
  name: z.string().min(1).max(512),
  /** When false, the scene is skipped at runtime without removing it from the event definition. */
  enabled: z.boolean().default(true),
});

export type SceneContract = z.infer<typeof SceneContractSchema>;
