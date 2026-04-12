import { z } from "zod";
import { DrawConfigIdSchema, EventIdSchema } from "./ids.js";

/** Textos voltados ao público / telas externas (opcional; pt-BR típico no conteúdo). */
export const DrawPublicCopyMvpSchema = z.object({
  headline: z.string().max(200).optional(),
  audience_instructions: z.string().max(500).optional(),
  result_label: z.string().max(120).optional(),
});

export type DrawPublicCopyMvp = z.infer<typeof DrawPublicCopyMvpSchema>;

/** Intervalo inclusivo para sorteio numérico (`number_range` e modo `subset`). */
export const DrawNumberRangeSchema = z.object({
  min: z.number().int(),
  max: z.number().int(),
});

export type DrawNumberRange = z.infer<typeof DrawNumberRangeSchema>;

export const DrawTypeSchema = z.enum(["number_range", "attendee_pool"]);

export type DrawType = z.infer<typeof DrawTypeSchema>;

export const DrawPoolModeSchema = z.enum(["full_range", "subset"]);

export type DrawPoolMode = z.infer<typeof DrawPoolModeSchema>;

export const DrawVisualProfileSchema = z.enum(["premium", "classic", "pulsing"]);

export type DrawVisualProfile = z.infer<typeof DrawVisualProfileSchema>;

/** Som, visual e overrides da animação (Player `drawEngine` / CSS). Campos opcionais no pack. */
export const DrawPresentationPartialSchema = z
  .object({
    sound_enabled: z.boolean().optional(),
    visual_profile: DrawVisualProfileSchema.optional(),
    tick_count: z.number().int().min(10).max(120).optional(),
    total_duration_ms: z.number().int().min(500).max(60000).optional(),
    freeze_before_final_ms: z.number().int().min(0).max(5000).optional(),
  })
  .optional();

export type DrawPresentationPartial = z.infer<typeof DrawPresentationPartialSchema>;

/** Referência para QR / inscrições (congelado no pack). */
export const DrawRegistrationRefSchema = z.object({
  join_url_template: z.string().max(1024).optional(),
  public_token: z.string().max(128).optional(),
});

export type DrawRegistrationRef = z.infer<typeof DrawRegistrationRefSchema>;

/**
 * DrawConfig owned by the event; scenes reference optionally (EVENT_EDITOR_FEATURE_SPEC).
 * `number_range` opcional: se ausente, o Player MVP pode usar intervalo padrão.
 */
export const DrawConfigContractSchema = z
  .object({
    draw_config_id: DrawConfigIdSchema,
    event_id: EventIdSchema,
    name: z.string().min(1).max(256),
    max_winners: z.number().int().min(1).max(999).default(1),
    notes: z.string().max(2000).nullish(),
    enabled: z.boolean().default(true),
    draw_type: DrawTypeSchema.default("number_range"),
    number_range: DrawNumberRangeSchema.optional(),
    pool_mode: DrawPoolModeSchema.default("full_range"),
    eligible_numbers: z.array(z.number().int()).max(50000).optional(),
    remove_winner_from_pool: z.boolean().default(true),
    prizes: z.array(z.string().min(1).max(256)).max(99).optional(),
    public_copy: DrawPublicCopyMvpSchema.nullish(),
    draw_presentation: DrawPresentationPartialSchema,
    registration: DrawRegistrationRefSchema.optional(),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.number_range && cfg.number_range.max < cfg.number_range.min) {
      ctx.addIssue({
        code: "custom",
        path: ["number_range", "max"],
        message: "number_range.max must be >= number_range.min",
      });
    }
    if (cfg.pool_mode === "subset" && (!cfg.eligible_numbers || cfg.eligible_numbers.length === 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["eligible_numbers"],
        message: "pool_mode subset requires eligible_numbers (non-empty).",
      });
    }
  });

export type DrawConfigContract = z.infer<typeof DrawConfigContractSchema>;
