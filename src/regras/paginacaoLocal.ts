export const ITENS_POR_PAGINA = 15;

export interface PaginaLocal<T> {
  itens: T[];
  pagina: number;
  totalPaginas: number;
  primeiro: number;
  ultimo: number;
}

export function lerPagina(valor: unknown): number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 ? valor : 1;
}

export function paginaAposMudanca<T extends { pagina: number }>(
  filtros: T,
  mudanca: Partial<T>,
  camposQueMantemAPagina: readonly (keyof T)[] = ['pagina'],
): number {
  const mantem = Object.keys(mudanca).every((campo) => camposQueMantemAPagina.includes(campo as keyof T));
  return mantem ? (mudanca.pagina ?? filtros.pagina) : 1;
}

export function paginarLista<T>(itens: T[], pagina: number): PaginaLocal<T> {
  const totalPaginas = Math.max(1, Math.ceil(itens.length / ITENS_POR_PAGINA));
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (atual - 1) * ITENS_POR_PAGINA;
  const daPagina = itens.slice(inicio, inicio + ITENS_POR_PAGINA);
  return {
    itens: daPagina,
    pagina: atual,
    totalPaginas,
    primeiro: daPagina.length === 0 ? 0 : inicio + 1,
    ultimo: inicio + daPagina.length,
  };
}

export function paginaDaPosicao(posicao: number): number {
  return Math.floor(Math.max(0, posicao) / ITENS_POR_PAGINA) + 1;
}
