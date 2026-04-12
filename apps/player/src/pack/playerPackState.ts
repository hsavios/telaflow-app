/**
 * Estados mínimos do loader (MVP) — alinhado a PLAYER_RUNTIME_FEATURE_SPEC (subconjunto).
 * Não inclui binding, pre-flight completo nem execução.
 */

export type PlayerPackUiState =
  | { kind: "idle" }
  | {
      kind: "pack_loaded";
      rootPath: string;
      eventName: string;
      exportId: string;
      generatedAt: string;
      sceneCount: number;
      drawConfigCount: number;
      mediaRequirementCount: number;
      packFormat: string;
    }
  | { kind: "blocked"; message: string };
