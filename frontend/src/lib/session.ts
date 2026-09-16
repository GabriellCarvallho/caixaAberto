const TOKEN_KEY = 'caixaAberto.token';
// Chave legada: a organizacao passou a vir do contexto autenticado no backend e o login nao a
// grava mais. Continua sendo limpa para nao deixar residuo em quem ja usou as versoes anteriores.
const ORGANIZATION_ID_KEY = 'caixaAberto.organizationId';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ORGANIZATION_ID_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
