const TOKEN_KEY = 'caixaAberto.token';
const ORGANIZATION_ID_KEY = 'caixaAberto.organizationId';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// A organizacao passou a vir do contexto autenticado no backend. Nada mais le esta chave:
// ela sobrevive apenas enquanto o login ainda exibe o campo temporario de organizacao.
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
