import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { NewOutflowPage } from './pages/NewOutflowPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/lancamentos/saida" element={<NewOutflowPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/lancamentos/saida" replace />} />
      <Route path="*" element={<Navigate to="/lancamentos/saida" replace />} />
    </Routes>
  );
}