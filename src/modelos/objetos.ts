import type { ConsultaDetalhadaDTO, DirecaoOrdenacao } from './consultas';

export type TipoVisao = 'COMUM' | 'MATERIALIZADA';

export type TipoObjetoBanco = 'TABELA' | 'VISAO' | 'VISAO_MATERIALIZADA';

export interface ReferenciaObjetoDTO {
  tipo: TipoObjetoBanco;
  esquema: string;
  nome: string;
}

export interface ColunaVisaoDTO {
  nome: string;
  tipo: string;
}

export interface MaterializacaoDTO {
  populada: boolean;
  tamanhoBytes: number;
  linhas: number;
  ultimaAtualizacao: string | null;
  atualizacao: ConsultaDetalhadaDTO | null;
}

export interface VisaoDTO {
  id: string;
  tipo: TipoVisao;
  esquema: string;
  nome: string;
  dono: string;
  descricao: string | null;
  definicao: string;
  colunas: ColunaVisaoDTO[];
  dependeDe: ReferenciaObjetoDTO[];
  usadaPor: ReferenciaObjetoDTO[];
  consultas: ConsultaDetalhadaDTO[];
  materializacao: MaterializacaoDTO | null;
}

export interface ListaVisoesDTO {
  geradoEm: string;
  visoes: VisaoDTO[];
}

export type SituacaoMaterializada = 'ATUALIZADA' | 'DESATUALIZADA' | 'NAO_POPULADA';

export type FiltroSituacaoVisao = 'SEM_DADOS' | 'DESATUALIZADAS' | 'SEM_LEITURA';

export type OrdenacaoVisoes = 'NOME' | 'LEITURAS' | 'TAMANHO' | 'ATUALIZACAO';

export interface FiltrosVisoes {
  busca: string;
  tipo: TipoVisao | null;
  esquema: string | null;
  situacao: FiltroSituacaoVisao | null;
  ordenacao: OrdenacaoVisoes;
  direcao: DirecaoOrdenacao;
  pagina: number;
}

export type MetodoIndice = 'BTREE' | 'HASH' | 'GIN' | 'GIST' | 'SPGIST' | 'BRIN';

export type RestricaoIndice = 'CHAVE_PRIMARIA' | 'UNICA' | 'EXCLUSAO';

export interface TabelaDoIndiceDTO {
  tipo: Exclude<TipoObjetoBanco, 'VISAO'>;
  esquema: string;
  nome: string;
  tamanhoBytes: number;
  linhas: number;
  insercoes: number;
  atualizacoes: number;
  atualizacoesHot: number;
}

export interface UsoDoIndiceDTO {
  consulta: ConsultaDetalhadaDTO;
  etapa: string;
  leiturasPorExecucao: number;
  versao: string;
  versaoAtual: string;
  usadoAte: string | null;
}

export interface IndiceDTO {
  id: string;
  esquema: string;
  nome: string;
  tabela: TabelaDoIndiceDTO;
  metodo: MetodoIndice;
  colunas: string[];
  incluidas: string[];
  predicado: string | null;
  unico: boolean;
  restricao: RestricaoIndice | null;
  valido: boolean;
  definicao: string;
  tamanhoBytes: number;
  leituras: number;
  linhasLidas: number;
  observadoDesde: string;
  usos: UsoDoIndiceDTO[];
}

export interface SugestaoDeIndiceDTO {
  tabela: string;
  colunas: string[];
  comando: string;
  extensao: string | null;
  consultas: ConsultaDetalhadaDTO[];
}

export interface ListaIndicesDTO {
  geradoEm: string;
  coletaDesde: string;
  indices: IndiceDTO[];
  sugestoes: SugestaoDeIndiceDTO[];
}

export type SituacaoIndice =
  | 'INVALIDO'
  | 'DUPLICADO'
  | 'REDUNDANTE'
  | 'SEM_USO'
  | 'EM_OBSERVACAO'
  | 'GARANTE_UNICIDADE'
  | 'EM_USO';

export type FiltroSituacaoIndice = 'INVALIDOS' | 'DUPLICADOS' | 'SEM_USO';

export type OrdenacaoIndices = 'NOME' | 'TAMANHO' | 'LEITURAS';

export type AbaIndices = 'EXISTENTES' | 'SUGERIDOS';

export interface FiltrosIndices {
  busca: string;
  esquema: string | null;
  tabela: string | null;
  situacao: FiltroSituacaoIndice | null;
  ordenacao: OrdenacaoIndices;
  direcao: DirecaoOrdenacao;
  pagina: number;
  aba: AbaIndices;
}
