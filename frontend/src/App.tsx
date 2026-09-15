import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { MonthlySummaryPage } from './pages/MonthlySummaryPage';
import { NewOutflowPage } from './pages/NewOutflowPage';
<<<<<<< HEAD
<<<<<<< HEAD
import { PublicTransparencyPage } from './pages/PublicTransparencyPage';
import { StatementPage } from './pages/StatementPage';
=======
>>>>>>> 9d844d8 (feat(lancamentos): visualizar detalhes do lancamento (US24 #30477))
=======
import { PublicTransparencyPage } from './pages/PublicTransparencyPage';
>>>>>>> 24111c2 (feat(transparencia): consultar transparencia publica sem autenticacao (US32 #30524))
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { TransactionsListPage } from './pages/TransactionsListPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/transparencia/:link" element={<PublicTransparencyPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/lancamentos" element={<TransactionsListPage />} />
        <Route path="/lancamentos/saida" element={<NewOutflowPage />} />
        <Route path="/lancamentos/:id" element={<TransactionDetailPage />} />
<<<<<<< HEAD
<<<<<<< HEAD
        <Route path="/resumo" element={<MonthlySummaryPage />} />
        <Route path="/extrato" element={<StatementPage />} />
=======
>>>>>>> 9d844d8 (feat(lancamentos): visualizar detalhes do lancamento (US24 #30477))
=======
        <Route path="/resumo" element={<MonthlySummaryPage />} />
>>>>>>> 5b88773 (feat(lancamentos): consultar resumo financeiro mensal (US29 #30519))
      </Route>

      <Route path="/" element={<Navigate to="/lancamentos" replace />} />
      <Route path="*" element={<Navigate to="/lancamentos" replace />} />
    </Routes>
  );
}