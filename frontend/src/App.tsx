import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { NewOutflowPage } from './pages/NewOutflowPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { TransactionsListPage } from './pages/TransactionsListPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/lancamentos" element={<TransactionsListPage />} />
        <Route path="/lancamentos/saida" element={<NewOutflowPage />} />
        <Route path="/lancamentos/:id" element={<TransactionDetailPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/lancamentos" replace />} />
      <Route path="*" element={<Navigate to="/lancamentos" replace />} />
    </Routes>
  );
}