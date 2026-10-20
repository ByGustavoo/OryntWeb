import type { ParticipacaoDTO } from './papeis';

export type TipoObjetoPermissao =
  | 'BANCO'
  | 'ESQUEMA'
  | 'TABELA'
  | 'VISAO'
  | 'VISAO_MATERIALIZADA'
  | 'SEQUENCIA'
  | 'FUNCAO'
  | 'PROCEDIMENTO';

export type Privilegio =
  | 'CONNECT'
  | 'CREATE'
  | 'TEMPORARY'
  | 'USAGE'
  | 'SELECT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'TRUNCATE'
  | 'REFERENCES'
  | 'TRIGGER'
  | 'MAINTAIN'
  | 'EXECUTE';

export type TipoPrivilegioPadrao = 'TABELAS' | 'SEQUENCIAS' | 'FUNCOES';

export interface ConcessaoDTO {
  beneficiario: string;
  privilegio: Privilegio;
  concedente: string;
  repassavel: boolean;
  colunas: string[] | null;
}

export interface ObjetoComPermissoesDTO {
  id: string;
  tipo: TipoObjetoPermissao;
  esquema: string | null;
  nome: string;
  dono: string;
  segurancaDefinidor: boolean;
  colunas: string[];
  concessoes: ConcessaoDTO[];
}

export interface PrivilegioPadraoDTO {
  criador: string;
  esquema: string | null;
  tipoDeObjeto: TipoPrivilegioPadrao;
  beneficiario: string;
  privilegios: Privilegio[];
}

export interface PapelDasPermissoesDTO {
  nome: string;
  descricao: string | null;
  login: boolean;
  superusuario: boolean;
  membroDe: ParticipacaoDTO[];
}

export interface ListaPermissoesDTO {
  geradoEm: string;
  banco: string;
  papelDaConexao: string;
  papeis: PapelDasPermissoesDTO[];
  objetos: ObjetoComPermissoesDTO[];
  privilegiosPadrao: PrivilegioPadraoDTO[];
}

export type ModoPermissoes = 'PAPEL' | 'OBJETO' | 'COMPARACAO';

export type NivelDeAcesso = 'TOTAL' | 'ESCRITA' | 'LEITURA' | 'MANUTENCAO' | 'NENHUM';

export type FiltroDeAcesso = 'TOTAL' | 'ESCRITA' | 'LEITURA' | 'MANUTENCAO' | 'SEM_ACESSO';

export type FiltroDePapel = 'USUARIO' | 'GRUPO';

export type SituacaoPermissao =
  | 'DEFINIDOR_ABERTO'
  | 'TODOS_CRIAM'
  | 'ESCRITA_NA_LEITURA'
  | 'REPASSE'
  | 'SEM_USAGE'
  | 'SEM_PRIVILEGIO_PADRAO'
  | 'USAGE_SEM_OBJETOS';

export interface FiltrosPermissoes {
  modo: ModoPermissoes;
  papel: string | null;
  objeto: string | null;
  comparado: string | null;
  busca: string;
  esquema: string | null;
  tipoObjeto: TipoObjetoPermissao | null;
  tipoPapel: FiltroDePapel | null;
  acesso: FiltroDeAcesso | null;
  situacao: SituacaoPermissao | null;
  soDiferencas: boolean;
  pagina: number;
}
