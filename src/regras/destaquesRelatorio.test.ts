import { describe, expect, it } from 'vitest';
import type { ResumoRelatorioDTO } from '@/modelos/relatorios';
import {
  cabecalhoDoResumo,
  consultasPorExtenso,
  montarDestaques,
  quantidadePorExtenso,
  resumirDesempenho,
  textoDosDestaques,
} from './destaquesRelatorio';

function criarResumo(mudancas: Partial<ResumoRelatorioDTO> = {}): ResumoRelatorioDTO {
  return {
    granularidade: 'SEMANA',
    inicio: '2026-10-05',
    fim: '2026-10-11',
    indicadores: {
      totalConsultas: 4_812_300,
      variacaoTotalConsultas: 3.2,
      tempoMedioMs: 38.9,
      variacaoTempoMedio: -4.1,
      consultasLentas: 3,
      consultasDistintas: 42,
      picoConexoes: 46,
      instantePicoConexoes: new Date(2026, 9, 7, 14, 30).toISOString(),
      limiteConexoes: 100,
    },
    evolucao: [
      { instante: new Date(2026, 9, 5).toISOString(), consultas: 700_000, tempoMedioMs: 38 },
      { instante: new Date(2026, 9, 7).toISOString(), consultas: 912_400, tempoMedioMs: 41 },
      { instante: new Date(2026, 9, 10).toISOString(), consultas: 380_000, tempoMedioMs: 35 },
    ],
    desempenho: [
      { desempenho: 'RAPIDA', consultasDistintas: 36, quantidadeExecucoes: 4_200_000, percentualExecucoes: 87.3, percentualTempoTotal: 13.2 },
      { desempenho: 'MODERADA', consultasDistintas: 3, quantidadeExecucoes: 587_000, percentualExecucoes: 12.2, percentualTempoTotal: 73.7 },
      { desempenho: 'LENTA', consultasDistintas: 3, quantidadeExecucoes: 25_300, percentualExecucoes: 0.5, percentualTempoTotal: 13.1 },
    ],
    consultas: [
      {
        id: 'q-pedidos',
        sql: 'SELECT * FROM pedidos WHERE cliente_id = $1',
        tempoMedioMs: 184,
        quantidadeExecucoes: 288_738,
        percentualTempoTotal: 28.4,
        desempenho: 'MODERADA',
        variacaoTempoMedio: 2.5,
      },
      {
        id: 'q-usuarios',
        sql: 'SELECT id, email FROM usuarios WHERE lower(email) = lower($1)',
        tempoMedioMs: 268,
        quantidadeExecucoes: 240_615,
        percentualTempoTotal: 34.4,
        desempenho: 'MODERADA',
        variacaoTempoMedio: -6,
      },
    ],
    ...mudancas,
  };
}

function comIndicadores(mudancas: Partial<ResumoRelatorioDTO['indicadores']>): ResumoRelatorioDTO {
  const resumo = criarResumo();
  return { ...resumo, indicadores: { ...resumo.indicadores, ...mudancas } };
}

function textos(resumo: ResumoRelatorioDTO): string[] {
  return montarDestaques(resumo).map((destaque) => destaque.texto);
}

describe('consultasPorExtenso', () => {
  it('escreve o número inteiro abaixo de um milhão', () => {
    expect(consultasPorExtenso(1)).toBe('1 consulta');
    expect(consultasPorExtenso(395_204)).toBe('395.204 consultas');
  });

  it('passa para milhões e bilhões, com singular abaixo de dois', () => {
    expect(consultasPorExtenso(1_400_000)).toBe('1,4 milhão de consultas');
    expect(consultasPorExtenso(96_420_000)).toBe('96,4 milhões de consultas');
    expect(consultasPorExtenso(2_100_000_000)).toBe('2,1 bilhões de consultas');
  });
});

describe('quantidadePorExtenso', () => {
  it('escreve só a quantidade, para a segunda menção na mesma frase', () => {
    expect(quantidadePorExtenso(395_204)).toBe('395.204');
    expect(quantidadePorExtenso(1_400_000)).toBe('1,4 milhão');
    expect(quantidadePorExtenso(3_000_000)).toBe('3,0 milhões');
  });
});

describe('montarDestaques', () => {
  it('conta o volume, o tempo, o pico e a consulta mais pesada, nesta ordem', () => {
    expect(montarDestaques(criarResumo()).map((destaque) => destaque.tipo)).toEqual(['VOLUME', 'TEMPO', 'PICO', 'CONSULTA']);
    expect(textos(criarResumo())).toEqual([
      'O banco executou 4,8 milhões de consultas, 3,2% a mais que na semana anterior.',
      'O tempo médio de execução ficou em 38,9 ms, 4,1% menor que na semana anterior.',
      'O pico de volume foi na quarta-feira, 7 de outubro, com 912.400 consultas.',
      'A consulta que mais pesou respondeu por 34,4% do tempo do banco, com tempo médio de 268 ms.',
    ]);
  });

  it('marca a queda do tempo como boa e a alta como ponto de atenção', () => {
    const tom = (resumo: ResumoRelatorioDTO) => montarDestaques(resumo).find((destaque) => destaque.tipo === 'TEMPO')?.tom;

    expect(tom(comIndicadores({ variacaoTempoMedio: -4.1 }))).toBe('positivo');
    expect(tom(comIndicadores({ variacaoTempoMedio: 4.1 }))).toBe('atencao');
    expect(tom(comIndicadores({ variacaoTempoMedio: 0 }))).toBe('neutro');
  });

  it('diz quando o volume caiu e quando ficou igual', () => {
    expect(textos(comIndicadores({ variacaoTotalConsultas: -7.5 }))[0]).toBe(
      'O banco executou 4,8 milhões de consultas, 7,5% a menos que na semana anterior.',
    );
    expect(textos(comIndicadores({ variacaoTotalConsultas: 0 }))[0]).toBe(
      'O banco executou 4,8 milhões de consultas, o mesmo volume da semana anterior.',
    );
  });

  it('não compara quando não há período anterior', () => {
    const frases = textos(comIndicadores({ variacaoTotalConsultas: null, variacaoTempoMedio: null }));

    expect(frases[0]).toBe('O banco executou 4,8 milhões de consultas.');
    expect(frases[1]).toBe('O tempo médio de execução ficou em 38,9 ms.');
  });

  it('usa a hora no relatório de um dia e o gênero certo do período', () => {
    const dia = criarResumo({
      granularidade: 'DIA',
      inicio: '2026-10-07',
      fim: '2026-10-07',
      evolucao: [
        { instante: new Date(2026, 9, 7, 3).toISOString(), consultas: 9_000, tempoMedioMs: 33 },
        { instante: new Date(2026, 9, 7, 14).toISOString(), consultas: 39_512, tempoMedioMs: 44 },
      ],
    });

    expect(textos(dia)[0]).toBe('O banco executou 4,8 milhões de consultas, 3,2% a mais que no dia anterior.');
    expect(textos(dia)[2]).toBe('O pico de volume foi às 14h, com 39.512 consultas.');
  });

  it('leva o SQL da consulta mais pesada e marca atenção quando ela é lenta', () => {
    const resumo = criarResumo();
    const [primeira] = resumo.consultas;
    if (!primeira) throw new Error('Falta a consulta do teste.');
    const lenta = criarResumo({ consultas: [{ ...primeira, percentualTempoTotal: 60, desempenho: 'LENTA' }] });

    expect(montarDestaques(resumo).at(-1)?.sql).toBe('SELECT id, email FROM usuarios WHERE lower(email) = lower($1)');
    expect(montarDestaques(resumo).at(-1)?.tom).toBe('neutro');
    expect(montarDestaques(lenta).at(-1)?.tom).toBe('atencao');
  });

  it('não escreve nada quando o período não teve consultas', () => {
    expect(montarDestaques(comIndicadores({ totalConsultas: 0 }))).toEqual([]);
  });
});

describe('resumirDesempenho', () => {
  it('aponta a faixa que mais consumiu tempo', () => {
    expect(resumirDesempenho(criarResumo().desempenho)).toBe(
      'As consultas moderadas fizeram 12,2% das execuções e consumiram 73,7% do tempo do banco.',
    );
  });

  it('não diz nada sem faixas', () => {
    expect(resumirDesempenho([])).toBeNull();
  });
});

describe('texto para copiar', () => {
  it('identifica a conexão e o período, e avisa quando os dados são demonstrativos', () => {
    const periodo = { granularidade: 'SEMANA', inicio: '2026-10-05' } as const;

    expect(cabecalhoDoResumo('Loja', periodo, false)).toBe('Resumo de Loja, de 5 a 11 de outubro de 2026');
    expect(cabecalhoDoResumo('Loja', periodo, true)).toBe(
      'Resumo de Loja, de 5 a 11 de outubro de 2026 (dados demonstrativos)',
    );
  });

  it('põe uma frase por linha e o SQL logo abaixo da frase dele', () => {
    const texto = textoDosDestaques('Resumo de Loja', [
      { tipo: 'VOLUME', tom: 'neutro', texto: 'Primeira frase.' },
      { tipo: 'CONSULTA', tom: 'neutro', texto: 'Segunda frase.', sql: 'SELECT 1' },
    ]);

    expect(texto).toBe('Resumo de Loja\n- Primeira frase.\n- Segunda frase.\n  SELECT 1');
  });
});
