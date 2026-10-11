import { describe, expect, it } from 'vitest';
import { periodosDashboard } from '@/modelos/rotulos';
import { classificarDesempenho, gerarAtividade, gerarConsultas, gerarIndicadores, janelasPeriodo } from './series';

const agora = new Date(2026, 9, 7, 15, 23);

describe('dados demonstrativos do dashboard', () => {
  it('devolve os mesmos números para o mesmo instante', () => {
    for (const periodo of periodosDashboard) {
      expect(gerarAtividade(periodo, agora)).toEqual(gerarAtividade(periodo, agora));
      expect(gerarIndicadores(periodo, agora)).toEqual(gerarIndicadores(periodo, agora));
    }
  });

  it('gera um ponto por intervalo, em ordem crescente e só com intervalos já encerrados', () => {
    for (const periodo of periodosDashboard) {
      const pontos = gerarAtividade(periodo, agora);
      const instantes = pontos.map((ponto) => new Date(ponto.instante).getTime());
      expect(pontos).toHaveLength(janelasPeriodo[periodo].pontos);
      expect([...instantes].sort((a, b) => a - b)).toEqual(instantes);
      expect(instantes[instantes.length - 1]).toBeLessThan(agora.getTime());
    }
  });

  it('mantém o total de consultas igual à soma do gráfico', () => {
    for (const periodo of periodosDashboard) {
      const soma = gerarAtividade(periodo, agora).reduce((total, ponto) => total + ponto.consultas, 0);
      expect(gerarIndicadores(periodo, agora).totalConsultas).toBe(soma);
    }
  });

  it('mantém o indicador de consultas lentas igual à contagem da tabela', () => {
    for (const periodo of periodosDashboard) {
      const lentas = gerarConsultas(periodo, agora).filter((consulta) => consulta.desempenho === 'LENTA').length;
      expect(gerarIndicadores(periodo, agora).consultasLentas).toBe(lentas);
      expect(lentas).toBeGreaterThan(0);
    }
  });

  it('nunca atribui mais de 100% do tempo total às consultas listadas', () => {
    for (const periodo of periodosDashboard) {
      const consultas = gerarConsultas(periodo, agora);
      const soma = consultas.reduce((total, consulta) => total + consulta.percentualTempoTotal, 0);
      expect(soma).toBeLessThanOrEqual(100);
      expect(consultas[0]?.percentualTempoTotal).toBeGreaterThanOrEqual(consultas[1]?.percentualTempoTotal ?? 0);
    }
  });

  it('classifica o desempenho pelos limites de 100 ms e 500 ms', () => {
    expect(classificarDesempenho(99.9)).toBe('RAPIDA');
    expect(classificarDesempenho(100)).toBe('MODERADA');
    expect(classificarDesempenho(499.9)).toBe('MODERADA');
    expect(classificarDesempenho(500)).toBe('LENTA');
  });
});
