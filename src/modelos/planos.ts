import type { ConsultaDetalhadaDTO } from './consultas';

export type TipoCondicaoPlano =
  | 'CONDICAO_INDICE'
  | 'RECHECAGEM'
  | 'CONDICAO_HASH'
  | 'FILTRO'
  | 'FILTRO_JUNCAO'
  | 'CHAVE_ORDENACAO'
  | 'CHAVE_AGRUPAMENTO';

export type TipoJuncaoPlano = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'SEMI' | 'ANTI';

export type EstrategiaAgregacao = 'SIMPLES' | 'ORDENADA' | 'HASH';

export type OperacaoPlano = 'INSERT' | 'UPDATE' | 'DELETE';

export type MetodoOrdenacao = 'QUICKSORT' | 'TOP_N_HEAPSORT' | 'EXTERNAL_MERGE';

export interface CondicaoPlanoDTO {
  tipo: TipoCondicaoPlano;
  expressao: string;
}

export interface BuffersPlanoDTO {
  emCache: number;
  lidos: number;
  temporariosLidos: number;
  temporariosEscritos: number;
}

export interface OrdenacaoPlanoDTO {
  metodo: MetodoOrdenacao;
  espacoKb: number;
  emDisco: boolean;
}

export interface MemoriaPlanoDTO {
  lotes: number;
  memoriaKb: number;
  discoKb: number | null;
}

export interface NoPlanoDTO {
  id: number;
  tipo: string;
  operacao: OperacaoPlano | null;
  juncao: TipoJuncaoPlano | null;
  estrategia: EstrategiaAgregacao | null;
  sentidoInverso: boolean;
  relacao: string | null;
  apelido: string | null;
  indice: string | null;
  custoInicial: number;
  custoTotal: number;
  linhasEstimadas: number;
  larguraBytes: number;
  tempoInicialMs: number;
  tempoTotalMs: number;
  linhasReais: number;
  lacos: number;
  linhasRemovidasPeloFiltro: number | null;
  condicoes: CondicaoPlanoDTO[];
  buffers: BuffersPlanoDTO;
  ordenacao: OrdenacaoPlanoDTO | null;
  memoria: MemoriaPlanoDTO | null;
  filhos: NoPlanoDTO[];
}

export interface SugestaoIndiceDTO {
  no: number;
  tabela: string;
  colunas: string[];
  comando: string;
  extensao: string | null;
}

export interface PlanoExecucaoDTO {
  id: string;
  registradoEm: string;
  tempoPlanejamentoMs: number;
  tempoExecucaoMs: number;
  raiz: NoPlanoDTO;
  sugestoes: SugestaoIndiceDTO[];
}

export interface VersaoPlanoDTO {
  id: string;
  primeiroRegistro: string;
  ultimoRegistro: string;
  quantidadeExecucoes: number;
  tempoMedioMs: number;
}

export interface PlanosConsultaDTO {
  consulta: ConsultaDetalhadaDTO;
  posicao: number | null;
  totalDoPeriodo: number;
  idAnterior: string | null;
  idSeguinte: string | null;
  versoes: VersaoPlanoDTO[];
  plano: PlanoExecucaoDTO | null;
}

export interface SelecaoPlano {
  consulta: string | null;
  versao: string | null;
  comparacao: string | null;
}
