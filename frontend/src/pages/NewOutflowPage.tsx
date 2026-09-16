import { useState } from 'react';
import { Link } from 'react-router-dom';

import { TransactionForm } from '../components/TransactionForm';

export function NewOutflowPage() {
  const [mensagem, setMensagem] = useState<string | null>(null);

  return (
    <main>
      <TransactionForm tipo="SAIDA" onCriado={() => setMensagem('Saída registrada com sucesso.')} />

      {mensagem && <p role="status">{mensagem}</p>}

      <Link to="/lancamentos/saida">Registrar outra saída</Link>
    </main>
  );
}
