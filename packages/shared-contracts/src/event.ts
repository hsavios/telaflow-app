import { z } from "zod";
import { EventIdSchema, OrganizationIdSchema } from "./ids.js";

/**
 * Minimal persisted / exportable Event — PHASE_1_EXECUTION_SPEC §7.
 * Future extension (not in this contract yet): optional `created_at` / `updated_at` (ISO 8601) for audit and sync.
 */
export const EventContractSchema = z.object({
  event_id: EventIdSchema,
  organization_id: OrganizationIdSchema,
  name: z.string().min(1).max(512),
});

export type EventContract = z.infer<typeof EventContractSchema>;
