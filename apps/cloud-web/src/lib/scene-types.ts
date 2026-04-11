/** Tipos de scene alinhados a `SceneTypeSchema` (shared-contracts). */

export const SCENE_TYPES = [
  "opening",
  "institutional",
  "sponsor",
  "draw",
  "break",
  "closing",
] as const;

export type SceneType = (typeof SCENE_TYPES)[number];

export const SCENE_TYPE_LABELS: Record<SceneType, string> = {
  opening: "Abertura",
  institutional: "Institucional",
  sponsor: "Patrocinador",
  draw: "Sorteio",
  break: "Intervalo",
  closing: "Encerramento",
};
