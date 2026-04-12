import { z } from "zod";
import { DrawConfigContractSchema } from "./draw-config.js";
import { EventIdSchema, ExportIdSchema, OrganizationIdSchema } from "./ids.js";
import { MediaRequirementContractSchema } from "./media-requirement.js";
import { SceneContractSchema } from "./scene.js";

/** manifest.json — ponto de entrada do pack (export direto MVP, sem ZIP). */
export const PACK_MANIFEST_MVP_VERSION = "pack_manifest.v1" as const;

export const PackManifestArtifactEntrySchema = z.object({
  path: z.string().min(1),
  role: z.enum([
    "event_snapshot",
    "draw_configs",
    "media_manifest",
    "branding",
    "license",
  ]),
});

export const PackManifestMvpSchema = z.object({
  schema_version: z.literal(PACK_MANIFEST_MVP_VERSION),
  pack_format: z.literal("telaflow_direct_export_mvp"),
  export_id: ExportIdSchema,
  generated_at: z.string().min(10),
  event_id: EventIdSchema,
  organization_id: OrganizationIdSchema,
  artifacts: z.array(PackManifestArtifactEntrySchema).min(1),
  gate: z.object({
    export_readiness_schema: z.literal("export_readiness.v1"),
  }),
});

export type PackManifestMvp = z.infer<typeof PackManifestMvpSchema>;

/** event.json — snapshot do evento + scenes ordenadas. */
export const EVENT_EXPORT_FILE_VERSION = "event_export.v1" as const;

export const EventExportFileSchema = z.object({
  schema_version: z.literal(EVENT_EXPORT_FILE_VERSION),
  event_id: EventIdSchema,
  organization_id: OrganizationIdSchema,
  name: z.string().min(1),
  scenes: z.array(SceneContractSchema),
});

export type EventExportFile = z.infer<typeof EventExportFileSchema>;

/** draw-configs.json — apenas sorteios referenciados por alguma scene. */
export const DRAW_CONFIGS_PACK_FILE_VERSION = "draw_configs_pack.v1" as const;

export const DrawConfigsPackFileSchema = z.object({
  schema_version: z.literal(DRAW_CONFIGS_PACK_FILE_VERSION),
  event_id: EventIdSchema,
  export_id: ExportIdSchema,
  draw_configs: z.array(DrawConfigContractSchema),
});

export type DrawConfigsPackFile = z.infer<typeof DrawConfigsPackFileSchema>;

/** media-manifest.json */
export const MEDIA_MANIFEST_PACK_VERSION = "media_manifest.v1" as const;

export const MediaManifestPackFileSchema = z.object({
  schema_version: z.literal(MEDIA_MANIFEST_PACK_VERSION),
  event_id: EventIdSchema,
  export_id: ExportIdSchema,
  requirements: z.array(MediaRequirementContractSchema),
});

export type MediaManifestPackFile = z.infer<typeof MediaManifestPackFileSchema>;

/** branding.json — branding resolvido mínimo para runtime (MVP). */
export const BRANDING_EXPORT_MVP_VERSION = "branding_export.v1" as const;

export const BrandingExportMvpSchema = z.object({
  schema_version: z.literal(BRANDING_EXPORT_MVP_VERSION),
  event_id: EventIdSchema,
  organization_id: OrganizationIdSchema,
  export_id: ExportIdSchema,
  resolved_at: z.string().min(10),
  source: z.enum(["default_mvp"]),
  tokens: z.object({
    primary_color: z.string().min(1),
    accent_color: z.string().min(1),
    font_family_sans: z.string().min(1),
  }),
});

export type BrandingExportMvp = z.infer<typeof BrandingExportMvpSchema>;

/** license.json — licença mínima por org/evento/janela (MVP, sem claims comerciais completos). */
export const LICENSE_EXPORT_MVP_VERSION = "license_export.v1" as const;

export const LicenseExportMvpSchema = z.object({
  schema_version: z.literal(LICENSE_EXPORT_MVP_VERSION),
  organization_id: OrganizationIdSchema,
  event_id: EventIdSchema,
  export_id: ExportIdSchema,
  issued_at: z.string().min(10),
  valid_from: z.string().min(10),
  valid_until: z.string().min(10),
  scope: z.literal("event_player_binding_mvp"),
  note: z
    .string()
    .optional()
    .describe("Texto informativo; não substitui contrato comercial completo."),
});

export type LicenseExportMvp = z.infer<typeof LicenseExportMvpSchema>;
