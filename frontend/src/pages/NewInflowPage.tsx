import { useState } from 'react';
import { Link } from 'react-router-dom';

import { TransactionForm } from '../components/TransactionForm';

export function NewInflowPage() {
  const [mensagem, setMensagem] = useState<string | null>(null);

  return (
    <main>
      <TransactionForm
        tipo="ENTRADA"
        onCriado={() => setMensagem('Entrada registrada com sucesso.')}
      />

      {mensagem && <p role="status">{mensagem}</p>}

      <Link to="/lancamentos/entrada">Registrar outra entrada</Link>
    </main>
  );
}
