import { z } from "zod";
import { PACK_VERSION, SCHEMA_VERSION } from "./constants.js";
import {
  EventIdSchema,
  ExportIdSchema,
  OrganizationIdSchema,
  PackIdSchema,
} from "./ids.js";

/**
 * pack.json root — PACK_EXPORT_FEATURE_SPEC §7.2 (minimal subset for Phase 1 skeleton).
 * generated_at: ISO 8601 UTC string.
 * app_min_player: minimum Player app version required to consume this pack (semver string per product spec).
 * pack_id: stable logical pack identity; export_id: identity of this specific export artifact.
 */
export const PackMetadataSchema = z.object({
  pack_version: z.literal(PACK_VERSION),
  schema_version: z.literal(SCHEMA_VERSION),
  app_min_player: z.string().min(1),
  pack_id: PackIdSchema,
  export_id: ExportIdSchema,
  event_id: EventIdSchema,
  organization_id: OrganizationIdSchema,
  generated_at: z.string().datetime(),
});

export type PackMetadata = z.infer<typeof PackMetadataSchema>;
