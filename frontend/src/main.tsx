import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/global.css';

import { App } from './App';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Elemento raiz não encontrado');
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);