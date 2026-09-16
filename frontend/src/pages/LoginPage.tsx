import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError, apiRequest } from '../lib/httpClient';
import { clearSession, setToken } from '../lib/session';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const resposta = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        auth: false,
        body: {
          email,
          password: senha,
        },
      });

      clearSession();
      setToken(resposta.token);
      navigate('/lancamentos', { replace: true });
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : 'Não foi possível entrar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main>
      <h1>Caixa Aberto</h1>

      <form onSubmit={handleSubmit}>
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={enviando}
          />
        </label>

        <label>
          Senha
          <input
            type="password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            required
            disabled={enviando}
          />
        </label>

        {erro && <p role="alert">{erro}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
