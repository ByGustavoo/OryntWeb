export interface TelaSugerivel {
  caminho: string;
  rotulo: string;
}

const LIMITE_DE_DIFERENCA = 0.4;
const PESO_DO_ULTIMO_TRECHO = 0.1;

function normalizarEndereco(endereco: string): string {
  const semAcento = endereco.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const limpo = semAcento.toLowerCase().trim().replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return limpo.startsWith('/') ? limpo : `/${limpo}`;
}

function ultimoTrecho(endereco: string): string {
  return endereco.slice(endereco.lastIndexOf('/') + 1);
}

export function distanciaDeEdicao(a: string, b: string): number {
  if (a === b) return 0;
  let anterior = Array.from({ length: b.length + 1 }, (_, indice) => indice);
  for (let i = 1; i <= a.length; i += 1) {
    const atual = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min((anterior[j] ?? 0) + 1, (atual[j - 1] ?? 0) + 1, (anterior[j - 1] ?? 0) + custo);
    }
    anterior = atual;
  }
  return anterior[b.length] ?? 0;
}

function diferenca(a: string, b: string): number {
  const maior = Math.max(a.length, b.length);
  return maior === 0 ? 1 : distanciaDeEdicao(a, b) / maior;
}

export function diferencaDoEndereco(endereco: string, caminho: string): number {
  const digitado = normalizarEndereco(endereco);
  const trechoDigitado = ultimoTrecho(digitado);
  const pelaTela = diferenca(digitado, caminho);
  if (trechoDigitado.length === 0) return pelaTela;
  return Math.min(pelaTela, diferenca(trechoDigitado, ultimoTrecho(caminho)) + PESO_DO_ULTIMO_TRECHO);
}

export function sugerirTela<T extends TelaSugerivel>(endereco: string, telas: readonly T[]): T | null {
  let melhor: { tela: T; diferenca: number } | null = null;
  for (const tela of telas) {
    const atual = diferencaDoEndereco(endereco, tela.caminho);
    if (atual <= LIMITE_DE_DIFERENCA && (melhor === null || atual < melhor.diferenca)) {
      melhor = { tela, diferenca: atual };
    }
  }
  return melhor?.tela ?? null;
}
