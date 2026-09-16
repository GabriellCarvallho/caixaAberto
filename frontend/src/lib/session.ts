const TOKEN_KEY = 'caixaAberto.token';
const ORGANIZATION_ID_KEY = 'caixaAberto.organizationId';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getOrganizationId(): string | null {
  return localStorage.getItem(ORGANIZATION_ID_KEY);
}

export function setOrganizationId(organizationId: string): void {
  localStorage.setItem(ORGANIZATION_ID_KEY, organizationId);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ORGANIZATION_ID_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
