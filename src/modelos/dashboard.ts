export type PeriodoDashboard = 'ULTIMA_HORA' | 'ULTIMAS_24_HORAS' | 'ULTIMOS_7_DIAS' | 'ULTIMOS_30_DIAS';

export type DesempenhoConsulta = 'RAPIDA' | 'MODERADA' | 'LENTA';

export interface IndicadoresDashboardDTO {
  periodo: PeriodoDashboard;
  totalConsultas: number;
  variacaoTotalConsultas: number | null;
  tempoMedioMs: number;
  variacaoTempoMedio: number | null;
  consultasLentas: number;
  consultasDistintas: number;
  conexoesAtivas: number;
  limiteConexoes: number;
}

export interface PontoAtividadeDTO {
  instante: string;
  consultas: number;
  tempoMedioMs: number;
}

export interface ConsultaResumoDTO {
  id: string;
  sql: string;
  tempoMedioMs: number;
  quantidadeExecucoes: number;
  percentualTempoTotal: number;
  desempenho: DesempenhoConsulta;
}
