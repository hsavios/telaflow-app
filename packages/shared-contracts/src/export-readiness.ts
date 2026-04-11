import { z } from "zod";
import { DrawConfigIdSchema, MediaIdSchema, SceneIdSchema } from "./ids.js";

/**
 * Server-side export gate snapshot (Cloud API).
 * Aligns with EVENT_EDITOR_FEATURE_SPEC §16–§17; evolves without Pack signing.
 */
export const EXPORT_READINESS_SCHEMA_VERSION = "export_readiness.v1" as const;

export const SceneLifecycleSchema = z.enum([
  "draft",
  "blocked",
  "warning",
  "ready",
]);

export type SceneLifecycle = z.infer<typeof SceneLifecycleSchema>;

export const ExportReadinessIssueSchema = z.object({
  severity: z.enum(["blocking", "warning"]),
  code: z.string(),
  message: z.string().optional(),
  scene_id: SceneIdSchema.optional(),
  media_id: MediaIdSchema.optional(),
  draw_config_id: DrawConfigIdSchema.optional(),
  label: z.string().optional(),
  name: z.string().optional(),
});

export type ExportReadinessIssue = z.infer<typeof ExportReadinessIssueSchema>;

export const SceneReadinessEvaluationSchema = z.object({
  scene_id: SceneIdSchema,
  sort_order: z.number().int().nonnegative(),
  lifecycle: SceneLifecycleSchema,
  blocking_codes: z.array(z.string()),
  warning_codes: z.array(z.string()),
});

export type SceneReadinessEvaluation = z.infer<typeof SceneReadinessEvaluationSchema>;

export const ExportReadinessV1Schema = z.object({
  schema_version: z.literal(EXPORT_READINESS_SCHEMA_VERSION),
  ready: z.boolean(),
  sort_order_ok: z.boolean(),
  blocking: z.array(ExportReadinessIssueSchema),
  warnings: z.array(ExportReadinessIssueSchema),
  lifecycle_counts: z.object({
    draft: z.number().int().nonnegative(),
    blocked: z.number().int().nonnegative(),
    warning: z.number().int().nonnegative(),
    ready: z.number().int().nonnegative(),
  }),
  scene_evaluations: z.array(SceneReadinessEvaluationSchema),
  scene_count: z.number().int().nonnegative(),
  draw_config_count: z.number().int().nonnegative(),
  media_requirement_count: z.number().int().nonnegative(),
});

export type ExportReadinessV1 = z.infer<typeof ExportReadinessV1Schema>;
