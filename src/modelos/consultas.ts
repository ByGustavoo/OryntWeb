import type { ConsultaResumoDTO, DesempenhoConsulta, PeriodoDashboard } from './dashboard';

export type TipoComando = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OUTRO';

export type OrdenacaoConsultas = 'PERCENTUAL_TEMPO_TOTAL' | 'TEMPO_MEDIO' | 'TEMPO_MAXIMO' | 'EXECUCOES';

export type DirecaoOrdenacao = 'ASC' | 'DESC';

export interface ConsultaDetalhadaDTO extends ConsultaResumoDTO {
  tipo: TipoComando;
  tempoTotalMs: number;
  tempoMinimoMs: number;
  tempoMaximoMs: number;
  linhasPorExecucao: number;
}

export interface PaginaConsultasDTO {
  itens: ConsultaDetalhadaDTO[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
  totalDoPeriodo: number;
}

export interface PontoHistoricoDTO {
  instante: string;
  quantidadeExecucoes: number;
  tempoMedioMs: number | null;
  tempoMaximoMs: number | null;
}

export interface TrocaDePlanoDTO {
  instante: string;
  versao: string;
  versaoAnterior: string;
}

export interface HistoricoConsultaDTO {
  periodo: PeriodoDashboard;
  consulta: ConsultaDetalhadaDTO;
  variacaoExecucoes: number | null;
  variacaoTempoMedio: number | null;
  posicao: number | null;
  totalDoPeriodo: number;
  idAnterior: string | null;
  idSeguinte: string | null;
  pontos: PontoHistoricoDTO[];
  trocasDePlano: TrocaDePlanoDTO[];
}

export interface SelecaoHistorico {
  consulta: string | null;
  periodo: PeriodoDashboard;
}

export interface FiltrosConsultas {
  periodo: PeriodoDashboard;
  busca: string;
  desempenho: DesempenhoConsulta | null;
  tipo: TipoComando | null;
  ordenacao: OrdenacaoConsultas;
  direcao: DirecaoOrdenacao;
  pagina: number;
}
