/**
 * Sessão MVP no navegador: JWT + organization_id devolvido no login
 * (o servidor ignora o cabeçalho de org quando `TELAFLOW_JWT_SECRET` está ativo).
 */

const TOKEN_KEY = "telaflow_access_token";
const ORG_KEY = "telaflow_organization_id";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getSessionOrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(ORG_KEY);
  return v && v.trim() ? v.trim() : null;
}

export function setAuthSession(accessToken: string, organizationId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(ORG_KEY, organizationId);
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ORG_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken()?.trim());
}
