import { z } from "zod";

/** Declared media slot kind — contract language is English. */
export const MediaKindSchema = z.enum(["video", "image", "audio", "other"]);

export type MediaKind = z.infer<typeof MediaKindSchema>;
