import { describe, expect, it } from 'vitest';
import {
  contemCaminho,
  destinoInicial,
  funcionalidadesPlanejadas,
  navegacaoPrincipal,
  navegacaoRodape,
  secaoPlanejada,
} from './navegacao';

const itens = [...navegacaoPrincipal.flatMap((secao) => secao.itens), navegacaoRodape];

describe('navegacao', () => {
  it('não repete destino entre itens e subitens', () => {
    const destinos = itens.flatMap((item) => [item.destino, ...(item.filhos ?? []).map((filho) => filho.destino)]);

    expect(new Set(destinos).size).toBe(destinos.length);
  });

  it('mantém cada subitem abaixo do caminho do item que o agrupa', () => {
    for (const item of itens) {
      for (const filho of item.filhos ?? []) {
        expect(filho.destino.startsWith(`${item.destino}/`)).toBe(true);
      }
    }
  });

  it('coloca todas as funcionalidades planejadas no menu, cada uma com suas telas', () => {
    for (const funcionalidade of funcionalidadesPlanejadas) {
      expect(itens).toContain(funcionalidade);
      expect(funcionalidade.filhos.length).toBeGreaterThan(0);
    }
  });

  it('leva o item com subitens para o primeiro deles e o item simples para o próprio destino', () => {
    const [primeira] = funcionalidadesPlanejadas;

    expect(primeira && destinoInicial(primeira)).toBe(primeira?.filhos[0]?.destino);
    expect(destinoInicial(navegacaoRodape)).toBe(navegacaoRodape.destino);
  });

  it('reconhece o item pelo próprio caminho e pelo caminho de qualquer subitem', () => {
    const [primeira, segunda] = funcionalidadesPlanejadas;
    if (!primeira || !segunda) throw new Error('Faltam funcionalidades planejadas para o teste.');
    const ultimoFilho = primeira.filhos[primeira.filhos.length - 1];

    expect(contemCaminho(primeira, primeira.destino)).toBe(true);
    expect(contemCaminho(primeira, ultimoFilho?.destino ?? '')).toBe(true);
    expect(contemCaminho(primeira, segunda.filhos[0]?.destino ?? '')).toBe(false);
    expect(contemCaminho(navegacaoRodape, primeira.destino)).toBe(false);
  });

  it('marca como planejada só a seção em que nenhum item está pronto', () => {
    const [inicio, ...demais] = navegacaoPrincipal;

    expect(inicio && secaoPlanejada(inicio)).toBe(false);
    expect(demais.every(secaoPlanejada)).toBe(true);
  });
});
