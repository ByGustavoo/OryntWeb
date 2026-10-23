import { describe, expect, it } from 'vitest';
import { agruparPorDia, nomeDoDia } from './linhaDoTempo';

const agora = new Date(2026, 9, 22, 14, 30);

describe('nomeDoDia', () => {
  it('chama o dia de hoje e o de ontem pelo nome, com a data', () => {
    expect(nomeDoDia(new Date(2026, 9, 22, 0, 5), agora)).toBe('Hoje, 22 de outubro');
    expect(nomeDoDia(new Date(2026, 9, 21, 23, 59), agora)).toBe('Ontem, 21 de outubro');
  });

  it('dá o dia da semana aos outros dias do mesmo ano', () => {
    expect(nomeDoDia(new Date(2026, 9, 19, 10), agora)).toBe('Segunda-feira, 19 de outubro');
  });

  it('mostra o ano quando o dia é de outro ano', () => {
    expect(nomeDoDia(new Date(2025, 11, 31, 10), agora)).toBe('31 de dezembro de 2025');
  });

  it('reconhece ontem na virada do mês', () => {
    expect(nomeDoDia(new Date(2026, 8, 30, 22), new Date(2026, 9, 1, 8))).toBe('Ontem, 30 de setembro');
  });
});

describe('agruparPorDia', () => {
  it('junta os itens seguidos do mesmo dia e mantém a ordem recebida', () => {
    const itens = [
      { id: 'a', em: new Date(2026, 9, 22, 14).toISOString() },
      { id: 'b', em: new Date(2026, 9, 22, 9).toISOString() },
      { id: 'c', em: new Date(2026, 9, 21, 18).toISOString() },
      { id: 'd', em: new Date(2026, 9, 19, 8).toISOString() },
    ];
    const dias = agruparPorDia(itens, (item) => item.em, agora);
    expect(dias.map((dia) => [dia.nome, dia.itens.map((item) => item.id)])).toEqual([
      ['Hoje, 22 de outubro', ['a', 'b']],
      ['Ontem, 21 de outubro', ['c']],
      ['Segunda-feira, 19 de outubro', ['d']],
    ]);
  });

  it('devolve uma lista vazia sem itens', () => {
    expect(agruparPorDia([], () => '', agora)).toEqual([]);
  });
});
