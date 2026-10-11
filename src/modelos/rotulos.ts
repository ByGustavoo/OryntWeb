import type { TipoBanco } from './conexao';
import type { DesempenhoConsulta, PeriodoDashboard } from './dashboard';

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

export const rotuloDesempenho: Record<DesempenhoConsulta, string> = {
  RAPIDA: 'Rápida',
  MODERADA: 'Moderada',
  LENTA: 'Lenta',
};
