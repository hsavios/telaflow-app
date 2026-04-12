import type { SceneType } from "@/lib/scene-types";

/** Linha curta ao estilo do telão Player (cenas sem sorteio). */
const FRASES: Partial<Record<SceneType, string>> = {
  opening: "Boas-vindas — abertura oficial do programa.",
  institutional: "Mensagem institucional da organização.",
  sponsor: "Patrocínio — apoio ao evento.",
  break: "Intervalo — breve pausa no programa.",
  closing: "Encerramento — fim do programa.",
};

export function fraseAtmosferaPreview(type: string): string | null {
  const t = type as SceneType;
  return FRASES[t] ?? null;
}
