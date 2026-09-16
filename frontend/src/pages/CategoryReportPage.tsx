import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { ApiError, apiRequest } from '../lib/httpClient';

type CategoryType = 'ENTRADA' | 'SAIDA';

interface CategoryReportItem {
  id: string;
  nome: string;
  tipo: CategoryType;
  total: string;
}

interface CategoryReportResponse {
  dataInicio: string;
  dataFim: string;
  categorias: CategoryReportItem[];
  totais: {
    entradas: string;
    saidas: string;
  };
}

function primeiroDiaDoMesAtual(): string {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatarMoeda(valor: string): string {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return valor;
  }

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function rotuloTipo(tipo: CategoryType): string {
  return tipo === 'ENTRADA' ? 'Entrada' : 'Saida';
}

export function CategoryReportPage() {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMesAtual());
  const [dataFim, setDataFim] = useState(hojeISO());
  const [periodoConsultado, setPeriodoConsultado] = useState({
    dataInicio: primeiroDiaDoMesAtual(),
    dataFim: hojeISO(),
  });
  const [relatorio, setRelatorio] = useState<CategoryReportResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const maiorTotal = useMemo(() => {
    if (!relatorio || relatorio.categorias.length === 0) {
      return 0;
    }

    return Math.max(...relatorio.categorias.map((categoria) => Number(categoria.total)));
  }, [relatorio]);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro(null);

      const params = new URLSearchParams({
        dataInicio: periodoConsultado.dataInicio,
        dataFim: periodoConsultado.dataFim,
      });

      try {
        const dados = await apiRequest<CategoryReportResponse>(
          `/relatorios/categorias?${params.toString()}`,
        );

        if (!cancelado) {
          setRelatorio(dados);
        }
      } catch (error) {
        if (!cancelado) {
          setErro(
            error instanceof ApiError
              ? error.message
              : 'Nao foi possivel carregar o relatorio por categoria',
          );
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    void carregar();

    return () => {
      cancelado = true;
    };
  }, [periodoConsultado]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (dataFim < dataInicio) {
      setErro('Periodo invalido: a data final deve ser maior ou igual a data inicial.');
      setRelatorio(null);
      return;
    }

    setPeriodoConsultado({ dataInicio, dataFim });
  }

  return (
    <main>
      <h1>Relatorio por categoria</h1>

      <form onSubmit={handleSubmit}>
        <label>
          De
          <input
            type="date"
            value={dataInicio}
            onChange={(event) => setDataInicio(event.target.value)}
            required
          />
        </label>

        <label>
          Ate
          <input
            type="date"
            value={dataFim}
            onChange={(event) => setDataFim(event.target.value)}
            required
          />
        </label>

        <button type="submit">Gerar relatorio</button>
      </form>

      {carregando && <p role="status">Carregando...</p>}
      {erro && <p role="alert">{erro}</p>}

      {relatorio && (
        <>
          <section className="report-summary" aria-label="Totais do periodo">
            <article>
              <h2>Entradas</h2>
              <p>{formatarMoeda(relatorio.totais.entradas)}</p>
            </article>
            <article>
              <h2>Saidas</h2>
              <p>{formatarMoeda(relatorio.totais.saidas)}</p>
            </article>
          </section>

          {relatorio.categorias.length === 0 ? (
            <p>Nenhuma movimentacao encontrada para o periodo informado.</p>
          ) : (
            <>
              <section className="category-chart" aria-label="Grafico por categoria">
                {relatorio.categorias.map((categoria) => {
                  const total = Number(categoria.total);
                  const largura = maiorTotal > 0 ? Math.max((total / maiorTotal) * 100, 2) : 0;

                  return (
                    <div className="category-chart__item" key={categoria.id}>
                      <div className="category-chart__label">
                        <span>{categoria.nome}</span>
                        <span>{formatarMoeda(categoria.total)}</span>
                      </div>
                      <div className="category-chart__track">
                        <div
                          className={`category-chart__bar category-chart__bar--${categoria.tipo.toLowerCase()}`}
                          style={{ width: `${largura}%` }}
                          role="img"
                          aria-label={`${categoria.nome}: ${formatarMoeda(categoria.total)}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </section>

              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.categorias.map((categoria) => (
                    <tr key={categoria.id}>
                      <td>{categoria.nome}</td>
                      <td>{rotuloTipo(categoria.tipo)}</td>
                      <td>{formatarMoeda(categoria.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </main>
  );
}
