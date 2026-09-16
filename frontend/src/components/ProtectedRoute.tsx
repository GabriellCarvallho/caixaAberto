import { useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';

import { apiRequest } from '../lib/httpClient';
import { clearSession, isAuthenticated } from '../lib/session';

export function ProtectedRoute() {
  const navigate = useNavigate();
  const [saindo, setSaindo] = useState(false);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  async function handleLogout() {
    setSaindo(true);

    try {
      await apiRequest<unknown>('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // A sessão local deve ser encerrada mesmo se a API estiver indisponível.
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  }

  return (
    <>
      <header>
        <button type="button" onClick={handleLogout} disabled={saindo}>
          {saindo ? 'Saindo...' : 'Sair'}
        </button>
      </header>

      <Outlet />
    </>
  );
}
