import type { DirecaoOrdenacao } from './consultas';

export type MetodoSenha = 'SCRAM' | 'MD5' | 'SEM_SENHA';

export type AtributoPapel = 'SUPERUSUARIO' | 'CRIA_BANCOS' | 'CRIA_PAPEIS' | 'REPLICACAO' | 'IGNORA_RLS';

export type TipoPapel = 'USUARIO' | 'GRUPO';

export type TipoObjetoDoPapel = 'TABELA' | 'VISAO' | 'VISAO_MATERIALIZADA' | 'FUNCAO' | 'PROCEDIMENTO';

export interface ParticipacaoDTO {
  papel: string;
  herda: boolean;
  assume: boolean;
  administra: boolean;
}

export interface FuncaoDoDonoDTO {
  segurancaDefinidor: boolean;
  configuracoes: string[];
}

export interface ObjetoDoPapelDTO {
  tipo: TipoObjetoDoPapel;
  id: string;
  esquema: string;
  nome: string;
  funcao: FuncaoDoDonoDTO | null;
}

export interface PapelDTO {
  nome: string;
  descricao: string | null;
  inicial: boolean;
  login: boolean;
  superusuario: boolean;
  criaBancos: boolean;
  criaPapeis: boolean;
  replicacao: boolean;
  ignoraRls: boolean;
  herda: boolean;
  limiteConexoes: number | null;
  validadeSenha: string | null;
  metodoSenha: MetodoSenha | null;
  configuracoes: string[];
  membroDe: ParticipacaoDTO[];
  membros: ParticipacaoDTO[];
  sessoes: number;
  ociosasEmTransacao30Dias: number;
  vistoPorUltimo: string | null;
  observadoDesde: string;
  objetos: ObjetoDoPapelDTO[];
}

export interface ListaPapeisDTO {
  geradoEm: string;
  coletaDesde: string;
  papelDaConexao: string;
  limiteOciosoEmTransacao: string | null;
  papeis: PapelDTO[];
}

export type SituacaoPapel =
  | 'SUPERUSUARIO'
  | 'VALIDADE_DA_SENHA'
  | 'SENHA_MD5'
  | 'PERTO_DO_LIMITE'
  | 'SEM_USO'
  | 'GRUPO_VAZIO';

export type OrdenacaoPapeis = 'NOME' | 'SESSOES' | 'ULTIMO_USO' | 'VALIDADE';

export interface FiltrosPapeis {
  busca: string;
  tipo: TipoPapel | null;
  atributo: AtributoPapel | null;
  situacao: SituacaoPapel | null;
  ordenacao: OrdenacaoPapeis;
  direcao: DirecaoOrdenacao;
  pagina: number;
}
