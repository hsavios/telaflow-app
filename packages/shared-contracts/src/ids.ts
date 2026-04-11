import { z } from "zod";

const opaqueIdBase = z
  .string()
  .min(12)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "only alphanumeric, underscore, hyphen");

/**
 * Domain ids: opaque, stable strings (no UUID/ULID fixed yet). Allowed charset and length bounds
 * reject structural noise; uniqueness stays at persistence / export.
 */
function idSchema<T extends string>(brand: T) {
  return opaqueIdBase.brand(brand);
}

export const OrganizationIdSchema = idSchema("OrganizationId");
export type OrganizationId = z.infer<typeof OrganizationIdSchema>;

export const EventIdSchema = idSchema("EventId");
export type EventId = z.infer<typeof EventIdSchema>;

export const SceneIdSchema = idSchema("SceneId");
export type SceneId = z.infer<typeof SceneIdSchema>;

/** Stable slot id for media manifest / binding (Cloud + Pack). */
export const MediaIdSchema = idSchema("MediaId");
export type MediaId = z.infer<typeof MediaIdSchema>;

/** Draw configuration id (event-scoped). */
export const DrawConfigIdSchema = idSchema("DrawConfigId");
export type DrawConfigId = z.infer<typeof DrawConfigIdSchema>;

export const ExportIdSchema = idSchema("ExportId");
export type ExportId = z.infer<typeof ExportIdSchema>;

/** Logical identity of a Pack (stable across revisions); distinct from `export_id` (each export run). */
export const PackIdSchema = idSchema("PackId");
export type PackId = z.infer<typeof PackIdSchema>;

export const LicenseIdSchema = idSchema("LicenseId");
export type LicenseId = z.infer<typeof LicenseIdSchema>;
