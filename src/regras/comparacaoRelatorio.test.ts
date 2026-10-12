import { describe, expect, it } from 'vitest';
import type { ConsultaRelatorioDTO, PeriodoRelatorio, ResumoRelatorioDTO } from '@/modelos/relatorios';
import {
  acompanharPeriodo,
  alinharEvolucao,
  atalhoEmUso,
  atalhosDeBase,
  baseDoAtalho,
  basePadrao,
  cabecalhoDaComparacao,
  compararConsultas,
  compararDesempenho,
  compararIndicadores,
  filtrarConsultas,
  inverterPeriodos,
  lerBase,
  montarMudancas,
  referenciaDaBase,
  resumirMudancaDeDesempenho,
  resumirTendencias,
  rotulosDaComparacao,
  rotulosDoSeletor,
  titulosDaComparacao,
  variacaoEntre,
  vizinhaDaBase,
} from './comparacaoRelatorio';

const domingo = new Date(2026, 9, 11, 16, 5);

function semana(inicio: string): PeriodoRelatorio {
  return { granularidade: 'SEMANA', inicio };
}

function mes(inicio: string): PeriodoRelatorio {
  return { granularidade: 'MES', inicio };
}

function dia(inicio: string): PeriodoRelatorio {
  return { granularidade: 'DIA', inicio };
}

function consulta(id: string, tempoMedioMs: number, quantidadeExecucoes: number): ConsultaRelatorioDTO {
  return {
    id,
    sql: `SELECT ${id}`,
    tempoMedioMs,
    quantidadeExecucoes,
    percentualTempoTotal: 10,
    desempenho: tempoMedioMs >= 100 ? 'MODERADA' : 'RAPIDA',
    variacaoTempoMedio: null,
  };
}

function criarResumo(mudancas: Partial<ResumoRelatorioDTO> = {}): ResumoRelatorioDTO {
  return {
    granularidade: 'SEMANA',
    inicio: '2026-09-28',
    fim: '2026-10-04',
    indicadores: {
      totalConsultas: 2_900_000,
      variacaoTotalConsultas: null,
      tempoMedioMs: 37.2,
      variacaoTempoMedio: null,
      consultasLentas: 3,
      consultasDistintas: 42,
      picoConexoes: 45,
      instantePicoConexoes: null,
      limiteConexoes: 100,
    },
    evolucao: [
      { instante: new Date(2026, 8, 28).toISOString(), consultas: 400_000, tempoMedioMs: 36 },
      { instante: new Date(2026, 8, 29).toISOString(), consultas: 420_000, tempoMedioMs: 38 },
    ],
    desempenho: [
      { desempenho: 'RAPIDA', consultasDistintas: 36, quantidadeExecucoes: 1, percentualExecucoes: 87.3, percentualTempoTotal: 13.4 },
      { desempenho: 'MODERADA', consultasDistintas: 3, quantidadeExecucoes: 1, percentualExecucoes: 12.2, percentualTempoTotal: 73.7 },
      { desempenho: 'LENTA', consultasDistintas: 3, quantidadeExecucoes: 1, percentualExecucoes: 0.5, percentualTempoTotal: 12.9 },
    ],
    consultas: [consulta('a', 268, 1000), consulta('b', 3, 50_000), consulta('c', 50, 200), consulta('d', 12, 90)],
    ...mudancas,
  };
}

function criarBase(mudancas: Partial<ResumoRelatorioDTO> = {}): ResumoRelatorioDTO {
  const resumo = criarResumo();
  return {
    ...resumo,
    inicio: '2026-09-21',
    fim: '2026-09-27',
    indicadores: { ...resumo.indicadores, totalConsultas: 3_000_000, tempoMedioMs: 38.8, consultasLentas: 2, picoConexoes: 51 },
    evolucao: [{ instante: new Date(2026, 8, 21).toISOString(), consultas: 410_000, tempoMedioMs: 39 }],
    desempenho: [
      { desempenho: 'RAPIDA', consultasDistintas: 37, quantidadeExecucoes: 1, percentualExecucoes: 87.3, percentualTempoTotal: 13.8 },
      { desempenho: 'MODERADA', consultasDistintas: 3, quantidadeExecucoes: 1, percentualExecucoes: 12.2, percentualTempoTotal: 72.4 },
      { desempenho: 'LENTA', consultasDistintas: 2, quantidadeExecucoes: 1, percentualExecucoes: 0.5, percentualTempoTotal: 13.8 },
    ],
    consultas: [consulta('a', 184, 900), consulta('b', 3.7, 48_000), consulta('c', 50, 200), consulta('e', 7, 30)],
    ...mudancas,
  };
}

function comIndicadores(resumo: ResumoRelatorioDTO, mudancas: Partial<ResumoRelatorioDTO['indicadores']>): ResumoRelatorioDTO {
  return { ...resumo, indicadores: { ...resumo.indicadores, ...mudancas } };
}

function textos(principal: ResumoRelatorioDTO, base: ResumoRelatorioDTO): string[] {
  return montarMudancas(principal, base).map((mudanca) => mudanca.texto);
}

describe('período de comparação', () => {
  it('começa no período anterior e, sem anterior no histórico, no seguinte', () => {
    expect(basePadrao(semana('2026-09-28'), domingo)).toEqual(semana('2026-09-21'));
    expect(basePadrao(semana('2025-10-06'), domingo)).toEqual(semana('2025-10-13'));
  });

  it('oferece dois atalhos por tamanho de período, do mais próximo ao mais distante', () => {
    expect(atalhosDeBase.DIA.map((atalho) => atalho.rotulo)).toEqual(['Dia anterior', '7 dias antes']);
    expect(atalhosDeBase.SEMANA.map((atalho) => atalho.rotulo)).toEqual(['Semana anterior', '4 semanas antes']);
    expect(atalhosDeBase.MES.map((atalho) => atalho.rotulo)).toEqual(['Mês anterior', '3 meses antes']);
  });

  it('leva o atalho ao período certo e o recusa fora do histórico', () => {
    const [, tresMeses] = atalhosDeBase.MES;
    if (!tresMeses) throw new Error('Falta o atalho do teste.');

    expect(baseDoAtalho(mes('2026-09-01'), tresMeses, domingo)).toEqual(mes('2026-06-01'));
    expect(baseDoAtalho(mes('2025-11-01'), tresMeses, domingo)).toBeNull();
  });

  it('reconhece o atalho em uso pela distância entre os dois períodos', () => {
    expect(atalhoEmUso({ periodo: semana('2026-09-28'), base: semana('2026-08-31') })?.rotulo).toBe('4 semanas antes');
    expect(atalhoEmUso({ periodo: semana('2026-09-28'), base: semana('2026-09-14') })).toBeNull();
  });

  it('recusa a base de outro tamanho, igual ao período ou fora do histórico', () => {
    const periodo = semana('2026-09-28');

    expect(lerBase(semana('2026-09-14'), periodo, domingo)).toEqual(semana('2026-09-14'));
    expect(lerBase(mes('2026-08-01'), periodo, domingo)).toBeNull();
    expect(lerBase(semana('2026-09-28'), periodo, domingo)).toBeNull();
    expect(lerBase(semana('2026-10-05'), periodo, domingo)).toBeNull();
    expect(lerBase('2026-09-14', periodo, domingo)).toBeNull();
  });

  it('mantém a distância da base quando o período anda', () => {
    const par = { periodo: semana('2026-09-28'), base: semana('2026-08-31') };

    expect(acompanharPeriodo(par, semana('2026-09-21'), domingo)).toEqual({
      periodo: semana('2026-09-21'),
      base: semana('2026-08-24'),
    });
  });

  it('volta ao período anterior quando o tamanho muda ou a distância sai do histórico', () => {
    const par = { periodo: semana('2026-09-28'), base: semana('2026-08-31') };

    expect(acompanharPeriodo(par, mes('2026-09-01'), domingo).base).toEqual(mes('2026-08-01'));
    expect(acompanharPeriodo(par, semana('2025-10-13'), domingo).base).toEqual(semana('2025-10-06'));
  });

  it('pula o período ao andar com a base e para nos limites do histórico', () => {
    expect(vizinhaDaBase({ periodo: semana('2026-09-28'), base: semana('2026-09-14') }, 1, domingo)).toEqual(semana('2026-09-21'));
    expect(vizinhaDaBase({ periodo: semana('2026-09-21'), base: semana('2026-09-14') }, 1, domingo)).toEqual(semana('2026-09-28'));
    expect(vizinhaDaBase({ periodo: semana('2026-09-28'), base: semana('2026-09-21') }, 1, domingo)).toBeNull();
    expect(vizinhaDaBase({ periodo: semana('2026-09-28'), base: semana('2025-10-06') }, -1, domingo)).toBeNull();
  });

  it('inverte os dois períodos', () => {
    expect(inverterPeriodos({ periodo: mes('2026-09-01'), base: mes('2026-06-01') })).toEqual({
      periodo: mes('2026-06-01'),
      base: mes('2026-09-01'),
    });
  });
});

describe('nomes dos dois períodos', () => {
  it('usa rótulos curtos, com o ano só quando os períodos são de anos diferentes', () => {
    expect(rotulosDaComparacao({ periodo: semana('2026-09-28'), base: semana('2026-09-21') })).toEqual({
      principal: '28/09 a 04/10',
      base: '21/09 a 27/09',
    });
    expect(rotulosDaComparacao({ periodo: dia('2026-01-02'), base: dia('2025-12-30') })).toEqual({
      principal: '02/01/2026',
      base: '30/12/2025',
    });
    expect(rotulosDaComparacao({ periodo: semana('2025-12-29'), base: semana('2025-12-22') })).toEqual({
      principal: '29/12/2025 a 04/01/2026',
      base: '22/12 a 28/12/2025',
    });
    expect(rotulosDaComparacao({ periodo: mes('2026-01-01'), base: mes('2025-12-01') })).toEqual({
      principal: 'janeiro de 2026',
      base: 'dezembro de 2025',
    });
  });

  it('começa com maiúscula onde o rótulo aparece sozinho', () => {
    expect(titulosDaComparacao({ periodo: mes('2026-09-01'), base: mes('2026-08-01') })).toEqual({
      principal: 'Setembro',
      base: 'Agosto',
    });
  });

  it('escreve os dois lados do seletor no mesmo formato, sempre com o ano', () => {
    expect(rotulosDoSeletor({ periodo: semana('2026-10-05'), base: semana('2026-09-28') })).toEqual({
      principal: '05/10 a 11/10/2026',
      base: '28/09 a 04/10/2026',
    });
    expect(rotulosDoSeletor({ periodo: dia('2026-10-11'), base: dia('2026-10-10') })).toEqual({
      principal: '11/10/2026',
      base: '10/10/2026',
    });
    expect(rotulosDoSeletor({ periodo: mes('2026-09-01'), base: mes('2026-08-01') })).toEqual({
      principal: 'Setembro de 2026',
      base: 'Agosto de 2026',
    });
  });

  it('põe o ano nas duas pontas dos dois lados quando uma das semanas vira o ano', () => {
    expect(rotulosDoSeletor({ periodo: semana('2025-12-29'), base: semana('2025-12-22') })).toEqual({
      principal: '29/12/2025 a 04/01/2026',
      base: '22/12/2025 a 28/12/2025',
    });
    expect(rotulosDoSeletor({ periodo: semana('2026-01-05'), base: semana('2025-12-29') })).toEqual({
      principal: '05/01/2026 a 11/01/2026',
      base: '29/12/2025 a 04/01/2026',
    });
  });

  it('cita a base dentro da frase com a preposição de cada tamanho', () => {
    expect(referenciaDaBase({ periodo: semana('2026-09-28'), base: semana('2026-09-21') })).toBe('na semana de 21 a 27 de setembro');
    expect(referenciaDaBase({ periodo: dia('2026-10-10'), base: dia('2026-10-09') })).toBe('em 9 de outubro');
    expect(referenciaDaBase({ periodo: mes('2026-09-01'), base: mes('2026-08-01') })).toBe('em agosto');
    expect(referenciaDaBase({ periodo: mes('2026-01-01'), base: mes('2025-12-01') })).toBe('em dezembro de 2025');
  });

  it('identifica a conexão e os dois períodos no texto copiado', () => {
    const par = { periodo: semana('2026-09-28'), base: semana('2026-09-21') };

    expect(cabecalhoDaComparacao('Loja', par, false)).toBe(
      'Comparação de Loja: 28 de setembro a 4 de outubro de 2026 em relação a 21 a 27 de setembro de 2026',
    );
    expect(cabecalhoDaComparacao('Loja', par, true)).toBe(
      'Comparação de Loja: 28 de setembro a 4 de outubro de 2026 em relação a 21 a 27 de setembro de 2026 (dados demonstrativos)',
    );
  });
});

describe('indicadores comparados', () => {
  it('calcula a variação do período em relação à base, com uma casa', () => {
    expect(variacaoEntre(110, 100)).toBe(10);
    expect(variacaoEntre(37.2, 38.8)).toBe(-4.1);
    expect(variacaoEntre(5, 0)).toBeNull();
  });

  it('põe os dois valores, a diferença e a variação de cada indicador', () => {
    const indicadores = compararIndicadores(criarResumo(), criarBase());

    expect(indicadores.totalConsultas).toEqual({ principal: 2_900_000, base: 3_000_000, diferenca: -100_000, variacao: -3.3 });
    expect(indicadores.tempoMedioMs.variacao).toBe(-4.1);
    expect(indicadores.consultasLentas).toEqual({ principal: 3, base: 2, diferenca: 1, variacao: 50 });
    expect(indicadores.picoConexoes.diferenca).toBe(-6);
    expect(indicadores.consultasPorDia).toBeNull();
  });

  it('compara o volume por dia quando os meses têm tamanhos diferentes', () => {
    const setembro = comIndicadores(criarResumo({ granularidade: 'MES', inicio: '2026-09-01', fim: '2026-09-30' }), {
      totalConsultas: 12_600_000,
    });
    const agosto = comIndicadores(criarBase({ granularidade: 'MES', inicio: '2026-08-01', fim: '2026-08-31' }), {
      totalConsultas: 12_400_000,
    });

    expect(compararIndicadores(setembro, agosto).consultasPorDia).toEqual({
      principal: 420_000,
      base: 400_000,
      diferenca: 20_000,
      variacao: 5,
    });
  });
});

describe('evolução alinhada', () => {
  it('casa os pontos pela posição e deixa vazio o lado que acaba antes', () => {
    const pontos = alinharEvolucao(criarResumo().evolucao, criarBase().evolucao);

    expect(pontos).toHaveLength(2);
    expect(pontos[0]).toMatchObject({ posicao: 0, consultasPrincipal: 400_000, consultasBase: 410_000, tempoMedioBase: 39 });
    expect(pontos[1]).toMatchObject({ posicao: 1, consultasPrincipal: 420_000, consultasBase: null, instanteBase: null });
  });
});

describe('desempenho comparado', () => {
  it('mostra a fatia de cada faixa nos dois períodos e a diferença em pontos percentuais', () => {
    const faixas = compararDesempenho(criarResumo().desempenho, criarBase().desempenho);

    expect(faixas.map((faixa) => faixa.desempenho)).toEqual(['RAPIDA', 'MODERADA', 'LENTA']);
    expect(faixas.map((faixa) => faixa.tempo.diferenca)).toEqual([-0.4, 1.3, -0.9]);
    expect(faixas.map((faixa) => faixa.execucoes.diferenca)).toEqual([0, 0, 0]);
  });

  it('trata como zero a faixa que falta em um dos períodos', () => {
    const [rapidas] = compararDesempenho(criarResumo().desempenho, []);

    expect(rapidas?.tempo).toMatchObject({ principal: 13.4, base: 0, variacao: null });
  });

  it('resume a faixa em que a fatia do tempo mais mudou', () => {
    const faixas = compararDesempenho(criarResumo().desempenho, criarBase().desempenho);

    expect(resumirMudancaDeDesempenho(faixas, 'em agosto')).toBe(
      'As consultas moderadas consumiram 73,7% do tempo do banco, contra 72,4% em agosto.',
    );
    expect(resumirMudancaDeDesempenho(compararDesempenho(criarResumo().desempenho, criarResumo().desempenho), 'em agosto')).toBe(
      'O tempo do banco se dividiu entre as três faixas da mesma forma nos dois períodos.',
    );
    expect(resumirMudancaDeDesempenho([], 'em agosto')).toBeNull();
  });
});

describe('consultas comparadas', () => {
  const consultas = compararConsultas(criarResumo().consultas, criarBase().consultas);

  it('junta as duas listas e ordena pela maior alta do tempo médio, com as sem comparação no fim', () => {
    expect(consultas.map((item) => item.id)).toEqual(['a', 'c', 'b', 'd', 'e']);
    expect(consultas.map((item) => item.variacaoTempoMedio)).toEqual([45.7, 0, -18.9, null, null]);
  });

  it('classifica cada consulta pela direção da mudança', () => {
    expect(consultas.map((item) => item.tendencia)).toEqual(['PIOROU', 'ESTAVEL', 'MELHOROU', 'SEM_COMPARACAO', 'SEM_COMPARACAO']);
  });

  it('calcula a diferença em milissegundos e a variação das execuções', () => {
    const [primeira, , terceira] = consultas;

    expect(primeira).toMatchObject({ diferencaTempoMedioMs: 84, variacaoExecucoes: 11.1 });
    expect(terceira).toMatchObject({ diferencaTempoMedioMs: -0.7, variacaoExecucoes: 4.2 });
  });

  it('deixa vazio o lado em que a consulta ficou fora da lista', () => {
    const soNoPeriodo = consultas.find((item) => item.id === 'd');
    const soNaBase = consultas.find((item) => item.id === 'e');

    expect(soNoPeriodo?.principal?.tempoMedioMs).toBe(12);
    expect(soNoPeriodo?.base).toBeNull();
    expect(soNaBase?.principal).toBeNull();
    expect(soNaBase?.base?.tempoMedioMs).toBe(7);
  });

  it('conta em palavras as que pioraram e as que melhoraram', () => {
    expect(resumirTendencias(consultas)).toBe('1 piorou e 1 melhorou');
    expect(resumirTendencias([...consultas, ...consultas])).toBe('2 pioraram e 2 melhoraram');
    expect(resumirTendencias([])).toBe('nenhuma piorou e nenhuma melhorou');
  });

  it('filtra as que pioraram e as que melhoraram', () => {
    expect(filtrarConsultas(consultas, 'TODAS')).toHaveLength(5);
    expect(filtrarConsultas(consultas, 'PIORARAM').map((item) => item.id)).toEqual(['a']);
    expect(filtrarConsultas(consultas, 'MELHORARAM').map((item) => item.id)).toEqual(['b']);
  });
});

describe('montarMudancas', () => {
  it('conta o volume, o tempo, as lentas e as consultas que mais mudaram, nesta ordem', () => {
    const mudancas = montarMudancas(criarResumo(), criarBase());

    expect(mudancas.map((mudanca) => mudanca.tipo)).toEqual(['VOLUME', 'TEMPO', 'LENTAS', 'PIORA', 'MELHORA']);
    expect(mudancas.map((mudanca) => mudanca.texto)).toEqual([
      'O banco executou 2,9 milhões de consultas, contra 3,0 milhões na semana de 21 a 27 de setembro: 3,3% a menos.',
      'O tempo médio de execução ficou em 37,2 ms, contra 38,8 ms na semana de 21 a 27 de setembro: 4,1% menor.',
      'O período teve 3 consultas lentas, contra 2 na semana de 21 a 27 de setembro.',
      'A consulta que mais piorou teve tempo médio de 268 ms, contra 184 ms na semana de 21 a 27 de setembro: 45,7% maior.',
      'A consulta que mais melhorou teve tempo médio de 3,0 ms, contra 3,7 ms na semana de 21 a 27 de setembro: 18,9% menor.',
    ]);
  });

  it('marca como boa a queda do tempo e das lentas, e como ponto de atenção a alta', () => {
    const tons = (principal: ResumoRelatorioDTO, base: ResumoRelatorioDTO) =>
      Object.fromEntries(montarMudancas(principal, base).map((mudanca) => [mudanca.tipo, mudanca.tom]));

    expect(tons(criarResumo(), criarBase())).toMatchObject({
      VOLUME: 'neutro',
      TEMPO: 'positivo',
      LENTAS: 'atencao',
      PIORA: 'atencao',
      MELHORA: 'positivo',
    });
    expect(tons(criarBase(), criarResumo())).toMatchObject({ TEMPO: 'atencao', LENTAS: 'positivo' });
  });

  it('leva o SQL das consultas que mais mudaram', () => {
    const mudancas = montarMudancas(criarResumo(), criarBase());

    expect(mudancas.find((mudanca) => mudanca.tipo === 'PIORA')?.sql).toBe('SELECT a');
    expect(mudancas.find((mudanca) => mudanca.tipo === 'MELHORA')?.sql).toBe('SELECT b');
  });

  it('diz quando o volume, o tempo e as lentas ficaram iguais', () => {
    const frases = textos(criarResumo(), criarResumo({ inicio: '2026-09-21', fim: '2026-09-27' }));

    expect(frases).toEqual([
      'O banco executou 2,9 milhões de consultas, o mesmo volume registrado na semana de 21 a 27 de setembro.',
      'O tempo médio de execução ficou em 37,2 ms, igual ao registrado na semana de 21 a 27 de setembro.',
      'Os dois períodos tiveram 3 consultas lentas.',
    ]);
  });

  it('trata o período ou a base sem consultas lentas', () => {
    const semLentas = comIndicadores(criarResumo(), { consultasLentas: 0 });
    const baseSemLentas = comIndicadores(criarBase(), { consultasLentas: 0 });
    const frase = (principal: ResumoRelatorioDTO, base: ResumoRelatorioDTO) => textos(principal, base)[2];

    expect(frase(semLentas, criarBase())).toBe('O período não teve consultas lentas, contra 2 na semana de 21 a 27 de setembro.');
    expect(frase(comIndicadores(criarResumo(), { consultasLentas: 1 }), baseSemLentas)).toBe(
      'O período teve 1 consulta lenta, contra nenhuma na semana de 21 a 27 de setembro.',
    );
    expect(frase(semLentas, baseSemLentas)).toBe('Nenhum dos dois períodos teve consultas lentas.');
  });

  it('avisa quando os meses têm tamanhos diferentes e compara o volume por dia', () => {
    const setembro = comIndicadores(criarResumo({ granularidade: 'MES', inicio: '2026-09-01', fim: '2026-09-30' }), {
      totalConsultas: 12_600_000,
    });
    const agosto = (totalConsultas: number) =>
      comIndicadores(criarBase({ granularidade: 'MES', inicio: '2026-08-01', fim: '2026-08-31' }), { totalConsultas });

    expect(textos(setembro, agosto(12_400_000)).slice(0, 2)).toEqual([
      'O banco executou 12,6 milhões de consultas, contra 12,4 milhões em agosto: 1,6% a mais.',
      'Setembro tem 30 dias e agosto, 31: por dia, o volume foi 5,0% maior.',
    ]);
    expect(textos(setembro, agosto(13_020_000))[1]).toBe('Setembro tem 30 dias e agosto, 31: por dia, o volume foi o mesmo.');
  });

  it('não escreve nada quando um dos períodos não teve consultas', () => {
    expect(montarMudancas(comIndicadores(criarResumo(), { totalConsultas: 0 }), criarBase())).toEqual([]);
    expect(montarMudancas(criarResumo(), comIndicadores(criarBase(), { totalConsultas: 0 }))).toEqual([]);
  });
});
