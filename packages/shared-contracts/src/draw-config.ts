import { z } from "zod";
import { DrawConfigIdSchema, EventIdSchema } from "./ids.js";

/** DrawConfig owned by the event; scenes reference optionally (EVENT_EDITOR_FEATURE_SPEC). */
export const DrawConfigContractSchema = z.object({
  draw_config_id: DrawConfigIdSchema,
  event_id: EventIdSchema,
  name: z.string().min(1).max(256),
  max_winners: z.number().int().min(1).max(999).default(1),
  notes: z.string().max(2000).nullish(),
  enabled: z.boolean().default(true),
});

export type DrawConfigContract = z.infer<typeof DrawConfigContractSchema>;
