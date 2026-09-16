import { useMemo, useState } from 'react';

import { ApiError, apiRequest } from '../lib/httpClient';

interface PublicLinkResponse {
  token: string;
  ativo: boolean;
}

function montarUrlPublica(token: string): string {
  return `${window.location.origin}/transparencia/${token}`;
}

export function PublicLinkManagementPage() {
  const [link, setLink] = useState<PublicLinkResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [copiando, setCopiando] = useState(false);

  const urlPublica = useMemo(() => (link ? montarUrlPublica(link.token) : ''), [link]);

  async function gerarLink() {
    setProcessando(true);
    setErro(null);
    setMensagem(null);

    try {
      const resposta = await apiRequest<PublicLinkResponse>('/organizacoes/atual/link-publico', {
        method: 'POST',
      });
      setLink(resposta);
      setMensagem('Link público gerado e ativado.');
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Não foi possível gerar o link público');
    } finally {
      setProcessando(false);
    }
  }

  async function alterarEstado(ativo: boolean) {
    setProcessando(true);
    setErro(null);
    setMensagem(null);

    try {
      const resposta = await apiRequest<PublicLinkResponse>('/organizacoes/atual/link-publico', {
        method: 'PATCH',
        body: { ativo },
      });
      setLink(resposta);
      setMensagem(ativo ? 'Link público ativado.' : 'Link público desativado.');
    } catch (error) {
      setErro(
        error instanceof ApiError ? error.message : 'Não foi possível alterar o link público',
      );
    } finally {
      setProcessando(false);
    }
  }

  async function copiarLink() {
    if (!urlPublica) {
      return;
    }

    setCopiando(true);
    setErro(null);
    setMensagem(null);

    try {
      await navigator.clipboard.writeText(urlPublica);
      setMensagem('Link público copiado.');
    } catch {
      setErro('Não foi possível copiar o link público.');
    } finally {
      setCopiando(false);
    }
  }

  return (
    <main>
      <h1>Link público</h1>

      <section className="public-link-panel">
        <p>Status: {link ? (link.ativo ? 'Ativo' : 'Inativo') : 'Não gerado nesta sessão'}</p>

        {link && (
          <label>
            Endereço público
            <input type="text" value={urlPublica} readOnly />
          </label>
        )}

        <div className="public-link-actions">
          <button type="button" onClick={gerarLink} disabled={processando}>
            {link ? 'Gerar novo link' : 'Gerar link público'}
          </button>

          <button type="button" onClick={copiarLink} disabled={!link || copiando}>
            {copiando ? 'Copiando...' : 'Copiar'}
          </button>

          <button
            type="button"
            onClick={() => alterarEstado(true)}
            disabled={!link || link.ativo || processando}
          >
            Ativar
          </button>

          <button
            type="button"
            onClick={() => alterarEstado(false)}
            disabled={!link || !link.ativo || processando}
          >
            Desativar
          </button>
        </div>
      </section>

      {mensagem && <p role="status">{mensagem}</p>}
      {erro && <p role="alert">{erro}</p>}
    </main>
  );
}
