import type { Privilegio, TipoObjetoPermissao, TipoPrivilegioPadrao } from './permissoes';

export interface AtributosDoPapelDTO {
  login: boolean;
  superusuario: boolean;
  criaBancos: boolean;
  criaPapeis: boolean;
  replicacao: boolean;
  ignoraRls: boolean;
  herda: boolean;
}

export type SenhaDaOperacaoDTO =
  | { tipo: 'VERIFICADOR'; valor: string }
  | { tipo: 'NENHUMA' }
  | { tipo: 'OCULTA' };

export interface ReferenciaObjetoDTO {
  id: string;
  tipo: TipoObjetoPermissao;
  esquema: string | null;
  nome: string;
}

export type TipoTodosDoEsquema = 'TABELAS' | 'SEQUENCIAS' | 'FUNCOES';

export type AlvoDaConcessaoDTO =
  | { tipo: 'OBJETO'; objeto: ReferenciaObjetoDTO }
  | { tipo: 'TODOS_DO_ESQUEMA'; esquema: string; tipoDeObjeto: TipoTodosDoEsquema };

export interface CriarPapelDTO {
  tipo: 'CRIAR_PAPEL';
  papel: string;
  atributos: AtributosDoPapelDTO;
  limiteConexoes: number | null;
  validadeSenha: string | null;
  senha: SenhaDaOperacaoDTO | null;
}

export interface AlterarPapelDTO {
  tipo: 'ALTERAR_PAPEL';
  papel: string;
  atributos: Partial<AtributosDoPapelDTO>;
  limiteConexoes?: number | null;
  validadeSenha?: string | null;
  senha?: SenhaDaOperacaoDTO;
}

export interface RenomearPapelDTO {
  tipo: 'RENOMEAR_PAPEL';
  papel: string;
  novoNome: string;
}

export interface DescreverPapelDTO {
  tipo: 'DESCREVER_PAPEL';
  papel: string;
  descricao: string | null;
}

export interface ConfigurarPapelDTO {
  tipo: 'CONFIGURAR_PAPEL';
  papel: string;
  parametro: string;
  valor: string | null;
}

export interface ExcluirPapelDTO {
  tipo: 'EXCLUIR_PAPEL';
  papel: string;
  herdeiro: string | null;
  removerPermissoes: boolean;
  encerrarSessoes: boolean;
}

export interface ConcederParticipacaoDTO {
  tipo: 'CONCEDER_PARTICIPACAO';
  grupo: string;
  membro: string;
  herda: boolean;
  assume: boolean;
  administra: boolean;
}

export interface RevogarParticipacaoDTO {
  tipo: 'REVOGAR_PARTICIPACAO';
  grupo: string;
  membro: string;
}

export interface ConcederPrivilegiosDTO {
  tipo: 'CONCEDER';
  alvo: AlvoDaConcessaoDTO;
  beneficiario: string;
  privilegios: Privilegio[];
  colunas: string[] | null;
  repassavel: boolean;
}

export interface RevogarPrivilegiosDTO {
  tipo: 'REVOGAR';
  alvo: AlvoDaConcessaoDTO;
  beneficiario: string;
  privilegios: Privilegio[];
  colunas: string[] | null;
  soRepasse: boolean;
  concedentes: string[];
  cascata: boolean;
}

export interface PrivilegioPadraoOperacaoDTO {
  tipo: 'PRIVILEGIO_PADRAO';
  acao: 'CONCEDER' | 'REVOGAR';
  criador: string;
  esquema: string | null;
  tipoDeObjeto: TipoPrivilegioPadrao;
  beneficiario: string;
  privilegios: Privilegio[];
}

export type OperacaoDTO =
  | CriarPapelDTO
  | AlterarPapelDTO
  | RenomearPapelDTO
  | DescreverPapelDTO
  | ConfigurarPapelDTO
  | ExcluirPapelDTO
  | ConcederParticipacaoDTO
  | RevogarParticipacaoDTO
  | ConcederPrivilegiosDTO
  | RevogarPrivilegiosDTO
  | PrivilegioPadraoOperacaoDTO;

export type TipoOperacao = OperacaoDTO['tipo'];

export type OrigemDaAlteracao = 'FORMULARIO' | 'MODELO' | 'PONTO_DE_ATENCAO' | 'LOTE' | 'DESFAZER' | 'DETALHE';

export interface PedidoAlteracaoDTO {
  operacoes: OperacaoDTO[];
  inversas: OperacaoDTO[] | null;
  desfaz: string | null;
  origem: OrigemDaAlteracao;
}

export type ResultadoAlteracao = 'APLICADA' | 'RECUSADA';

export interface FalhaDaAlteracaoDTO {
  codigo: string;
  mensagem: string;
}

export interface AlteracaoDTO {
  id: string;
  feitaEm: string;
  conta: string;
  papelDaConexao: string;
  banco: string;
  origem: OrigemDaAlteracao;
  operacoes: OperacaoDTO[];
  comandos: string[];
  resultado: ResultadoAlteracao;
  falha: FalhaDaAlteracaoDTO | null;
  inversas: OperacaoDTO[] | null;
  desfaz: string | null;
  desfeitaPor: string | null;
}

export interface ListaAlteracoesDTO {
  geradoEm: string;
  papelDaConexao: string;
  alteracoes: AlteracaoDTO[];
}

export type FiltroResultadoAlteracao = 'APLICADA' | 'RECUSADA' | 'DESFEITA';

export interface FiltrosAlteracoes {
  busca: string;
  resultado: FiltroResultadoAlteracao | null;
  papel: string | null;
  pagina: number;
}

export const PROBLEMAS_ALTERACAO = {
  permissaoNegada: '/problems/database-permission-denied',
  dependencias: '/problems/database-dependent-objects',
  duplicado: '/problems/database-duplicate-object',
  inexistente: '/problems/database-undefined-object',
  participacaoInvalida: '/problems/database-invalid-grant',
  emUso: '/problems/database-object-in-use',
  recusado: '/problems/database-command-failed',
} as const;

export type ProblemaAlteracao = keyof typeof PROBLEMAS_ALTERACAO;
