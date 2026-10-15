import type { TipoBanco } from './conexao';
import type { DirecaoOrdenacao, OrdenacaoConsultas, TipoComando } from './consultas';
import type { DesempenhoConsulta, PeriodoDashboard } from './dashboard';
import type { GranularidadeRelatorio } from './relatorios';

export const rotuloTipoBanco: Record<TipoBanco, string> = {
  POSTGRESQL: 'PostgreSQL',
};

export const periodosDashboard: PeriodoDashboard[] = ['ULTIMA_HORA', 'ULTIMAS_24_HORAS', 'ULTIMOS_7_DIAS', 'ULTIMOS_30_DIAS'];

export const rotuloPeriodo: Record<PeriodoDashboard, string> = {
  ULTIMA_HORA: '1 h',
  ULTIMAS_24_HORAS: '24 h',
  ULTIMOS_7_DIAS: '7 dias',
  ULTIMOS_30_DIAS: '30 dias',
};

export const descricaoPeriodo: Record<PeriodoDashboard, string> = {
  ULTIMA_HORA: 'na última hora',
  ULTIMAS_24_HORAS: 'nas últimas 24 horas',
  ULTIMOS_7_DIAS: 'nos últimos 7 dias',
  ULTIMOS_30_DIAS: 'nos últimos 30 dias',
};

export const desempenhosConsulta: DesempenhoConsulta[] = ['RAPIDA', 'MODERADA', 'LENTA'];

export const rotuloDesempenho: Record<DesempenhoConsulta, string> = {
  RAPIDA: 'Rápida',
  MODERADA: 'Moderada',
  LENTA: 'Lenta',
};

export const rotuloFaixaDesempenho: Record<DesempenhoConsulta, string> = {
  RAPIDA: 'Rápidas',
  MODERADA: 'Moderadas',
  LENTA: 'Lentas',
};

export const tiposComando: TipoComando[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'OUTRO'];

export const rotuloTipoComando: Record<TipoComando, string> = {
  SELECT: 'SELECT',
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  OUTRO: 'Outros',
};

export const ordenacoesConsultas: OrdenacaoConsultas[] = ['TEMPO_MEDIO', 'TEMPO_MAXIMO', 'EXECUCOES', 'PERCENTUAL_TEMPO_TOTAL'];

export const direcoesOrdenacao: DirecaoOrdenacao[] = ['ASC', 'DESC'];

export const rotuloGranularidade: Record<GranularidadeRelatorio, string> = {
  DIA: 'Dia',
  SEMANA: 'Semana',
  MES: 'Mês',
};

export const passoAnterior: Record<GranularidadeRelatorio, string> = {
  DIA: 'Dia anterior',
  SEMANA: 'Semana anterior',
  MES: 'Mês anterior',
};

export const passoSeguinte: Record<GranularidadeRelatorio, string> = {
  DIA: 'Dia seguinte',
  SEMANA: 'Semana seguinte',
  MES: 'Mês seguinte',
};
