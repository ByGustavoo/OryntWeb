import type {
  DirecaoOrdenacao,
  HistoricoConsultaDTO,
  PontoHistoricoDTO,
  SelecaoHistorico,
  TrocaDePlanoDTO,
} from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import type { GranularidadeRelatorio } from '@/modelos/relatorios';
import { descricaoPeriodo } from '@/modelos/rotulos';
import {
  formatarDiaMes,
  formatarDiaSemana,
  formatarDuracaoMs,
  formatarHorario,
  formatarNumero,
  formatarPercentual,
  pluralizar,
} from '@/utilitarios/formatacao';
import { quantidadePorExtenso } from './destaquesRelatorio';
import type { Destaque } from './destaquesRelatorio';
import { filtrosIniciais, lerPeriodoDaLista } from './filtrosConsultas';
import { dataPorExtenso, diaNaFrase } from './periodoRelatorio';

export const QUANTIDADE_DE_SUGESTOES = 8;

export const selecaoInicial: SelecaoHistorico = { consulta: null, periodo: filtrosIniciais.periodo };

export const minutosPorIntervalo: Record<PeriodoDashboard, number> = {
  ULTIMA_HORA: 5,
  ULTIMAS_24_HORAS: 60,
  ULTIMOS_7_DIAS: 360,
  ULTIMOS_30_DIAS: 1440,
};

export const intervalosPorPeriodo: Record<PeriodoDashboard, number> = {
  ULTIMA_HORA: 12,
  ULTIMAS_24_HORAS: 24,
  ULTIMOS_7_DIAS: 28,
  ULTIMOS_30_DIAS: 30,
};

export const periodoDoHistorico: Record<GranularidadeRelatorio, PeriodoDashboard> = {
  DIA: 'ULTIMAS_24_HORAS',
  SEMANA: 'ULTIMOS_7_DIAS',
  MES: 'ULTIMOS_30_DIAS',
};

export type OrdenacaoIntervalos = 'INSTANTE' | 'EXECUCOES' | 'TEMPO_MEDIO' | 'TEMPO_MAXIMO';

export interface OrdemDosIntervalos {
  ordenacao: OrdenacaoIntervalos;
  direcao: DirecaoOrdenacao;
}

export const ordemInicialDosIntervalos: OrdemDosIntervalos = { ordenacao: 'INSTANTE', direcao: 'ASC' };

export interface TextosDoIntervalo {
  coluna: string;
  unidade: string;
  artigo: 'os' | 'as';
  plural: string;
  eixo: (instante: string) => string;
  linha: (instante: string) => string;
  completo: (instante: string) => string;
  quando: (instante: string) => string;
  naFrase: (instante: string) => string;
}

interface JanelaAnteriorNaFrase {
  em: string;
  de: string;
}

const ID_VALIDO = /^[\w.:-]{1,120}$/;
const MS_POR_MINUTO = 60_000;
const MILHAO = 1_000_000;
const VARIACAO_DESPREZIVEL = 0.05;
const EXCESSO_QUE_PEDE_ATENCAO = 20;

export const janelaAnteriorNaFrase: Record<PeriodoDashboard, JanelaAnteriorNaFrase> = {
  ULTIMA_HORA: { em: 'na hora anterior', de: 'da hora anterior' },
  ULTIMAS_24_HORAS: { em: 'nas 24 horas anteriores', de: 'das 24 horas anteriores' },
  ULTIMOS_7_DIAS: { em: 'nos 7 dias anteriores', de: 'dos 7 dias anteriores' },
  ULTIMOS_30_DIAS: { em: 'nos 30 dias anteriores', de: 'dos 30 dias anteriores' },
};

function fimDoIntervalo(instante: string, periodo: PeriodoDashboard): string {
  return new Date(new Date(instante).getTime() + minutosPorIntervalo[periodo] * MS_POR_MINUTO).toISOString();
}

function diaPorExtenso(instante: string): string {
  const data = new Date(instante);
  return `${diaNaFrase(data)}, ${dataPorExtenso(data, false)}`;
}

function entreHorarios(instante: string, periodo: PeriodoDashboard): string {
  return `entre ${formatarHorario(instante)} e ${formatarHorario(fimDoIntervalo(instante, periodo))}`;
}

function dasAs(instante: string, periodo: PeriodoDashboard): string {
  return `das ${formatarHorario(instante)} às ${formatarHorario(fimDoIntervalo(instante, periodo))}`;
}

export const textosDoIntervalo: Record<PeriodoDashboard, TextosDoIntervalo> = {
  ULTIMA_HORA: {
    coluna: 'Intervalo',
    unidade: 'intervalo de 5 minutos',
    artigo: 'os',
    plural: 'intervalos',
    eixo: formatarHorario,
    linha: (instante) => `${formatarHorario(instante)} a ${formatarHorario(fimDoIntervalo(instante, 'ULTIMA_HORA'))}`,
    completo: (instante) => `Das ${formatarHorario(instante)} às ${formatarHorario(fimDoIntervalo(instante, 'ULTIMA_HORA'))}`,
    quando: (instante) => `às ${formatarHorario(instante)}`,
    naFrase: (instante) => entreHorarios(instante, 'ULTIMA_HORA'),
  },
  ULTIMAS_24_HORAS: {
    coluna: 'Hora',
    unidade: 'hora',
    artigo: 'as',
    plural: 'horas',
    eixo: formatarHorario,
    linha: (instante) => `${formatarDiaMes(instante)}, ${formatarHorario(instante)}`,
    completo: (instante) => `${formatarDiaMes(instante)}, ${dasAs(instante, 'ULTIMAS_24_HORAS')}`,
    quando: (instante) => `em ${formatarDiaMes(instante)}, às ${formatarHorario(instante)}`,
    naFrase: (instante) =>
      `em ${dataPorExtenso(new Date(instante), false)}, ${entreHorarios(instante, 'ULTIMAS_24_HORAS')}`,
  },
  ULTIMOS_7_DIAS: {
    coluna: 'Intervalo',
    unidade: 'intervalo de 6 horas',
    artigo: 'os',
    plural: 'intervalos',
    eixo: (instante) => `${formatarDiaSemana(instante)} ${formatarDiaMes(instante)}`,
    linha: (instante) => `${formatarDiaSemana(instante)} ${formatarDiaMes(instante)}, ${formatarHorario(instante)}`,
    completo: (instante) =>
      `${formatarDiaSemana(instante)}, ${formatarDiaMes(instante)}, ${dasAs(instante, 'ULTIMOS_7_DIAS')}`,
    quando: (instante) => `em ${formatarDiaMes(instante)}, a partir das ${formatarHorario(instante)}`,
    naFrase: (instante) => `${diaPorExtenso(instante)}, ${entreHorarios(instante, 'ULTIMOS_7_DIAS')}`,
  },
  ULTIMOS_30_DIAS: {
    coluna: 'Dia',
    unidade: 'dia',
    artigo: 'os',
    plural: 'dias',
    eixo: formatarDiaMes,
    linha: (instante) => `${formatarDiaSemana(instante)}, ${formatarDiaMes(instante)}`,
    completo: (instante) => `${formatarDiaSemana(instante)}, ${formatarDiaMes(instante)}`,
    quando: (instante) => `em ${formatarDiaMes(instante)}`,
    naFrase: diaPorExtenso,
  },
};

export function lerIdDaConsulta(valor: unknown): string | null {
  return typeof valor === 'string' && ID_VALIDO.test(valor) ? valor : null;
}

export function lerSelecao(valor: unknown): SelecaoHistorico {
  if (!valor || typeof valor !== 'object') return selecaoInicial;
  const guardado = valor as Record<string, unknown>;

  return {
    consulta: lerIdDaConsulta(guardado.consulta),
    periodo: lerPeriodoDaLista(guardado.periodo) ?? selecaoInicial.periodo,
  };
}

export function estadoDoHistorico(consulta: string, periodo: PeriodoDashboard): { historico: SelecaoHistorico } {
  return { historico: { consulta, periodo } };
}

export function rotuloVerHistorico(periodo: PeriodoDashboard): string {
  return `Ver o histórico da consulta ${descricaoPeriodo[periodo]}`;
}

function inicioEmMs(ponto: PontoHistoricoDTO): number {
  return new Date(ponto.instante).getTime();
}

const medidaDaOrdenacao: Record<OrdenacaoIntervalos, (ponto: PontoHistoricoDTO) => number | null> = {
  INSTANTE: inicioEmMs,
  EXECUCOES: (ponto) => ponto.quantidadeExecucoes,
  TEMPO_MEDIO: (ponto) => ponto.tempoMedioMs,
  TEMPO_MAXIMO: (ponto) => ponto.tempoMaximoMs,
};

export function alternarOrdemDosIntervalos(atual: OrdemDosIntervalos, ordenacao: OrdenacaoIntervalos): OrdemDosIntervalos {
  if (atual.ordenacao === ordenacao) return { ordenacao, direcao: atual.direcao === 'DESC' ? 'ASC' : 'DESC' };
  return { ordenacao, direcao: ordenacao === 'INSTANTE' ? 'ASC' : 'DESC' };
}

export const INTERVALOS_RECOLHIDOS = 12;

export interface RecorteDosIntervalos {
  visiveis: PontoHistoricoDTO[];
  ocultos: number;
  recolhivel: boolean;
  lado: 'INICIO' | 'FIM';
}

export function ladoDosOcultos({ ordenacao, direcao }: OrdemDosIntervalos): RecorteDosIntervalos['lado'] {
  return ordenacao === 'INSTANTE' && direcao === 'ASC' ? 'INICIO' : 'FIM';
}

export function intervalosRecolhiveis(total: number): boolean {
  return total > INTERVALOS_RECOLHIDOS;
}

export function quantidadeVisivel(total: number, expandido: boolean): number {
  return expandido ? total : Math.min(total, INTERVALOS_RECOLHIDOS);
}

export function recortarIntervalos(
  ordenados: PontoHistoricoDTO[],
  ordem: OrdemDosIntervalos,
  expandido: boolean,
): RecorteDosIntervalos {
  const lado = ladoDosOcultos(ordem);
  const ocultos = ordenados.length - quantidadeVisivel(ordenados.length, expandido);
  const visiveis = lado === 'INICIO' ? ordenados.slice(ocultos) : ordenados.slice(0, ordenados.length - ocultos);
  return { visiveis, ocultos, recolhivel: intervalosRecolhiveis(ordenados.length), lado };
}

export function rotuloDosIntervalosOcultos(periodo: PeriodoDashboard, ordem: OrdemDosIntervalos, quantidade: number): string {
  const { artigo, plural } = textosDoIntervalo[periodo];
  if (ordem.ordenacao === 'INSTANTE') return `Mostrar ${artigo} ${quantidade} ${plural} anteriores`;
  return `Mostrar ${artigo} ${artigo === 'as' ? 'outras' : 'outros'} ${quantidade} ${plural}`;
}

export function rotuloCurtoDoAlternador(periodo: PeriodoDashboard, total: number, expandido: boolean): string {
  const { artigo, plural } = textosDoIntervalo[periodo];
  return expandido ? `Mostrar só ${INTERVALOS_RECOLHIDOS}` : `Mostrar ${artigo} ${total} ${plural}`;
}

export function rotuloParaRecolher(periodo: PeriodoDashboard, ordem: OrdemDosIntervalos): string {
  const { artigo } = textosDoIntervalo[periodo];
  const quais = ordem.ordenacao === 'INSTANTE' ? 'mais recentes' : artigo === 'as' ? 'primeiras' : 'primeiros';
  return `Mostrar só ${artigo} ${INTERVALOS_RECOLHIDOS} ${quais}`;
}

export function ordenarIntervalos(pontos: PontoHistoricoDTO[], { ordenacao, direcao }: OrdemDosIntervalos): PontoHistoricoDTO[] {
  const medir = medidaDaOrdenacao[ordenacao];
  const sentido = direcao === 'ASC' ? 1 : -1;

  return [...pontos].sort((a, b) => {
    const valorA = medir(a);
    const valorB = medir(b);
    const cronologica = inicioEmMs(a) - inicioEmMs(b);
    if (valorA === null || valorB === null) return Number(valorA === null) - Number(valorB === null) || cronologica;
    return (valorA - valorB) * sentido || cronologica;
  });
}

export function intervaloDaTroca(
  pontos: PontoHistoricoDTO[],
  periodo: PeriodoDashboard,
  troca: TrocaDePlanoDTO,
): PontoHistoricoDTO | null {
  const momento = new Date(troca.instante).getTime();
  const duracao = minutosPorIntervalo[periodo] * MS_POR_MINUTO;
  return pontos.find((ponto) => momento >= inicioEmMs(ponto) && momento < inicioEmMs(ponto) + duracao) ?? null;
}

export function intervalosComTroca(historico: HistoricoConsultaDTO): string[] {
  return historico.trocasDePlano
    .map((troca) => intervaloDaTroca(historico.pontos, historico.periodo, troca)?.instante)
    .filter((instante): instante is string => instante !== undefined);
}

export function descreverTroca(troca: TrocaDePlanoDTO): string {
  const quando = new Date(troca.instante);
  return `O plano de execução mudou em ${dataPorExtenso(quando, false)}, às ${formatarHorario(troca.instante)}`;
}

export function foiExecutada(historico: HistoricoConsultaDTO): boolean {
  return historico.consulta.quantidadeExecucoes > 0;
}

export function pontoComMaisExecucoes(pontos: PontoHistoricoDTO[]): PontoHistoricoDTO | null {
  return pontos.reduce<PontoHistoricoDTO | null>(
    (maior, ponto) => (ponto.quantidadeExecucoes > (maior?.quantidadeExecucoes ?? 0) ? ponto : maior),
    null,
  );
}

export function pontoMaisLento(pontos: PontoHistoricoDTO[]): PontoHistoricoDTO | null {
  return pontos.reduce<PontoHistoricoDTO | null>(
    (maior, ponto) => ((ponto.tempoMedioMs ?? -1) > (maior?.tempoMedioMs ?? -1) ? ponto : maior),
    null,
  );
}

export function pontoDaExecucaoMaisLenta(pontos: PontoHistoricoDTO[]): PontoHistoricoDTO | null {
  return pontos.reduce<PontoHistoricoDTO | null>(
    (maior, ponto) => ((ponto.tempoMaximoMs ?? -1) > (maior?.tempoMaximoMs ?? -1) ? ponto : maior),
    null,
  );
}

function vezesPorExtenso(quantidade: number): string {
  if (quantidade >= MILHAO) return `${quantidadePorExtenso(quantidade)} de vezes`;
  return `${formatarNumero(quantidade)} ${pluralizar(quantidade, 'vez', 'vezes')}`;
}

function percentual(variacao: number): string {
  return formatarPercentual(Math.abs(variacao));
}

function destacarVolume(historico: HistoricoConsultaDTO): Destaque {
  const anterior = janelaAnteriorNaFrase[historico.periodo];
  const variacao = historico.variacaoExecucoes;
  const executada = `A consulta foi executada ${vezesPorExtenso(historico.consulta.quantidadeExecucoes)}`;

  if (variacao === null) return { tipo: 'VOLUME', tom: 'neutro', texto: `${executada}.` };
  if (Math.abs(variacao) < VARIACAO_DESPREZIVEL) {
    return { tipo: 'VOLUME', tom: 'neutro', texto: `${executada}, o mesmo volume ${anterior.de}.` };
  }
  const sentido = variacao > 0 ? 'a mais' : 'a menos';
  return { tipo: 'VOLUME', tom: 'neutro', texto: `${executada}, ${percentual(variacao)} ${sentido} que ${anterior.em}.` };
}

function destacarTempo(historico: HistoricoConsultaDTO): Destaque {
  const anterior = janelaAnteriorNaFrase[historico.periodo];
  const variacao = historico.variacaoTempoMedio;
  const ficou = `O tempo médio de execução ficou em ${formatarDuracaoMs(historico.consulta.tempoMedioMs)}`;

  if (variacao === null) return { tipo: 'TEMPO', tom: 'neutro', texto: `${ficou}.` };
  if (Math.abs(variacao) < VARIACAO_DESPREZIVEL) {
    return { tipo: 'TEMPO', tom: 'neutro', texto: `${ficou}, igual ao ${anterior.de}.` };
  }
  return variacao < 0
    ? { tipo: 'TEMPO', tom: 'positivo', texto: `${ficou}, ${percentual(variacao)} menor que ${anterior.em}.` }
    : { tipo: 'TEMPO', tom: 'atencao', texto: `${ficou}, ${percentual(variacao)} maior que ${anterior.em}.` };
}

function destacarPico(historico: HistoricoConsultaDTO): Destaque | null {
  const pico = pontoComMaisExecucoes(historico.pontos);
  if (!pico) return null;
  const quando = textosDoIntervalo[historico.periodo].naFrase(pico.instante);
  const execucoes = `${formatarNumero(pico.quantidadeExecucoes)} ${pluralizar(pico.quantidadeExecucoes, 'execução', 'execuções')}`;

  return { tipo: 'PICO', tom: 'neutro', texto: `O maior volume foi ${quando}, com ${execucoes}.` };
}

function destacarLentidao(historico: HistoricoConsultaDTO): Destaque | null {
  const lento = pontoMaisLento(historico.pontos);
  const tempoDoPeriodo = historico.consulta.tempoMedioMs;
  if (!lento || lento.tempoMedioMs === null || tempoDoPeriodo <= 0) return null;

  const excesso = (lento.tempoMedioMs / tempoDoPeriodo - 1) * 100;
  if (excesso < VARIACAO_DESPREZIVEL) {
    return {
      tipo: 'LENTIDAO',
      tom: 'neutro',
      texto: `O tempo médio não passou de ${formatarDuracaoMs(lento.tempoMedioMs)} em nenhum intervalo.`,
    };
  }

  const quando = textosDoIntervalo[historico.periodo].naFrase(lento.instante);
  const tempo = formatarDuracaoMs(lento.tempoMedioMs);
  return {
    tipo: 'LENTIDAO',
    tom: excesso >= EXCESSO_QUE_PEDE_ATENCAO ? 'atencao' : 'neutro',
    texto: `O intervalo mais lento foi ${quando}, com tempo médio de ${tempo}, ${formatarPercentual(excesso)} acima do tempo médio do período.`,
  };
}

export function montarDestaquesDoHistorico(historico: HistoricoConsultaDTO): Destaque[] {
  if (!foiExecutada(historico)) return [];
  return [destacarVolume(historico), destacarTempo(historico), destacarPico(historico), destacarLentidao(historico)].filter(
    (destaque): destaque is Destaque => destaque !== null,
  );
}

export function cabecalhoDoHistorico(nomeConexao: string, historico: HistoricoConsultaDTO, simulada: boolean): string {
  const aviso = simulada ? ' (dados demonstrativos)' : '';
  return `Histórico de uma consulta de ${nomeConexao}, ${descricaoPeriodo[historico.periodo]}${aviso}\n${historico.consulta.sql}`;
}
