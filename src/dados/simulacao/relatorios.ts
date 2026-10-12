import type { DesempenhoConsulta, PontoAtividadeDTO } from '@/modelos/dashboard';
import type {
  ConsultaRelatorioDTO,
  FaixaDesempenhoDTO,
  PeriodoRelatorio,
  ResumoRelatorioDTO,
} from '@/modelos/relatorios';
import { diasDoPeriodo, fimDoPeriodo, inicioDoPeriodo, inicioDoSeguinte, periodoVizinho } from '@/regras/periodoRelatorio';
import { CONSULTAS_DISTINTAS, TEMPO_MEDIO_OUTRAS_MS, consultasFicticias } from './consultasFicticias';
import {
  LIMITE_CONEXOES,
  arredondar,
  classificarDesempenho,
  conexoesNoInstante,
  fatorDoPeriodo,
  gerarSerie,
  sementeDoInstante,
  sorteio,
  variacaoPercentual,
} from './series';

type ConsultaDoPeriodo = Omit<ConsultaRelatorioDTO, 'variacaoTempoMedio'>;

interface Calculo {
  pontos: PontoAtividadeDTO[];
  totalConsultas: number;
  tempoMedioMs: number;
  consultas: ConsultaDoPeriodo[];
}

interface PicoConexoes {
  conexoes: number;
  instante: string;
}

const HORAS_POR_DIA = 24;
const MINUTOS_POR_HORA = 60;
const MINUTOS_POR_DIA = HORAS_POR_DIA * MINUTOS_POR_HORA;
const MS_POR_MINUTO = 60_000;
const MINUTOS_ENTRE_AMOSTRAS_DE_CONEXOES = 30;
const OSCILACAO_DA_CONSULTA = 0.12;
const PASSO_DA_SEMENTE = 31;

const faixas: DesempenhoConsulta[] = ['RAPIDA', 'MODERADA', 'LENTA'];

const participacaoListada = consultasFicticias.reduce((soma, consulta) => soma + consulta.participacaoExecucoes, 0);

function pontosDoPeriodo(periodo: PeriodoRelatorio): { inicios: Date[]; minutosPorPonto: number } {
  if (periodo.granularidade !== 'DIA') return { inicios: diasDoPeriodo(periodo), minutosPorPonto: MINUTOS_POR_DIA };

  const dia = inicioDoPeriodo(periodo);
  const inicios = Array.from(
    { length: HORAS_POR_DIA },
    (_, hora) => new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hora),
  );
  return { inicios, minutosPorPonto: MINUTOS_POR_HORA };
}

function calcular(periodo: PeriodoRelatorio): Calculo {
  const fim = inicioDoSeguinte(periodo);
  const fator = fatorDoPeriodo(fim);
  const semente = sementeDoInstante(fim);

  const tempos = consultasFicticias.map((consulta, indice) => {
    const oscilacao = 1 - OSCILACAO_DA_CONSULTA + 2 * OSCILACAO_DA_CONSULTA * sorteio(semente + PASSO_DA_SEMENTE * (indice + 1));
    return arredondar(consulta.tempoMedioMs * fator * oscilacao);
  });

  const tempoMedioMs =
    consultasFicticias.reduce((soma, consulta, indice) => soma + consulta.participacaoExecucoes * (tempos[indice] ?? 0), 0) +
    (1 - participacaoListada) * TEMPO_MEDIO_OUTRAS_MS * fator;

  const { inicios, minutosPorPonto } = pontosDoPeriodo(periodo);
  const serie = gerarSerie(inicios, minutosPorPonto, tempoMedioMs);
  const tempoTotalMs = serie.totalConsultas * tempoMedioMs;

  const consultas = consultasFicticias.map((consulta, indice) => {
    const tempo = tempos[indice] ?? 0;
    const quantidadeExecucoes = Math.max(1, Math.round(serie.totalConsultas * consulta.participacaoExecucoes));
    return {
      id: consulta.id,
      sql: consulta.sql,
      tempoMedioMs: tempo,
      quantidadeExecucoes,
      percentualTempoTotal: arredondar(((quantidadeExecucoes * tempo) / tempoTotalMs) * 100),
      desempenho: classificarDesempenho(tempo),
    };
  });

  return { pontos: serie.pontos, totalConsultas: serie.totalConsultas, tempoMedioMs, consultas };
}

function distribuirPorDesempenho(calculo: Calculo): FaixaDesempenhoDTO[] {
  const parciais = faixas
    .filter((desempenho) => desempenho !== 'RAPIDA')
    .map((desempenho) => {
      const consultas = calculo.consultas.filter((consulta) => consulta.desempenho === desempenho);
      const quantidadeExecucoes = consultas.reduce((soma, consulta) => soma + consulta.quantidadeExecucoes, 0);
      return {
        desempenho,
        consultasDistintas: consultas.length,
        quantidadeExecucoes,
        percentualExecucoes: arredondar((quantidadeExecucoes / calculo.totalConsultas) * 100),
        percentualTempoTotal: arredondar(consultas.reduce((soma, consulta) => soma + consulta.percentualTempoTotal, 0)),
      };
    });

  const somar = (campo: 'consultasDistintas' | 'quantidadeExecucoes' | 'percentualExecucoes' | 'percentualTempoTotal') =>
    parciais.reduce((soma, faixa) => soma + faixa[campo], 0);

  const rapidas: FaixaDesempenhoDTO = {
    desempenho: 'RAPIDA',
    consultasDistintas: CONSULTAS_DISTINTAS - somar('consultasDistintas'),
    quantidadeExecucoes: calculo.totalConsultas - somar('quantidadeExecucoes'),
    percentualExecucoes: arredondar(100 - somar('percentualExecucoes')),
    percentualTempoTotal: arredondar(100 - somar('percentualTempoTotal')),
  };

  return [rapidas, ...parciais];
}

function encontrarPicoDeConexoes(periodo: PeriodoRelatorio): PicoConexoes {
  const fim = inicioDoSeguinte(periodo).getTime();
  const passo = MINUTOS_ENTRE_AMOSTRAS_DE_CONEXOES * MS_POR_MINUTO;
  let pico: PicoConexoes = { conexoes: 0, instante: inicioDoPeriodo(periodo).toISOString() };

  for (let instante = inicioDoPeriodo(periodo).getTime(); instante < fim; instante += passo) {
    const conexoes = conexoesNoInstante(new Date(instante));
    if (conexoes > pico.conexoes) pico = { conexoes, instante: new Date(instante).toISOString() };
  }
  return pico;
}

export function gerarResumoRelatorio(periodo: PeriodoRelatorio): ResumoRelatorioDTO {
  const atual = calcular(periodo);
  const anterior = calcular(periodoVizinho(periodo, -1));
  const pico = encontrarPicoDeConexoes(periodo);
  const temposAnteriores = new Map(anterior.consultas.map((consulta) => [consulta.id, consulta.tempoMedioMs]));

  const consultas = atual.consultas
    .map((consulta) => ({
      ...consulta,
      variacaoTempoMedio: variacaoPercentual(consulta.tempoMedioMs, temposAnteriores.get(consulta.id) ?? 0),
    }))
    .sort((a, b) => b.percentualTempoTotal - a.percentualTempoTotal);

  return {
    granularidade: periodo.granularidade,
    inicio: periodo.inicio,
    fim: fimDoPeriodo(periodo),
    indicadores: {
      totalConsultas: atual.totalConsultas,
      variacaoTotalConsultas: variacaoPercentual(atual.totalConsultas, anterior.totalConsultas),
      tempoMedioMs: arredondar(atual.tempoMedioMs),
      variacaoTempoMedio: variacaoPercentual(arredondar(atual.tempoMedioMs), arredondar(anterior.tempoMedioMs)),
      consultasLentas: atual.consultas.filter((consulta) => consulta.desempenho === 'LENTA').length,
      consultasDistintas: CONSULTAS_DISTINTAS,
      picoConexoes: pico.conexoes,
      instantePicoConexoes: pico.instante,
      limiteConexoes: LIMITE_CONEXOES,
    },
    evolucao: atual.pontos,
    desempenho: distribuirPorDesempenho(atual),
    consultas,
  };
}

export function resumoRelatorioVazio(periodo: PeriodoRelatorio): ResumoRelatorioDTO {
  return {
    granularidade: periodo.granularidade,
    inicio: periodo.inicio,
    fim: fimDoPeriodo(periodo),
    indicadores: {
      totalConsultas: 0,
      variacaoTotalConsultas: null,
      tempoMedioMs: 0,
      variacaoTempoMedio: null,
      consultasLentas: 0,
      consultasDistintas: 0,
      picoConexoes: 0,
      instantePicoConexoes: null,
      limiteConexoes: LIMITE_CONEXOES,
    },
    evolucao: [],
    desempenho: [],
    consultas: [],
  };
}
