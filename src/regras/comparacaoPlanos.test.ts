import { describe, expect, it } from 'vitest';
import type { NoPlanoDTO, PlanoExecucaoDTO, VersaoPlanoDTO } from '@/modelos/planos';
import {
  acessosPorTabela,
  etapasAlteradas,
  frasesDaComparacao,
  linhasLidasDasTabelas,
  medidasDaComparacao,
} from './comparacaoPlanos';
import type { LadoDaComparacao } from './comparacaoPlanos';

function no(parcial: Partial<NoPlanoDTO>): NoPlanoDTO {
  return {
    id: 1,
    tipo: 'Result',
    operacao: null,
    juncao: null,
    estrategia: null,
    sentidoInverso: false,
    relacao: null,
    apelido: null,
    indice: null,
    custoInicial: 0,
    custoTotal: 1,
    linhasEstimadas: 1,
    larguraBytes: 4,
    tempoInicialMs: 0,
    tempoTotalMs: 1,
    linhasReais: 1,
    lacos: 1,
    linhasRemovidasPeloFiltro: null,
    condicoes: [],
    buffers: { emCache: 0, lidos: 0, temporariosLidos: 0, temporariosEscritos: 0 },
    ordenacao: null,
    memoria: null,
    filhos: [],
    ...parcial,
  };
}

function plano(id: string, raiz: NoPlanoDTO, tempoExecucaoMs: number): PlanoExecucaoDTO {
  return { id, registradoEm: '2026-10-14T13:00:00.000Z', tempoPlanejamentoMs: 0.2, tempoExecucaoMs, raiz, sugestoes: [] };
}

function versao(id: string, tempoMedioMs: number, quantidadeExecucoes: number): VersaoPlanoDTO {
  return { id, primeiroRegistro: '2026-08-04T12:00:00.000Z', ultimoRegistro: '2026-10-14T13:00:00.000Z', quantidadeExecucoes, tempoMedioMs };
}

const varredura = no({
  id: 2,
  tipo: 'Seq Scan',
  relacao: 'pedidos',
  linhasReais: 14,
  linhasRemovidasPeloFiltro: 1_953_486,
  tempoTotalMs: 200,
  buffers: { emCache: 8140, lidos: 16_420, temporariosLidos: 0, temporariosEscritos: 0 },
});
const atual = plano(
  'v2',
  no({ id: 1, tipo: 'Sort', tempoTotalMs: 215, buffers: varredura.buffers, filhos: [varredura] }),
  217,
);

const indice = no({ id: 3, tipo: 'Bitmap Index Scan', indice: 'pedidos_cliente_id_idx', linhasReais: 14, tempoTotalMs: 20 });
const heap = no({
  id: 2,
  tipo: 'Bitmap Heap Scan',
  relacao: 'pedidos',
  linhasReais: 14,
  tempoTotalMs: 150,
  buffers: { emCache: 6, lidos: 14, temporariosLidos: 0, temporariosEscritos: 0 },
  filhos: [indice],
});
const anterior = plano('v1', no({ id: 1, tipo: 'Sort', tempoTotalMs: 165, buffers: heap.buffers, filhos: [heap] }), 170);

const ladoAtual: LadoDaComparacao = { plano: atual, versao: versao('v2', 221, 61_913), rotulo: 'Plano atual' };
const ladoAnterior: LadoDaComparacao = { plano: anterior, versao: versao('v1', 170, 688_661), rotulo: 'Plano anterior' };

describe('acessosPorTabela', () => {
  it('descreve como cada tabela é lida, levando o índice do Bitmap Index Scan ao Bitmap Heap Scan', () => {
    expect(acessosPorTabela(atual).get('pedidos')).toEqual({ descricao: 'Seq Scan', nos: [2] });
    expect(acessosPorTabela(anterior).get('pedidos')).toEqual({
      descricao: 'Bitmap Heap Scan pelo índice pedidos_cliente_id_idx',
      nos: [2, 3],
    });
  });

  it('marca as etapas das tabelas que mudaram de leitura nos dois planos', () => {
    expect(etapasAlteradas(atual, anterior)).toEqual({ principal: [2], base: [2, 3] });
    expect(etapasAlteradas(atual, atual)).toEqual({ principal: [], base: [] });
  });

  it('soma as linhas lidas das tabelas, com as descartadas pelo filtro', () => {
    expect(linhasLidasDasTabelas(atual)).toBe(1_953_500);
    expect(linhasLidasDasTabelas(anterior)).toBe(14);
  });
});

describe('frasesDaComparacao', () => {
  it('diz quanto um plano é mais lento, o que mudou em cada tabela e quanto cada um lê', () => {
    expect(frasesDaComparacao(ladoAtual, ladoAnterior)).toEqual([
      {
        tipo: 'TEMPO',
        tom: 'atencao',
        texto: 'O plano atual leva 221 ms em média, 30,0% a mais que o plano anterior, com 170 ms.',
      },
      {
        tipo: 'ACESSO',
        tom: 'neutro',
        texto: 'Em pedidos, o plano atual faz Seq Scan e o plano anterior, Bitmap Heap Scan pelo índice pedidos_cliente_id_idx.',
      },
      {
        tipo: 'LEITURA',
        tom: 'atencao',
        texto: 'O plano atual lê 1.953.500 linhas das tabelas a cada execução, contra 14 no plano anterior.',
      },
    ]);
  });

  it('inverte o julgamento quando o plano da esquerda é o mais rápido', () => {
    const [tempo, , leitura] = frasesDaComparacao(ladoAnterior, ladoAtual);
    expect(tempo).toMatchObject({ tom: 'positivo', texto: 'O plano anterior leva 170 ms em média, 23,1% a menos que o plano atual, com 221 ms.' });
    expect(leitura?.tom).toBe('positivo');
  });

  it('explica quando os dois planos têm as mesmas etapas', () => {
    const parecido: LadoDaComparacao = { ...ladoAnterior, plano: { ...atual, id: 'v1' }, versao: versao('v1', 219, 10) };
    expect(frasesDaComparacao(ladoAtual, parecido)).toEqual([
      { tipo: 'TEMPO', tom: 'neutro', texto: 'O plano atual e o plano anterior têm praticamente o mesmo tempo médio: 221 ms e 219 ms.' },
      {
        tipo: 'IGUAIS',
        tom: 'neutro',
        texto: 'Os dois planos têm as mesmas etapas: a diferença de tempo vem da carga do banco ou dos dados, não do plano.',
      },
    ]);
  });

  it('diz quando um plano não lê a tabela que o outro lê', () => {
    const semTabela: LadoDaComparacao = { ...ladoAnterior, plano: plano('v1', no({ id: 1 }), 1) };
    const acesso = frasesDaComparacao(ladoAtual, semTabela).find((frase) => frase.tipo === 'ACESSO');
    expect(acesso?.texto).toBe('Em pedidos, o plano atual faz Seq Scan e o plano anterior não lê a tabela.');
  });
});

describe('medidasDaComparacao', () => {
  it('compara as medidas das duas versões e das duas execuções registradas', () => {
    const medidas = medidasDaComparacao(ladoAtual, ladoAnterior);
    expect(medidas.map((medida) => medida.rotulo)).toEqual([
      'Tempo médio nos 30 dias',
      'Execuções nos 30 dias',
      'Tempo da execução registrada',
      'Tempo de planejamento',
      'Linhas lidas das tabelas',
      'Dados lidos',
      'Etapas',
    ]);
    expect(medidas[0]).toEqual({
      rotulo: 'Tempo médio nos 30 dias',
      principal: '221 ms',
      base: '170 ms',
      variacao: 30,
      razao: 1.3,
      favoravel: 'QUEDA',
    });
    expect(medidas[3]).toMatchObject({ principal: '0,20 ms', base: '0,20 ms' });
    expect(medidas[4]?.razao).toBeCloseTo(139_535.7, 1);
    expect(medidas[1]?.favoravel).toBeNull();
    expect(medidas[3]?.variacao).toBe(0);
    expect(medidas[6]).toMatchObject({ principal: '2', base: '3', variacao: -33.3 });
  });
});
