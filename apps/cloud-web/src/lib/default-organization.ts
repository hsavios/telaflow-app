/**
 * Organization ID provisório para a fase sem autenticação / tenant.
 * Deve coincidir com o cabeçalho `X-Telaflow-Organization-Id` em `cloud-api.ts`
 * (`defaultTelaflowOrganizationId`), senão a API responde 403 `organization_mismatch`.
 *
 * Ordem: `NEXT_PUBLIC_TELAFLOW_ORGANIZATION_ID` → `NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID` → mesmo default da API/seed.
 */
export const PROVISIONAL_ORGANIZATION_ID =
  process.env.NEXT_PUBLIC_TELAFLOW_ORGANIZATION_ID?.trim() ||
  process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID?.trim() ||
  "org_telaflow_d1";
