import type { ConsultaResumoDTO, DesempenhoConsulta, PontoAtividadeDTO } from './dashboard';

export type GranularidadeRelatorio = 'DIA' | 'SEMANA' | 'MES';

export interface PeriodoRelatorio {
  granularidade: GranularidadeRelatorio;
  inicio: string;
}

export interface IndicadoresRelatorioDTO {
  totalConsultas: number;
  variacaoTotalConsultas: number | null;
  tempoMedioMs: number;
  variacaoTempoMedio: number | null;
  consultasLentas: number;
  consultasDistintas: number;
  picoConexoes: number;
  instantePicoConexoes: string | null;
  limiteConexoes: number;
}

export interface FaixaDesempenhoDTO {
  desempenho: DesempenhoConsulta;
  consultasDistintas: number;
  quantidadeExecucoes: number;
  percentualExecucoes: number;
  percentualTempoTotal: number;
}

export interface ConsultaRelatorioDTO extends ConsultaResumoDTO {
  variacaoTempoMedio: number | null;
}

export interface ResumoRelatorioDTO {
  granularidade: GranularidadeRelatorio;
  inicio: string;
  fim: string;
  indicadores: IndicadoresRelatorioDTO;
  evolucao: PontoAtividadeDTO[];
  desempenho: FaixaDesempenhoDTO[];
  consultas: ConsultaRelatorioDTO[];
}

export interface ComparacaoRelatorio {
  principal: ResumoRelatorioDTO;
  base: ResumoRelatorioDTO;
}
