import type { IntervaloDeTexto } from '@/utilitarios/sql';

export const TAMANHO_MAXIMO_BUSCA = 200;

const MARCAS_DE_ACENTO = /[\u0300-\u036f]/g;

function normalizarUnidade(unidade: string): string {
  const semAcento = unidade.normalize('NFD').replace(MARCAS_DE_ACENTO, '').toLowerCase();
  if (semAcento.length === 1) return semAcento;
  const minuscula = unidade.toLowerCase();
  return minuscula.length === 1 ? minuscula : unidade;
}

export function normalizarParaBusca(texto: string): string {
  return texto.split('').map(normalizarUnidade).join('');
}

export function limparBusca(busca: string): string {
  return busca.replace(/\s+/g, ' ').trim().slice(0, TAMANHO_MAXIMO_BUSCA);
}

export function termosDaBusca(busca: string): string[] {
  const termos = normalizarParaBusca(limparBusca(busca)).split(' ');
  return [...new Set(termos.filter((termo) => termo !== ''))];
}

export function correspondeABusca(sql: string, termos: string[]): boolean {
  const texto = normalizarParaBusca(sql);
  return termos.every((termo) => texto.includes(termo));
}

export function intervalosMarcados(sql: string, termos: string[]): IntervaloDeTexto[] {
  const texto = normalizarParaBusca(sql);
  const encontrados: IntervaloDeTexto[] = [];

  for (const termo of termos) {
    if (termo === '') continue;
    for (let inicio = texto.indexOf(termo); inicio >= 0; inicio = texto.indexOf(termo, inicio + termo.length)) {
      encontrados.push({ inicio, fim: inicio + termo.length });
    }
  }

  const unidos: IntervaloDeTexto[] = [];
  for (const intervalo of encontrados.sort((a, b) => a.inicio - b.inicio)) {
    const anterior = unidos[unidos.length - 1];
    if (anterior && intervalo.inicio <= anterior.fim) anterior.fim = Math.max(anterior.fim, intervalo.fim);
    else unidos.push({ ...intervalo });
  }
  return unidos;
}
