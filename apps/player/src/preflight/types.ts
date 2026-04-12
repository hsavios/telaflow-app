/**
 * Resultado mínimo do pre-flight (MVP) — vocabulário alinhado a PRE_FLIGHT_FEATURE_SPEC §6.
 */

export type PreflightGroup = "G1" | "G2" | "G3" | "G4" | "G5";

export type PreflightSeverity = "ok" | "aviso" | "bloqueante";

export type PreflightFatality = "recuperavel" | "fatal";

export type PreflightItem = {
  check_id: string;
  group: PreflightGroup;
  severity: PreflightSeverity;
  fatality?: PreflightFatality | null;
  message: string;
  code: string;
};

export type PreflightResult = {
  runAt: string;
  items: PreflightItem[];
  blockingCount: number;
  warningCount: number;
  okCount: number;
};
