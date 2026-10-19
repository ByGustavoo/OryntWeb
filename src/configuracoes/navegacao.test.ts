import { describe, expect, it } from 'vitest';
import { caminhos } from '@/rotas/caminhos';
import {
  contemCaminho,
  destinoInicial,
  funcionalidades,
  itemPlanejado,
  navegacaoPrincipal,
  navegacaoRodape,
  secaoPlanejada,
  telasPlanejadas,
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

  it('coloca todas as funcionalidades no menu, cada uma com suas telas', () => {
    for (const funcionalidade of funcionalidades) {
      expect(itens).toContain(funcionalidade);
      expect(funcionalidade.filhos.length).toBeGreaterThan(0);
    }
  });

  it('leva o item com subitens para o primeiro deles e o item simples para o próprio destino', () => {
    const [primeira] = funcionalidades;

    expect(primeira && destinoInicial(primeira)).toBe(primeira?.filhos[0]?.destino);
    expect(destinoInicial(navegacaoRodape)).toBe(navegacaoRodape.destino);
  });

  it('reconhece o item pelo próprio caminho e pelo caminho de qualquer subitem', () => {
    const [primeira, segunda] = funcionalidades;
    if (!primeira || !segunda) throw new Error('Faltam funcionalidades para o teste.');
    const ultimoFilho = primeira.filhos[primeira.filhos.length - 1];

    expect(contemCaminho(primeira, primeira.destino)).toBe(true);
    expect(contemCaminho(primeira, ultimoFilho?.destino ?? '')).toBe(true);
    expect(contemCaminho(primeira, segunda.filhos[0]?.destino ?? '')).toBe(false);
    expect(contemCaminho(navegacaoRodape, primeira.destino)).toBe(false);
  });

  it('não marca como planejada a seção que já tem uma tela pronta', () => {
    const [inicio, analise, gerenciamento] = navegacaoPrincipal;

    expect(inicio && secaoPlanejada(inicio)).toBe(false);
    expect(analise && secaoPlanejada(analise)).toBe(false);
    expect(gerenciamento && secaoPlanejada(gerenciamento)).toBe(false);
  });

  it('trata como planejado só o item em que todas as telas estão planejadas', () => {
    const [relatorios, consultas] = funcionalidades;
    if (!relatorios || !consultas) throw new Error('Faltam funcionalidades para o teste.');

    const [, , objetos, usuarios] = funcionalidades;

    expect(itemPlanejado(relatorios)).toBe(false);
    expect(itemPlanejado(consultas)).toBe(false);
    expect(objetos && itemPlanejado(objetos)).toBe(false);
    expect(usuarios && itemPlanejado(usuarios)).toBe(true);
    expect(itemPlanejado(navegacaoRodape)).toBe(false);
  });

  it('não deixa nenhuma tela de Consultas SQL como planejada', () => {
    const [, consultas] = funcionalidades;
    if (!consultas) throw new Error('Faltam as consultas para o teste.');

    expect(destinoInicial(consultas)).toBe(caminhos.consultasTodas);
    expect(telasPlanejadas(consultas)).toEqual([]);
  });

  it('não deixa nenhuma tela dos relatórios como planejada', () => {
    const [relatorios] = funcionalidades;
    if (!relatorios) throw new Error('Faltam os relatórios para o teste.');
    const planejadas = telasPlanejadas(relatorios).map((tela) => tela.destino);

    expect(planejadas).toEqual([]);
    expect(destinoInicial(relatorios)).toBe(caminhos.relatoriosResumo);
  });

  it('deixa Visões e Índices prontas e as outras telas de Objetos do banco planejadas', () => {
    const [, , objetos] = funcionalidades;
    if (!objetos) throw new Error('Faltam os objetos do banco para o teste.');

    expect(destinoInicial(objetos)).toBe(caminhos.objetosVisoes);
    expect(telasPlanejadas(objetos).map((tela) => tela.destino)).toEqual([
      caminhos.objetosTabelas,
      caminhos.objetosFuncoes,
    ]);
  });
});