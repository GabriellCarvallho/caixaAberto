import { Navigate, Outlet } from 'react-router-dom';

import { isAuthenticated } from '../lib/session';

export function ProtectedRoute() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
}
