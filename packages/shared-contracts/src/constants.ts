/**
 * Operational version of the Pack format (archive layout, manifest semantics). Breaking changes
 * increment this — governs Player ↔ Pack compatibility (PACK_EXPORT_FEATURE_SPEC / ARCHITECTURE_SPEC).
 */
export const PACK_VERSION = "1.0.0" as const;

/**
 * Structural contract version: shape and validation rules of Zod/JSON Schema payloads (fields, nullability).
 * May diverge from PACK_VERSION when format is stable but schemas add optional fields.
 */
export const SCHEMA_VERSION = "1.0.0" as const;

/** Version of the `EventSnapshot` aggregate document for forward-compatible export/import. */
export const SNAPSHOT_VERSION = "1.0.0" as const;
