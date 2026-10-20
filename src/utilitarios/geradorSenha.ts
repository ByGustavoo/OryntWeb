export const TAMANHO_DA_SENHA_GERADA = 24;

const MINUSCULAS = 'abcdefghijkmnopqrstuvwxyz';
const MAIUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITOS = '23456789';
const SIMBOLOS = '-_.!@#%+=';
const CONJUNTOS = [MINUSCULAS, MAIUSCULAS, DIGITOS, SIMBOLOS];
const TODOS = CONJUNTOS.join('');

function sortear(limite: number, aleatorio: () => number): number {
  const teto = Math.floor(0x1_0000_0000 / limite) * limite;
  for (;;) {
    const valor = aleatorio();
    if (valor < teto) return valor % limite;
  }
}

function aleatorioSeguro(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

export function gerarSenha(tamanho = TAMANHO_DA_SENHA_GERADA, aleatorio: () => number = aleatorioSeguro): string {
  const caracteres = CONJUNTOS.map((conjunto) => conjunto[sortear(conjunto.length, aleatorio)] ?? '');
  while (caracteres.length < tamanho) caracteres.push(TODOS[sortear(TODOS.length, aleatorio)] ?? '');
  for (let indice = caracteres.length - 1; indice > 0; indice -= 1) {
    const troca = sortear(indice + 1, aleatorio);
    [caracteres[indice], caracteres[troca]] = [caracteres[troca] ?? '', caracteres[indice] ?? ''];
  }
  return caracteres.join('');
}
