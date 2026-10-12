import type {
  ConsultaResumoDTO,
  DesempenhoConsulta,
  IndicadoresDashboardDTO,
  PeriodoDashboard,
  PontoAtividadeDTO,
} from '@/modelos/dashboard';
import { CONSULTAS_DISTINTAS, TEMPO_MEDIO_GERAL_MS, consultasFicticias } from './consultasFicticias';

export interface SerieAtividade {
  pontos: PontoAtividadeDTO[];
  totalConsultas: number;
}

interface JanelaPeriodo {
  pontos: number;
  minutosPorPonto: number;
}

export const janelasPeriodo: Record<PeriodoDashboard, JanelaPeriodo> = {
  ULTIMA_HORA: { pontos: 12, minutosPorPonto: 5 },
  ULTIMAS_24_HORAS: { pontos: 24, minutosPorPonto: 60 },
  ULTIMOS_7_DIAS: { pontos: 28, minutosPorPonto: 360 },
  ULTIMOS_30_DIAS: { pontos: 30, minutosPorPonto: 1440 },
};

export const LIMITE_MODERADA_MS = 100;
export const LIMITE_LENTA_MS = 500;
export const LIMITE_CONEXOES = 100;

const MS_POR_MINUTO = 60_000;
const CONSULTAS_POR_MINUTO = 680;
const MINUTOS_ENTRE_AMOSTRAS = 60;
const HORA_DE_PICO = 14.5;
const LARGURA_DO_PICO = 22;
const CARGA_MINIMA = 0.22;
const CARGA_FIM_DE_SEMANA = 0.55;

export function sorteio(semente: number): number {
  let valor = (semente + 0x6d2b79f5) | 0;
  valor = Math.imul(valor ^ (valor >>> 15), valor | 1);
  valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61);
  return ((valor ^ (valor >>> 14)) >>> 0) / 4_294_967_296;
}

export function sementeDoInstante(instante: Date): number {
  return Math.floor(instante.getTime() / MS_POR_MINUTO);
}

export function arredondar(valor: number, casas = 1): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function cargaNoInstante(instante: Date): number {
  const hora = instante.getHours() + instante.getMinutes() / 60;
  const expediente = Math.exp(-((hora - HORA_DE_PICO) ** 2) / LARGURA_DO_PICO);
  const diaDaSemana = instante.getDay();
  const fimDeSemana = diaDaSemana === 0 || diaDaSemana === 6;
  return (CARGA_MINIMA + (1 - CARGA_MINIMA) * expediente) * (fimDeSemana ? CARGA_FIM_DE_SEMANA : 1);
}

function cargaMedia(inicio: Date, minutos: number): number {
  const amostras = Math.max(1, Math.round(minutos / MINUTOS_ENTRE_AMOSTRAS));
  const passo = minutos / amostras;
  let soma = 0;
  for (let indice = 0; indice < amostras; indice += 1) {
    soma += cargaNoInstante(new Date(inicio.getTime() + (indice + 0.5) * passo * MS_POR_MINUTO));
  }
  return soma / amostras;
}

function inicioDoIntervaloAtual(agora: Date, minutos: number): Date {
  const minutosDoDia = agora.getHours() * 60 + agora.getMinutes();
  const alinhado = Math.floor(minutosDoDia / minutos) * minutos;
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, alinhado);
}

export function fatorDoPeriodo(fim: Date): number {
  return 0.94 + 0.14 * sorteio(sementeDoInstante(fim) * 7 + 3);
}

interface Janela extends SerieAtividade {
  tempoMedioMs: number;
  fator: number;
}

export function gerarSerie(inicios: Date[], minutosPorPonto: number, tempoMedioMs: number): SerieAtividade {
  const brutos = inicios.map((inicio) => {
    const semente = sementeDoInstante(inicio);
    const carga = cargaMedia(inicio, minutosPorPonto);
    const consultas = Math.round(CONSULTAS_POR_MINUTO * minutosPorPonto * carga * (0.92 + 0.16 * sorteio(semente)));
    const tempoRelativo = 0.82 + 0.5 * carga + 0.12 * sorteio(semente + 1);
    return { inicio, consultas, tempoRelativo };
  });

  const totalConsultas = brutos.reduce((soma, ponto) => soma + ponto.consultas, 0);
  const tempoRelativoMedio = brutos.reduce((soma, ponto) => soma + ponto.consultas * ponto.tempoRelativo, 0) / totalConsultas;

  return {
    totalConsultas,
    pontos: brutos.map((ponto) => ({
      instante: ponto.inicio.toISOString(),
      consultas: ponto.consultas,
      tempoMedioMs: arredondar((ponto.tempoRelativo / tempoRelativoMedio) * tempoMedioMs),
    })),
  };
}

export function conexoesNoInstante(instante: Date): number {
  const oscilacao = sorteio(Math.floor(sementeDoInstante(instante) / 10));
  return Math.round(8 + 34 * cargaNoInstante(instante) + 4 * oscilacao);
}

function gerarJanela(periodo: PeriodoDashboard, fim: Date): Janela {
  const { pontos: quantidade, minutosPorPonto } = janelasPeriodo[periodo];
  const fator = fatorDoPeriodo(fim);
  const tempoMedioMs = TEMPO_MEDIO_GERAL_MS * fator;
  const inicios = Array.from(
    { length: quantidade },
    (_, indice) => new Date(fim.getTime() - (quantidade - indice) * minutosPorPonto * MS_POR_MINUTO),
  );

  return { ...gerarSerie(inicios, minutosPorPonto, tempoMedioMs), tempoMedioMs, fator };
}

function janelaAtual(periodo: PeriodoDashboard, agora: Date): Janela {
  return gerarJanela(periodo, inicioDoIntervaloAtual(agora, janelasPeriodo[periodo].minutosPorPonto));
}

function janelaAnterior(periodo: PeriodoDashboard, agora: Date): Janela {
  const { pontos, minutosPorPonto } = janelasPeriodo[periodo];
  const fimAtual = inicioDoIntervaloAtual(agora, minutosPorPonto);
  return gerarJanela(periodo, new Date(fimAtual.getTime() - pontos * minutosPorPonto * MS_POR_MINUTO));
}

export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return arredondar(((atual - anterior) / anterior) * 100);
}

export function classificarDesempenho(tempoMedioMs: number): DesempenhoConsulta {
  if (tempoMedioMs >= LIMITE_LENTA_MS) return 'LENTA';
  if (tempoMedioMs >= LIMITE_MODERADA_MS) return 'MODERADA';
  return 'RAPIDA';
}

export function gerarAtividade(periodo: PeriodoDashboard, agora: Date): PontoAtividadeDTO[] {
  return janelaAtual(periodo, agora).pontos;
}

export function gerarConsultas(periodo: PeriodoDashboard, agora: Date): ConsultaResumoDTO[] {
  const janela = janelaAtual(periodo, agora);
  const tempoTotalMs = janela.totalConsultas * janela.tempoMedioMs;

  return consultasFicticias
    .map((consulta) => {
      const quantidadeExecucoes = Math.max(1, Math.round(janela.totalConsultas * consulta.participacaoExecucoes));
      const tempoMedioMs = arredondar(consulta.tempoMedioMs * janela.fator);
      return {
        id: consulta.id,
        sql: consulta.sql,
        tempoMedioMs,
        quantidadeExecucoes,
        percentualTempoTotal: arredondar(((quantidadeExecucoes * tempoMedioMs) / tempoTotalMs) * 100),
        desempenho: classificarDesempenho(tempoMedioMs),
      };
    })
    .sort((a, b) => b.percentualTempoTotal - a.percentualTempoTotal);
}

export function gerarIndicadores(periodo: PeriodoDashboard, agora: Date): IndicadoresDashboardDTO {
  const atual = janelaAtual(periodo, agora);
  const anterior = janelaAnterior(periodo, agora);

  return {
    periodo,
    totalConsultas: atual.totalConsultas,
    variacaoTotalConsultas: variacaoPercentual(atual.totalConsultas, anterior.totalConsultas),
    tempoMedioMs: arredondar(atual.tempoMedioMs),
    variacaoTempoMedio: variacaoPercentual(atual.tempoMedioMs, anterior.tempoMedioMs),
    consultasLentas: gerarConsultas(periodo, agora).filter((consulta) => consulta.desempenho === 'LENTA').length,
    consultasDistintas: CONSULTAS_DISTINTAS,
    conexoesAtivas: conexoesNoInstante(agora),
    limiteConexoes: LIMITE_CONEXOES,
  };
}

export function indicadoresVazios(periodo: PeriodoDashboard): IndicadoresDashboardDTO {
  return {
    periodo,
    totalConsultas: 0,
    variacaoTotalConsultas: null,
    tempoMedioMs: 0,
    variacaoTempoMedio: null,
    consultasLentas: 0,
    consultasDistintas: 0,
    conexoesAtivas: 0,
    limiteConexoes: LIMITE_CONEXOES,
  };
}
