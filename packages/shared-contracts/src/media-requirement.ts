import { z } from "zod";
import { EventIdSchema, MediaIdSchema, SceneIdSchema } from "./ids.js";
import { MediaKindSchema } from "./media-kind.js";

/**
 * MediaRequirement — manifest slot without blob (MVP; ARCHITECTURE_SPEC §6.9).
 * `scene_id` is an optional hint (primary consumer), not exclusivity.
 */
export const MediaRequirementContractSchema = z.object({
  media_id: MediaIdSchema,
  event_id: EventIdSchema,
  label: z.string().min(1).max(256),
  media_type: MediaKindSchema,
  required: z.boolean().default(false),
  scene_id: SceneIdSchema.nullish(),
  allowed_extensions_hint: z.string().max(512).nullish(),
});

export type MediaRequirementContract = z.infer<typeof MediaRequirementContractSchema>;
