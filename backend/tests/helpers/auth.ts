import { signUserToken } from '../../src/utils/jwtUtils.js';

interface AuthenticatedUser {
  id: bigint;
  email: string;
}

export function createAuthorizationHeader(user: AuthenticatedUser): string {
  return `Bearer ${signUserToken(user)}`;
}
