import type { DirecaoOrdenacao } from './consultas';

export type TipoProcesso = 'CLIENTE' | 'REPLICACAO' | 'AUTOVACUUM' | 'SERVIDOR';

export type EstadoSessao =
  | 'ATIVA'
  | 'OCIOSA'
  | 'OCIOSA_EM_TRANSACAO'
  | 'OCIOSA_EM_TRANSACAO_ABORTADA'
  | 'CHAMADA_DE_FUNCAO'
  | 'DESATIVADA';

export type TipoBloqueio = 'RELACAO' | 'TRANSACAO' | 'TUPLA' | 'CONSULTIVO';

export interface EsperaDTO {
  tipo: string;
  evento: string;
}

export interface BloqueioDTO {
  tipo: TipoBloqueio;
  alvo: string | null;
  modo: string;
  concedido: boolean;
}

export interface SessaoDTO {
  pid: number;
  tipo: TipoProcesso;
  processo: string;
  papel: string | null;
  banco: string | null;
  aplicacao: string | null;
  endereco: string | null;
  iniciadaEm: string;
  transacaoDesde: string | null;
  consultaDesde: string | null;
  estadoDesde: string | null;
  estado: EstadoSessao | null;
  espera: EsperaDTO | null;
  consulta: string | null;
  consultaId: string | null;
  bloqueadaPor: number[];
  bloqueios: BloqueioDTO[];
  doOrynt: boolean;
}

export interface PapelDasSessoesDTO {
  nome: string;
  limiteConexoes: number | null;
  configuracoes: string[];
  ociosasEmTransacao30Dias: number;
}

export interface ListaSessoesDTO {
  geradoEm: string;
  bancoDaConexao: string;
  limiteConexoes: number;
  limiteOciosoEmTransacao: string | null;
  papeis: PapelDasSessoesDTO[];
  sessoes: SessaoDTO[];
}

export type SituacaoSessao =
  | 'BLOQUEANDO'
  | 'ESPERANDO_BLOQUEIO'
  | 'OCIOSA_EM_TRANSACAO'
  | 'CONSULTA_LONGA'
  | 'TRANSACAO_LONGA';

export type EstadoExibido = 'ATIVA' | 'ESPERANDO' | 'OCIOSA_EM_TRANSACAO' | 'OCIOSA' | 'OUTRO';

export type OrdenacaoSessoes = 'URGENCIA' | 'PID' | 'TEMPO_NO_ESTADO' | 'TRANSACAO';

export interface FiltrosSessoes {
  busca: string;
  banco: string | null;
  estado: EstadoExibido | null;
  situacao: SituacaoSessao | null;
  papel: string | null;
  processos: boolean;
  automatica: boolean;
  ordenacao: OrdenacaoSessoes;
  direcao: DirecaoOrdenacao;
  pagina: number;
}
