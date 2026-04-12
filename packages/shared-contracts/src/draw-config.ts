import { z } from "zod";
import { DrawConfigIdSchema, EventIdSchema } from "./ids.js";

/** Textos voltados ao público / telas externas (opcional; pt-BR típico no conteúdo). */
export const DrawPublicCopyMvpSchema = z.object({
  headline: z.string().max(200).optional(),
  audience_instructions: z.string().max(500).optional(),
  result_label: z.string().max(120).optional(),
});

export type DrawPublicCopyMvp = z.infer<typeof DrawPublicCopyMvpSchema>;

/** Intervalo inclusivo para sorteio numérico MVP (`number_range`). */
export const DrawNumberRangeSchema = z.object({
  min: z.number().int(),
  max: z.number().int(),
});

export type DrawNumberRange = z.infer<typeof DrawNumberRangeSchema>;

/** Tipos de motor de sorteio no pack — MVP: apenas intervalo numérico. */
export const DrawTypeSchema = z.enum(["number_range"]);

export type DrawType = z.infer<typeof DrawTypeSchema>;

/**
 * DrawConfig owned by the event; scenes reference optionally (EVENT_EDITOR_FEATURE_SPEC).
 * `number_range` opcional: se ausente, o Player MVP pode usar intervalo padrão (ver README do Player).
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
    public_copy: DrawPublicCopyMvpSchema.nullish(),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.number_range && cfg.number_range.max < cfg.number_range.min) {
      ctx.addIssue({
        code: "custom",
        path: ["number_range", "max"],
        message: "number_range.max must be >= number_range.min",
      });
    }
  });

export type DrawConfigContract = z.infer<typeof DrawConfigContractSchema>;
