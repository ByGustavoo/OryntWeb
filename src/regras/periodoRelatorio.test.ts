import { describe, expect, it } from 'vitest';
import type { PeriodoRelatorio } from '@/modelos/relatorios';
import {
  anosDoPeriodo,
  diasDoPeriodo,
  distanciaEmPassos,
  ehPrimeiroPeriodoDisponivel,
  ehUltimoPeriodoFechado,
  escreverData,
  fimDoPeriodo,
  lerData,
  lerPeriodo,
  periodoComoReferencia,
  periodoNaFrase,
  periodoVizinho,
  primeiroPeriodoDisponivel,
  rotuloCurtoDoPeriodo,
  rotuloDoPeriodo,
  trocarGranularidade,
  ultimoPeriodoFechado,
} from './periodoRelatorio';

const domingo = new Date(2026, 9, 11, 16, 5);

describe('datas do relatório', () => {
  it('lê e escreve a data no formato AAAA-MM-DD, no fuso local', () => {
    expect(escreverData(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(lerData('2026-01-05')?.getDate()).toBe(5);
  });

  it('recusa data que não existe ou fora do formato', () => {
    expect(lerData('2026-02-30')).toBeNull();
    expect(lerData('2026-2-3')).toBeNull();
    expect(lerData('05/01/2026')).toBeNull();
  });
});

describe('último período fechado', () => {
  it('é ontem, a semana passada de segunda a domingo ou o mês passado', () => {
    expect(ultimoPeriodoFechado('DIA', domingo)).toEqual({ granularidade: 'DIA', inicio: '2026-10-10' });
    expect(ultimoPeriodoFechado('SEMANA', domingo)).toEqual({ granularidade: 'SEMANA', inicio: '2026-09-28' });
    expect(ultimoPeriodoFechado('MES', domingo)).toEqual({ granularidade: 'MES', inicio: '2026-09-01' });
  });

  it('só considera a semana fechada depois que o domingo termina', () => {
    const segunda = new Date(2026, 9, 12, 0, 1);

    expect(ultimoPeriodoFechado('SEMANA', segunda).inicio).toBe('2026-10-05');
    expect(fimDoPeriodo(ultimoPeriodoFechado('SEMANA', segunda))).toBe('2026-10-11');
  });

  it('atravessa a virada do ano', () => {
    const anoNovo = new Date(2026, 0, 1, 9);

    expect(ultimoPeriodoFechado('DIA', anoNovo).inicio).toBe('2025-12-31');
    expect(ultimoPeriodoFechado('MES', anoNovo).inicio).toBe('2025-12-01');
  });
});

describe('limites do histórico', () => {
  it('começa no primeiro período inteiro dentro dos últimos 12 meses', () => {
    expect(primeiroPeriodoDisponivel('DIA', domingo).inicio).toBe('2025-10-01');
    expect(primeiroPeriodoDisponivel('MES', domingo).inicio).toBe('2025-10-01');
    expect(primeiroPeriodoDisponivel('SEMANA', domingo).inicio).toBe('2025-10-06');
  });

  it('reconhece as duas pontas', () => {
    const ultimo = ultimoPeriodoFechado('SEMANA', domingo);
    const primeiro = primeiroPeriodoDisponivel('SEMANA', domingo);

    expect(ehUltimoPeriodoFechado(ultimo, domingo)).toBe(true);
    expect(ehUltimoPeriodoFechado(periodoVizinho(ultimo, -1), domingo)).toBe(false);
    expect(ehPrimeiroPeriodoDisponivel(primeiro, domingo)).toBe(true);
    expect(ehPrimeiroPeriodoDisponivel(periodoVizinho(primeiro, 1), domingo)).toBe(false);
  });
});

describe('navegação entre períodos', () => {
  it('anda um dia, uma semana ou um mês por vez', () => {
    expect(periodoVizinho({ granularidade: 'DIA', inicio: '2026-03-01' }, -1).inicio).toBe('2026-02-28');
    expect(periodoVizinho({ granularidade: 'SEMANA', inicio: '2026-09-28' }, 1).inicio).toBe('2026-10-05');
    expect(periodoVizinho({ granularidade: 'MES', inicio: '2026-01-01' }, -1).inicio).toBe('2025-12-01');
  });

  it('lista todos os dias do período', () => {
    expect(diasDoPeriodo({ granularidade: 'SEMANA', inicio: '2026-09-28' })).toHaveLength(7);
    expect(diasDoPeriodo({ granularidade: 'MES', inicio: '2026-02-01' })).toHaveLength(28);
    expect(diasDoPeriodo({ granularidade: 'MES', inicio: '2026-09-01' }).map(escreverData).at(-1)).toBe('2026-09-30');
  });

  it('ao trocar a granularidade, fica no período que contém o último dia do atual', () => {
    const setembro: PeriodoRelatorio = { granularidade: 'MES', inicio: '2026-09-01' };

    expect(trocarGranularidade(setembro, 'DIA', domingo).inicio).toBe('2026-09-30');
    expect(trocarGranularidade(setembro, 'SEMANA', domingo).inicio).toBe('2026-09-28');
    expect(trocarGranularidade(setembro, 'MES', domingo)).toBe(setembro);
  });

  it('ao trocar a granularidade, nunca cai num período em andamento', () => {
    const semanaPassada: PeriodoRelatorio = { granularidade: 'SEMANA', inicio: '2026-09-28' };

    expect(trocarGranularidade(semanaPassada, 'MES', domingo).inicio).toBe('2026-09-01');
  });
});

describe('leitura de um período guardado', () => {
  it('aceita um período alinhado, fechado e dentro do histórico', () => {
    expect(lerPeriodo({ granularidade: 'SEMANA', inicio: '2026-09-28' }, domingo)).toEqual({
      granularidade: 'SEMANA',
      inicio: '2026-09-28',
    });
  });

  it('recusa o que não é período, o desalinhado, o em andamento e o antigo demais', () => {
    expect(lerPeriodo(null, domingo)).toBeNull();
    expect(lerPeriodo({ granularidade: 'ANO', inicio: '2026-01-01' }, domingo)).toBeNull();
    expect(lerPeriodo({ granularidade: 'SEMANA', inicio: '2026-09-30' }, domingo)).toBeNull();
    expect(lerPeriodo({ granularidade: 'MES', inicio: '2026-09-15' }, domingo)).toBeNull();
    expect(lerPeriodo({ granularidade: 'SEMANA', inicio: '2026-10-05' }, domingo)).toBeNull();
    expect(lerPeriodo({ granularidade: 'DIA', inicio: '2026-10-11' }, domingo)).toBeNull();
    expect(lerPeriodo({ granularidade: 'MES', inicio: '2025-09-01' }, domingo)).toBeNull();
  });
});

describe('texto do período', () => {
  it('escreve o dia, a semana e o mês por extenso', () => {
    expect(rotuloDoPeriodo({ granularidade: 'DIA', inicio: '2026-10-10' })).toBe('10 de outubro de 2026');
    expect(rotuloDoPeriodo({ granularidade: 'SEMANA', inicio: '2026-10-05' })).toBe('5 a 11 de outubro de 2026');
    expect(rotuloDoPeriodo({ granularidade: 'MES', inicio: '2026-09-01' })).toBe('setembro de 2026');
  });

  it('repete só o que muda quando a semana cruza o mês ou o ano', () => {
    expect(rotuloDoPeriodo({ granularidade: 'SEMANA', inicio: '2026-09-28' })).toBe(
      '28 de setembro a 4 de outubro de 2026',
    );
    expect(rotuloDoPeriodo({ granularidade: 'SEMANA', inicio: '2025-12-29' })).toBe(
      '29 de dezembro de 2025 a 4 de janeiro de 2026',
    );
  });

  it('usa o ordinal no primeiro dia do mês', () => {
    expect(rotuloDoPeriodo({ granularidade: 'DIA', inicio: '2026-10-01' })).toBe('1º de outubro de 2026');
    expect(rotuloDoPeriodo({ granularidade: 'SEMANA', inicio: '2026-06-01' })).toBe('1º a 7 de junho de 2026');
  });

  it('encaixa o período numa frase', () => {
    expect(periodoNaFrase({ granularidade: 'DIA', inicio: '2026-10-10' })).toBe('em 10 de outubro de 2026');
    expect(periodoNaFrase({ granularidade: 'SEMANA', inicio: '2026-10-05' })).toBe('de 5 a 11 de outubro de 2026');
    expect(periodoNaFrase({ granularidade: 'MES', inicio: '2026-09-01' })).toBe('em setembro de 2026');
  });
});

describe('distância entre períodos', () => {
  it('conta os passos de um período ao outro, no tamanho deles', () => {
    expect(distanciaEmPassos({ granularidade: 'DIA', inicio: '2026-10-10' }, { granularidade: 'DIA', inicio: '2026-10-03' })).toBe(-7);
    expect(distanciaEmPassos({ granularidade: 'SEMANA', inicio: '2026-09-28' }, { granularidade: 'SEMANA', inicio: '2026-08-31' })).toBe(-4);
    expect(distanciaEmPassos({ granularidade: 'MES', inicio: '2026-09-01' }, { granularidade: 'MES', inicio: '2025-12-01' })).toBe(-9);
    expect(distanciaEmPassos({ granularidade: 'MES', inicio: '2026-06-01' }, { granularidade: 'MES', inicio: '2026-09-01' })).toBe(3);
  });
});

describe('rótulos para comparar períodos', () => {
  it('escreve o período por extenso sem o ano quando ele não é necessário', () => {
    expect(rotuloDoPeriodo({ granularidade: 'DIA', inicio: '2026-10-10' }, false)).toBe('10 de outubro');
    expect(rotuloDoPeriodo({ granularidade: 'SEMANA', inicio: '2026-10-05' }, false)).toBe('5 a 11 de outubro');
    expect(rotuloDoPeriodo({ granularidade: 'SEMANA', inicio: '2026-09-28' }, false)).toBe('28 de setembro a 4 de outubro');
    expect(rotuloDoPeriodo({ granularidade: 'MES', inicio: '2026-09-01' }, false)).toBe('setembro');
  });

  it('mantém os dois anos na semana que vira o ano', () => {
    expect(rotuloDoPeriodo({ granularidade: 'SEMANA', inicio: '2025-12-29' }, false)).toBe(
      '29 de dezembro de 2025 a 4 de janeiro de 2026',
    );
  });

  it('tem uma forma curta, em dia e mês, para legendas e cabeçalhos de tabela', () => {
    expect(rotuloCurtoDoPeriodo({ granularidade: 'DIA', inicio: '2026-10-07' })).toBe('07/10');
    expect(rotuloCurtoDoPeriodo({ granularidade: 'DIA', inicio: '2026-10-07' }, true)).toBe('07/10/2026');
    expect(rotuloCurtoDoPeriodo({ granularidade: 'SEMANA', inicio: '2026-09-28' })).toBe('28/09 a 04/10');
    expect(rotuloCurtoDoPeriodo({ granularidade: 'SEMANA', inicio: '2026-09-28' }, true)).toBe('28/09 a 04/10/2026');
    expect(rotuloCurtoDoPeriodo({ granularidade: 'MES', inicio: '2026-09-01' })).toBe('setembro');
    expect(rotuloCurtoDoPeriodo({ granularidade: 'MES', inicio: '2026-09-01' }, true)).toBe('setembro de 2026');
  });

  it('lista os anos que o período toca', () => {
    expect(anosDoPeriodo({ granularidade: 'MES', inicio: '2026-09-01' })).toEqual([2026]);
    expect(anosDoPeriodo({ granularidade: 'SEMANA', inicio: '2025-12-29' })).toEqual([2025, 2026]);
  });

  it('cita o período como referência dentro de uma frase', () => {
    expect(periodoComoReferencia({ granularidade: 'DIA', inicio: '2026-10-09' }, false)).toBe('em 9 de outubro');
    expect(periodoComoReferencia({ granularidade: 'SEMANA', inicio: '2026-09-21' }, false)).toBe('na semana de 21 a 27 de setembro');
    expect(periodoComoReferencia({ granularidade: 'MES', inicio: '2026-08-01' })).toBe('em agosto de 2026');
  });
});
