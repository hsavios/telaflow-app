import { z } from "zod";
import { EventIdSchema, MediaIdSchema, SceneIdSchema } from "./ids.js";
import { MediaKindSchema } from "./media-kind.js";

/** Papel do ficheiro no roteiro (reduz inferência no Player). */
export const MediaUsageRoleSchema = z.enum([
  "scene_primary",
  "supporting",
  "brand_mark",
  "ambient",
]);

export type MediaUsageRole = z.infer<typeof MediaUsageRoleSchema>;

/** Sugestão de apresentação no palco (MVP). */
export const MediaPresentationSchema = z.enum(["default", "fullscreen", "contain", "background"]);

export type MediaPresentation = z.infer<typeof MediaPresentationSchema>;

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
  usage_role: MediaUsageRoleSchema.nullish(),
  presentation: MediaPresentationSchema.nullish(),
});

export type MediaRequirementContract = z.infer<typeof MediaRequirementContractSchema>;
