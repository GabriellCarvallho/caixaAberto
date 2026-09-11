import { createApp } from './app.js';
import { readEnvironment } from './config/environment.js';

const environment = readEnvironment();
const app = createApp();

app.listen(environment.PORT, () => {
  console.info(`API Caixa Aberto disponível na porta ${environment.PORT}`);
});
