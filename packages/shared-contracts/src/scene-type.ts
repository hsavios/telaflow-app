import { z } from "zod";

/**
 * MVP scene kinds — contract language is English; UI may localize labels (EVENT_EDITOR_FEATURE_SPEC).
 */
export const SceneTypeSchema = z.enum([
  "opening",
  "institutional",
  "sponsor",
  "draw",
  "break",
  "closing",
]);

export type SceneType = z.infer<typeof SceneTypeSchema>;
