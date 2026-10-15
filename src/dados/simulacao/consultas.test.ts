import { describe, expect, it } from 'vitest';
import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import { periodosDashboard } from '@/modelos/rotulos';
import { distribuirExecucoes, gerarConsultasDetalhadas, paginarConsultas, tipoDoComando } from './consultas';
import type { ParametrosDaLista } from './consultas';
import { gerarConsultas, gerarIndicadores } from './series';

const agora = new Date(2026, 9, 7, 15, 23);
const TOLERANCIA_DO_ARREDONDAMENTO = 2.5;

const parametros: ParametrosDaLista = {
  busca: '',
  desempenho: null,
  tipo: null,
  ordenacao: 'PERCENTUAL_TEMPO_TOTAL',
  direcao: 'DESC',
  pagina: 1,
  tamanhoPagina: 25,
};

function somar(consultas: ConsultaDetalhadaDTO[], ler: (consulta: ConsultaDetalhadaDTO) => number): number {
  return consultas.reduce((soma, consulta) => soma + ler(consulta), 0);
}

describe('dados demonstrativos da lista de consultas', () => {
  it('devolve a mesma lista para o mesmo instante', () => {
    for (const periodo of periodosDashboard) {
      expect(gerarConsultasDetalhadas(periodo, agora)).toEqual(gerarConsultasDetalhadas(periodo, agora));
    }
  });

  it('lista tantas consultas quantas o indicador de consultas distintas informa, sem repetir', () => {
    for (const periodo of periodosDashboard) {
      const consultas = gerarConsultasDetalhadas(periodo, agora);

      expect(consultas).toHaveLength(gerarIndicadores(periodo, agora).consultasDistintas);
      expect(new Set(consultas.map((consulta) => consulta.id)).size).toBe(consultas.length);
      expect(new Set(consultas.map((consulta) => consulta.sql)).size).toBe(consultas.length);
    }
  });

  it('soma em execuções o total de consultas do Dashboard', () => {
    for (const periodo of periodosDashboard) {
      const consultas = gerarConsultasDetalhadas(periodo, agora);

      expect(somar(consultas, (consulta) => consulta.quantidadeExecucoes)).toBe(gerarIndicadores(periodo, agora).totalConsultas);
      expect(consultas.every((consulta) => consulta.quantidadeExecucoes >= 1)).toBe(true);
    }
  });

  it('conta as lentas como o indicador do Dashboard', () => {
    for (const periodo of periodosDashboard) {
      const lentas = gerarConsultasDetalhadas(periodo, agora).filter((consulta) => consulta.desempenho === 'LENTA');

      expect(lentas).toHaveLength(gerarIndicadores(periodo, agora).consultasLentas);
    }
  });

  it('começa pelas mesmas consultas, com os mesmos números, que o Dashboard mostra', () => {
    for (const periodo of periodosDashboard) {
      const doDashboard = gerarConsultas(periodo, agora);
      const primeiras = gerarConsultasDetalhadas(periodo, agora).slice(0, doDashboard.length);

      expect(
        primeiras.map(({ id, sql, tempoMedioMs, quantidadeExecucoes, percentualTempoTotal, desempenho }) => ({
          id,
          sql,
          tempoMedioMs,
          quantidadeExecucoes,
          percentualTempoTotal,
          desempenho,
        })),
      ).toEqual(doDashboard);
    }
  });

  it('divide perto de 100% do tempo entre todas as consultas', () => {
    for (const periodo of periodosDashboard) {
      const soma = somar(gerarConsultasDetalhadas(periodo, agora), (consulta) => consulta.percentualTempoTotal);

      expect(Math.abs(soma - 100)).toBeLessThanOrEqual(TOLERANCIA_DO_ARREDONDAMENTO);
    }
  });

  it('mantém o tempo médio entre o mínimo e o máximo e o tempo total coerente com as execuções', () => {
    for (const periodo of periodosDashboard) {
      for (const consulta of gerarConsultasDetalhadas(periodo, agora)) {
        expect(consulta.tempoMinimoMs).toBeGreaterThan(0);
        expect(consulta.tempoMinimoMs).toBeLessThanOrEqual(consulta.tempoMedioMs);
        expect(consulta.tempoMaximoMs).toBeGreaterThanOrEqual(consulta.tempoMedioMs);
        expect(consulta.tempoTotalMs).toBeCloseTo(consulta.quantidadeExecucoes * consulta.tempoMedioMs, 0);
        expect(consulta.linhasPorExecucao).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('reconhece o tipo do comando pela primeira palavra', () => {
    expect(tipoDoComando('SELECT 1')).toBe('SELECT');
    expect(tipoDoComando('  insert into t values ($1)')).toBe('INSERT');
    expect(tipoDoComando('UPDATE t SET a = $1')).toBe('UPDATE');
    expect(tipoDoComando('DELETE FROM t')).toBe('DELETE');
    expect(tipoDoComando('COMMIT')).toBe('OUTRO');
    expect(tipoDoComando('REFRESH MATERIALIZED VIEW v')).toBe('OUTRO');
  });

  it('tem consultas de todos os tipos de comando', () => {
    const tipos = new Set(gerarConsultasDetalhadas('ULTIMAS_24_HORAS', agora).map((consulta) => consulta.tipo));

    expect([...tipos].sort()).toEqual(['DELETE', 'INSERT', 'OUTRO', 'SELECT', 'UPDATE']);
  });

  it('distribui as execuções sem perder nem inventar nenhuma', () => {
    expect(distribuirExecucoes(1000, [0.5, 0.3, 0.2])).toEqual([500, 300, 200]);
    expect(distribuirExecucoes(10, [1, 1, 1]).reduce((soma, parte) => soma + parte, 0)).toBe(10);
    expect(distribuirExecucoes(100, [0.999, 0.0005, 0.0005])).toEqual([98, 1, 1]);
  });
});

describe('lista de consultas simulada', () => {
  const consultas = gerarConsultasDetalhadas('ULTIMAS_24_HORAS', agora);

  it('pagina sem repetir nem pular consulta e informa os totais', () => {
    const primeira = paginarConsultas(consultas, parametros);
    const segunda = paginarConsultas(consultas, { ...parametros, pagina: 2 });

    expect(primeira).toMatchObject({ pagina: 1, tamanhoPagina: 25, totalItens: 42, totalPaginas: 2, totalDoPeriodo: 42 });
    expect(primeira.itens).toHaveLength(25);
    expect(segunda.itens).toHaveLength(17);
    expect(new Set([...primeira.itens, ...segunda.itens].map((consulta) => consulta.id)).size).toBe(42);
  });

  it('devolve a lista vazia, com os totais, numa página além da última', () => {
    const alem = paginarConsultas(consultas, { ...parametros, pagina: 9 });

    expect(alem.itens).toEqual([]);
    expect(alem).toMatchObject({ pagina: 9, totalItens: 42, totalPaginas: 2 });
  });

  it('ordena pelo campo pedido, nos dois sentidos', () => {
    const campos = {
      PERCENTUAL_TEMPO_TOTAL: (consulta: ConsultaDetalhadaDTO) => consulta.percentualTempoTotal,
      TEMPO_MEDIO: (consulta: ConsultaDetalhadaDTO) => consulta.tempoMedioMs,
      TEMPO_MAXIMO: (consulta: ConsultaDetalhadaDTO) => consulta.tempoMaximoMs,
      EXECUCOES: (consulta: ConsultaDetalhadaDTO) => consulta.quantidadeExecucoes,
    } as const;

    for (const [ordenacao, ler] of Object.entries(campos) as [keyof typeof campos, (typeof campos)[keyof typeof campos]][]) {
      const decrescente = paginarConsultas(consultas, { ...parametros, ordenacao, tamanhoPagina: 100 }).itens.map(ler);
      const crescente = paginarConsultas(consultas, { ...parametros, ordenacao, direcao: 'ASC', tamanhoPagina: 100 }).itens.map(ler);

      expect(decrescente).toEqual([...decrescente].sort((a, b) => b - a));
      expect(crescente).toEqual([...crescente].sort((a, b) => a - b));
    }
  });

  it('filtra por desempenho e por tipo de comando', () => {
    const lentas = paginarConsultas(consultas, { ...parametros, desempenho: 'LENTA' });
    const remocoes = paginarConsultas(consultas, { ...parametros, tipo: 'DELETE', tamanhoPagina: 100 });

    expect(lentas.totalItens).toBe(gerarIndicadores('ULTIMAS_24_HORAS', agora).consultasLentas);
    expect(lentas.itens.every((consulta) => consulta.desempenho === 'LENTA')).toBe(true);
    expect(remocoes.totalItens).toBeGreaterThan(0);
    expect(remocoes.itens.every((consulta) => consulta.sql.startsWith('DELETE'))).toBe(true);
    expect(lentas.totalDoPeriodo).toBe(42);
  });

  it('busca no texto do SQL com todos os termos, sem olhar maiúsculas', () => {
    const encontradas = paginarConsultas(consultas, { ...parametros, busca: 'PEDIDOS join', tamanhoPagina: 100 });

    expect(encontradas.totalItens).toBeGreaterThan(0);
    expect(encontradas.totalItens).toBeLessThan(42);
    expect(encontradas.itens.every((consulta) => /pedidos/i.test(consulta.sql) && /join/i.test(consulta.sql))).toBe(true);
  });

  it('combina a busca com os filtros e pode não achar nada', () => {
    const nenhuma = paginarConsultas(consultas, { ...parametros, busca: 'tabela_que_nao_existe', desempenho: 'LENTA' });

    expect(nenhuma).toMatchObject({ itens: [], totalItens: 0, totalPaginas: 0, totalDoPeriodo: 42 });
  });
});
