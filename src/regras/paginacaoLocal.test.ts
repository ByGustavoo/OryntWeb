import { describe, expect, it } from 'vitest';
import { ITENS_POR_PAGINA, lerPagina, paginaAposMudanca, paginaDaPosicao, paginarLista } from './paginacaoLocal';

describe('lerPagina', () => {
  it('aceita só inteiros a partir de 1', () => {
    expect(lerPagina(3)).toBe(3);
    expect(lerPagina(0)).toBe(1);
    expect(lerPagina(1.5)).toBe(1);
    expect(lerPagina('2')).toBe(1);
    expect(lerPagina(undefined)).toBe(1);
  });
});

describe('paginaAposMudanca', () => {
  const filtros = { busca: '', aba: 'A', pagina: 2 };

  it('mantém a página quando a mudança só toca os campos que a mantêm', () => {
    expect(paginaAposMudanca(filtros, { pagina: 3 })).toBe(3);
    expect(paginaAposMudanca(filtros, { aba: 'B' }, ['pagina', 'aba'])).toBe(2);
  });

  it('volta à primeira página com qualquer outra mudança', () => {
    expect(paginaAposMudanca(filtros, { busca: 'pedidos' })).toBe(1);
    expect(paginaAposMudanca(filtros, { aba: 'B' })).toBe(1);
    expect(paginaAposMudanca(filtros, { busca: 'x', aba: 'B' }, ['pagina', 'aba'])).toBe(1);
  });
});

describe('paginarLista', () => {
  const itens = Array.from({ length: ITENS_POR_PAGINA + 4 }, (_, posicao) => posicao);

  it('corta a lista em páginas e diz o intervalo de cada uma', () => {
    const primeira = paginarLista(itens, 1);
    expect(primeira).toMatchObject({ pagina: 1, totalPaginas: 2, primeiro: 1, ultimo: ITENS_POR_PAGINA });
    expect(primeira.itens).toHaveLength(ITENS_POR_PAGINA);
    const segunda = paginarLista(itens, 2);
    expect(segunda).toMatchObject({ pagina: 2, primeiro: ITENS_POR_PAGINA + 1, ultimo: ITENS_POR_PAGINA + 4 });
    expect(segunda.itens[0]).toBe(ITENS_POR_PAGINA);
  });

  it('leva uma página além do fim para a última', () => {
    expect(paginarLista(itens, 9)).toMatchObject({ pagina: 2, primeiro: ITENS_POR_PAGINA + 1 });
    expect(paginarLista(itens.slice(0, 3), 2)).toMatchObject({ pagina: 1, totalPaginas: 1, ultimo: 3 });
  });

  it('dá uma página vazia para uma lista vazia', () => {
    expect(paginarLista([], 1)).toEqual({ itens: [], pagina: 1, totalPaginas: 1, primeiro: 0, ultimo: 0 });
  });

  it('acha a página de cada posição da lista', () => {
    expect(paginaDaPosicao(0)).toBe(1);
    expect(paginaDaPosicao(ITENS_POR_PAGINA - 1)).toBe(1);
    expect(paginaDaPosicao(ITENS_POR_PAGINA)).toBe(2);
  });
});
