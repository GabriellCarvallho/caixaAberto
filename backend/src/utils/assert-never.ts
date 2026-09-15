// Recebe o que sobrou de um switch exaustivo. Enquanto todos os casos estiverem tratados, o
// parametro e never e a chamada compila; ao surgir um caso novo, a compilacao quebra em cada
// consumidor que nao o tratar, antes de virar erro de runtime ou, pior, resultado silenciosamente
// errado.
export function assertNever(value: never): never {
  throw new Error(`Caso nao tratado: ${String(value)}`);
}
