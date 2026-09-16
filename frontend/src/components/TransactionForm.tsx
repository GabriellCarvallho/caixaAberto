import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { ApiError, apiRequest } from '../lib/httpClient';
import { getOrganizationId } from '../lib/session';

export type TransactionType = 'ENTRADA' | 'SAIDA';

interface TransactionResponse {
  id: string;
  type: TransactionType;
}

interface CategoryOption {
  id: string;
  nome: string;
}

interface CategoryListResponse {
  dados: CategoryOption[];
}

interface TransactionFormProps {
  tipo: TransactionType;
  onCriado?: (lancamento: TransactionResponse) => void;
}

const ROTULOS: Record<TransactionType, { titulo: string; camposParte: string }> = {
  ENTRADA: { titulo: 'Registrar entrada financeira', camposParte: 'Origem' },
  SAIDA: { titulo: 'Registrar saída financeira', camposParte: 'Destinatário' },
};

export function TransactionForm({ tipo, onCriado }: TransactionFormProps) {
  const [categorias, setCategorias] = useState<CategoryOption[]>([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');
  const [parte, setParte] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const rotulo = ROTULOS[tipo];

  useEffect(() => {
    let cancelado = false;

    async function carregarCategorias() {
      try {
        const resposta = await apiRequest<CategoryListResponse>(`/categorias?tipo=${tipo}`);
        if (!cancelado) setCategorias(resposta.dados);
      } catch {
        // Falha ao carregar categorias não impede o formulário de aparecer.
      }
    }

    void carregarCategorias();

    return () => {
      cancelado = true;
    };
  }, [tipo]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const lancamento = await apiRequest<TransactionResponse>('/transactions', {
        method: 'POST',
        body: {
          organizationId: getOrganizationId(),
          categoryId: categoriaId,
          amount: valor,
          date: data,
          description: descricao,
          tipo,
          source: tipo === 'ENTRADA' ? parte : undefined,
          recipient: tipo === 'SAIDA' ? parte : undefined,
        },
      });

      setCategoriaId('');
      setValor('');
      setData('');
      setDescricao('');
      setParte('');
      onCriado?.(lancamento);
    } catch (error) {
      setErro(
        error instanceof ApiError ? error.message : 'Não foi possível registrar o lançamento',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`transaction-form transaction-form--${tipo.toLowerCase()}`}
    >
      <h2>{rotulo.titulo}</h2>

      <label>
        Categoria
        <select
          value={categoriaId}
          onChange={(event) => setCategoriaId(event.target.value)}
          required
        >
          <option value="" disabled>
            Selecione uma categoria
          </option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </select>
      </label>

      <label>
        Valor (R$)
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          required
        />
      </label>

      <label>
        Data
        <input
          type="date"
          value={data}
          onChange={(event) => setData(event.target.value)}
          required
        />
      </label>

      <label>
        {rotulo.camposParte}
        <input type="text" value={parte} onChange={(event) => setParte(event.target.value)} />
      </label>

      <label>
        Descrição
        <textarea
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          required
          maxLength={5000}
        />
      </label>

      {erro && <p role="alert">{erro}</p>}

      <button type="submit" disabled={enviando}>
        {enviando ? 'Salvando...' : 'Salvar lançamento'}
      </button>
    </form>
  );
}
