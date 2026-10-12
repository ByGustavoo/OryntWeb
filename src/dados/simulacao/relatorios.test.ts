import { describe, expect, it } from 'vitest';
import type { PeriodoRelatorio } from '@/modelos/relatorios';
import { variacaoEntre } from '@/regras/comparacaoRelatorio';
import { periodoVizinho } from '@/regras/periodoRelatorio';
import { gerarResumoRelatorio, resumoRelatorioVazio } from './relatorios';

const periodos: PeriodoRelatorio[] = [
  { granularidade: 'DIA', inicio: '2026-10-07' },
  { granularidade: 'SEMANA', inicio: '2026-09-28' },
  { granularidade: 'MES', inicio: '2026-02-01' },
  { granularidade: 'MES', inicio: '2026-09-01' },
];

const pontosEsperados = [24, 7, 28, 30];

describe('dados demonstrativos do resumo', () => {
  it('devolve o mesmo relatório para o mesmo período, em qualquer momento', () => {
    for (const periodo of periodos) {
      expect(gerarResumoRelatorio(periodo)).toEqual(gerarResumoRelatorio(periodo));
    }
  });

  it('informa o último dia do período', () => {
    expect(periodos.map((periodo) => gerarResumoRelatorio(periodo).fim)).toEqual([
      '2026-10-07',
      '2026-10-04',
      '2026-02-28',
      '2026-09-30',
    ]);
  });

  it('gera um ponto por hora no dia e um por dia na semana e no mês, todos dentro do período', () => {
    periodos.forEach((periodo, indice) => {
      const { evolucao, inicio, fim } = gerarResumoRelatorio(periodo);
      const instantes = evolucao.map((ponto) => new Date(ponto.instante).getTime());

      expect(evolucao).toHaveLength(pontosEsperados[indice] ?? 0);
      expect([...instantes].sort((a, b) => a - b)).toEqual(instantes);
      expect(instantes[0]).toBe(new Date(`${inicio}T00:00:00`).getTime());
      expect(instantes[instantes.length - 1]).toBeLessThan(new Date(`${fim}T23:59:59`).getTime());
    });
  });

  it('mantém o total de consultas igual à soma do gráfico', () => {
    for (const periodo of periodos) {
      const { evolucao, indicadores } = gerarResumoRelatorio(periodo);

      expect(indicadores.totalConsultas).toBe(evolucao.reduce((soma, ponto) => soma + ponto.consultas, 0));
    }
  });

  it('mantém o indicador de consultas lentas igual à tabela e à faixa de desempenho', () => {
    for (const periodo of periodos) {
      const { consultas, desempenho, indicadores } = gerarResumoRelatorio(periodo);
      const lentas = consultas.filter((consulta) => consulta.desempenho === 'LENTA').length;

      expect(indicadores.consultasLentas).toBe(lentas);
      expect(desempenho.find((faixa) => faixa.desempenho === 'LENTA')?.consultasDistintas).toBe(lentas);
      expect(lentas).toBeGreaterThan(0);
    }
  });

  it('divide todas as consultas, execuções e o tempo entre as três faixas', () => {
    for (const periodo of periodos) {
      const { desempenho, indicadores } = gerarResumoRelatorio(periodo);
      const somar = (ler: (faixa: (typeof desempenho)[number]) => number) => desempenho.reduce((soma, faixa) => soma + ler(faixa), 0);

      expect(desempenho.map((faixa) => faixa.desempenho)).toEqual(['RAPIDA', 'MODERADA', 'LENTA']);
      expect(somar((faixa) => faixa.consultasDistintas)).toBe(indicadores.consultasDistintas);
      expect(somar((faixa) => faixa.quantidadeExecucoes)).toBe(indicadores.totalConsultas);
      expect(somar((faixa) => faixa.percentualExecucoes)).toBeCloseTo(100, 5);
      expect(somar((faixa) => faixa.percentualTempoTotal)).toBeCloseTo(100, 5);
      expect(desempenho.every((faixa) => faixa.percentualTempoTotal >= 0)).toBe(true);
    }
  });

  it('ordena as consultas pelo peso e nunca atribui a elas mais de 100% do tempo', () => {
    for (const periodo of periodos) {
      const { consultas } = gerarResumoRelatorio(periodo);
      const pesos = consultas.map((consulta) => consulta.percentualTempoTotal);

      expect([...pesos].sort((a, b) => b - a)).toEqual(pesos);
      expect(pesos.reduce((soma, peso) => soma + peso, 0)).toBeLessThanOrEqual(100);
    }
  });

  it('compara cada consulta com o período anterior, e as variações não são todas iguais', () => {
    for (const periodo of periodos) {
      const variacoes = gerarResumoRelatorio(periodo).consultas.map((consulta) => consulta.variacaoTempoMedio);

      expect(variacoes.every((variacao) => variacao !== null)).toBe(true);
      expect(new Set(variacoes).size).toBeGreaterThan(1);
    }
  });

  it('calcula as variações com os mesmos números que devolve, para a Comparação chegar ao mesmo resultado', () => {
    for (const periodo of periodos) {
      const resumo = gerarResumoRelatorio(periodo);
      const anterior = gerarResumoRelatorio(periodoVizinho(periodo, -1));
      const temposAnteriores = new Map(anterior.consultas.map((consulta) => [consulta.id, consulta.tempoMedioMs]));

      expect(resumo.indicadores.variacaoTotalConsultas).toBe(
        variacaoEntre(resumo.indicadores.totalConsultas, anterior.indicadores.totalConsultas),
      );
      expect(resumo.indicadores.variacaoTempoMedio).toBe(
        variacaoEntre(resumo.indicadores.tempoMedioMs, anterior.indicadores.tempoMedioMs),
      );
      for (const consulta of resumo.consultas) {
        expect(consulta.variacaoTempoMedio).toBe(variacaoEntre(consulta.tempoMedioMs, temposAnteriores.get(consulta.id) ?? 0));
      }
    }
  });

  it('acha o pico de conexões dentro do período e abaixo do limite', () => {
    for (const periodo of periodos) {
      const { indicadores, inicio, fim } = gerarResumoRelatorio(periodo);
      const instante = new Date(indicadores.instantePicoConexoes ?? '').getTime();

      expect(indicadores.picoConexoes).toBeGreaterThan(0);
      expect(indicadores.picoConexoes).toBeLessThanOrEqual(indicadores.limiteConexoes);
      expect(instante).toBeGreaterThanOrEqual(new Date(`${inicio}T00:00:00`).getTime());
      expect(instante).toBeLessThanOrEqual(new Date(`${fim}T23:59:59`).getTime());
    }
  });

  it('zera tudo no relatório vazio, sem inventar comparação', () => {
    const vazio = resumoRelatorioVazio({ granularidade: 'SEMANA', inicio: '2026-09-28' });

    expect(vazio.indicadores.totalConsultas).toBe(0);
    expect(vazio.indicadores.variacaoTotalConsultas).toBeNull();
    expect(vazio.indicadores.instantePicoConexoes).toBeNull();
    expect(vazio.evolucao).toEqual([]);
    expect(vazio.desempenho).toEqual([]);
    expect(vazio.consultas).toEqual([]);
    expect(vazio.fim).toBe('2026-10-04');
  });
});
