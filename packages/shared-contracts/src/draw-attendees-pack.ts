import { z } from "zod";
import { EventIdSchema } from "./ids.js";

export const DRAW_ATTENDEES_PACK_VERSION = "draw_attendees_pack.v1" as const;

export const DrawAttendeeEntrySchema = z.object({
  registration_id: z.string().min(1).max(64),
  display_name: z.string().max(256).nullish(),
  assigned_number: z.number().int().nullish(),
});

export const DrawAttendeesPackFileSchema = z.object({
  schema_version: z.literal(DRAW_ATTENDEES_PACK_VERSION),
  event_id: EventIdSchema,
  entries_by_draw_config_id: z.record(z.string(), z.array(DrawAttendeeEntrySchema)),
});

export type DrawAttendeesPackFile = z.infer<typeof DrawAttendeesPackFileSchema>;
