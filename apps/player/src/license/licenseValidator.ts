/**
 * Validador de licença (MVP) — janela temporal e escopo, sem assinatura criptográfica.
 * Alinhado a LICENSING / PRE_FLIGHT (G2) em nível mínimo.
 */

import {
  LICENSE_EXPORT_MVP_VERSION,
  LicenseExportMvpSchema,
  type LicenseExportMvp,
} from "@telaflow/shared-contracts";

export type LicenseValidationStatus =
  | "valid"
  | "expired"
  | "not_yet_valid"
  | "invalid_scope"
  | "malformed_license";

export type LicenseEvaluation = {
  status: LicenseValidationStatus;
  license?: LicenseExportMvp;
  /** Detalhe curto para operador / logs (pt-BR). */
  detail?: string;
};

function parseInstantUtcMs(iso: string): number | null {
  if (!iso || iso.length < 10) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

const ESCOPO_MVP = "event_player_binding_mvp" as const;

/**
 * Avalia `license.json` já deserializado.
 * `context` deve refletir o pack carregado (ids do manifest / evento).
 */
export function evaluateLicense(
  raw: unknown,
  context: {
    nowMs: number;
    expectedEventId: string;
    expectedExportId: string;
    expectedOrganizationId: string;
  },
): LicenseEvaluation {
  const parsed = LicenseExportMvpSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "malformed_license",
      detail: parsed.error.message,
    };
  }
  const license = parsed.data;
  if (license.schema_version !== LICENSE_EXPORT_MVP_VERSION) {
    return {
      status: "malformed_license",
      license,
      detail: `schema_version inesperado: ${license.schema_version}`,
    };
  }
  if (license.scope !== ESCOPO_MVP) {
    return {
      status: "invalid_scope",
      license,
      detail: `Escopo inválido ou não suportado neste Player: ${license.scope}`,
    };
  }
  if (license.event_id !== context.expectedEventId) {
    return {
      status: "invalid_scope",
      license,
      detail: "license.event_id não corresponde ao pack carregado.",
    };
  }
  if (license.export_id !== context.expectedExportId) {
    return {
      status: "invalid_scope",
      license,
      detail: "license.export_id não corresponde ao pack carregado.",
    };
  }
  if (license.organization_id !== context.expectedOrganizationId) {
    return {
      status: "invalid_scope",
      license,
      detail: "license.organization_id não corresponde ao pack carregado.",
    };
  }

  const fromMs = parseInstantUtcMs(license.valid_from);
  const untilMs = parseInstantUtcMs(license.valid_until);
  const issuedMs = parseInstantUtcMs(license.issued_at);
  if (fromMs === null || untilMs === null || issuedMs === null) {
    return {
      status: "malformed_license",
      license,
      detail: "Datas inválidas em valid_from / valid_until / issued_at.",
    };
  }
  const now = context.nowMs;
  if (now < fromMs) {
    return {
      status: "not_yet_valid",
      license,
      detail: "Licença ainda não entrou em vigor (valid_from no futuro).",
    };
  }
  if (now > untilMs) {
    return {
      status: "expired",
      license,
      detail: "Licença expirada (valid_until ultrapassado).",
    };
  }
  return { status: "valid", license };
}

export function describeLicenseStatusPt(status: LicenseValidationStatus): string {
  const map: Record<LicenseValidationStatus, string> = {
    valid: "válida",
    expired: "expirada",
    not_yet_valid: "ainda não válida",
    invalid_scope: "escopo ou vínculo inválido",
    malformed_license: "licença malformada",
  };
  return map[status];
}

export function formatLicenseBlockMessage(ev: LicenseEvaluation): string {
  const base = describeLicenseStatusPt(ev.status);
  return ev.detail ? `${base}: ${ev.detail}` : base;
}
