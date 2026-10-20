export type PerfilConta = 'ADMINISTRADOR' | 'ANALISTA' | 'LEITOR';

export type CodigoPermissao =
  | 'DASHBOARD_VER'
  | 'RELATORIOS_VER'
  | 'CONSULTAS_VER'
  | 'OBJETOS_VER'
  | 'BANCO_ACESSOS_VER'
  | 'BANCO_PAPEIS_ALTERAR'
  | 'BANCO_PERMISSOES_ALTERAR'
  | 'CONEXOES_USAR'
  | 'ADMIN_USUARIOS'
  | 'ADMIN_AUDITORIA';

export interface ConviteDTO {
  enviadoEm: string;
  expiraEm: string;
}

export interface AutorDTO {
  id: string | null;
  nome: string;
  email: string;
}

export interface ContaDTO {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilConta;
  permissoes: CodigoPermissao[];
  ativa: boolean;
  inicial: boolean;
  criadaEm: string;
  criadaPor: AutorDTO | null;
  atualizadaEm: string;
  ultimoAcessoEm: string | null;
  convite: ConviteDTO | null;
  bloqueadaAte: string | null;
  sessoesAtivas: number;
  conexoesSalvas: number;
}

export interface ListaContasDTO {
  geradoEm: string;
  contaAtual: string;
  contas: ContaDTO[];
}

export interface NovaContaDTO {
  nome: string;
  email: string;
  perfil: PerfilConta;
  permissoes: CodigoPermissao[];
  ativa: boolean;
}

export interface EdicaoContaDTO {
  nome?: string;
  email?: string;
  ativa?: boolean;
}

export interface PermissoesContaDTO {
  perfil: PerfilConta;
  permissoes: CodigoPermissao[];
}

export type SituacaoConta = 'ATIVA' | 'CONVITE_PENDENTE' | 'CONVITE_EXPIRADO' | 'BLOQUEADA' | 'DESATIVADA';

export type FiltroSituacaoConta = SituacaoConta | 'SEM_ACESSO_RECENTE';

export interface FiltrosContas {
  busca: string;
  perfil: PerfilConta | null;
  situacao: FiltroSituacaoConta | null;
  pagina: number;
}

export type ModuloAuditoria =
  | 'ACESSO'
  | 'DASHBOARD'
  | 'RELATORIOS'
  | 'CONSULTAS'
  | 'OBJETOS'
  | 'BANCO'
  | 'CONEXOES'
  | 'ADMINISTRACAO'
  | 'CONFIGURACOES';

export type CategoriaAuditoria = 'AUTENTICACAO' | 'NAVEGACAO' | 'CONSULTA' | 'CRIACAO' | 'ATUALIZACAO' | 'EXCLUSAO' | 'PERMISSOES';

export type ResultadoAuditoria = 'SUCESSO' | 'FALHA' | 'NEGADO';

export type TipoEventoAuditoria =
  | 'LOGIN'
  | 'LOGIN_FALHOU'
  | 'LOGIN_BLOQUEADO'
  | 'LOGOUT'
  | 'RECUPERACAO_PEDIDA'
  | 'SENHA_REDEFINIDA'
  | 'CONVITE_ACEITO'
  | 'TELA_ACESSADA'
  | 'ACESSO_NEGADO'
  | 'CONTA_CRIADA'
  | 'CONTA_EDITADA'
  | 'CONTA_ATIVADA'
  | 'CONTA_DESATIVADA'
  | 'CONTA_EXCLUIDA'
  | 'CONTA_DESBLOQUEADA'
  | 'CONVITE_REENVIADO'
  | 'SESSOES_ENCERRADAS'
  | 'PERMISSOES_ALTERADAS'
  | 'CONEXAO_CRIADA'
  | 'CONEXAO_ATIVADA'
  | 'CONEXAO_ENCERRADA'
  | 'CONEXAO_RENOMEADA'
  | 'CONEXAO_EXCLUIDA'
  | 'BANCO_ALTERADO';

export type TipoAlvoAuditoria = 'CONTA' | 'CONEXAO' | 'TELA' | 'ROTA' | 'ALTERACAO';

export interface AlvoAuditoriaDTO {
  tipo: TipoAlvoAuditoria;
  id: string;
  rotulo: string;
}

export interface MudancaAuditoriaDTO {
  campo: string;
  antes: string | null;
  depois: string | null;
}

export interface EventoAuditoriaDTO {
  id: string;
  ocorridoEm: string;
  tipo: TipoEventoAuditoria;
  categoria: CategoriaAuditoria;
  modulo: ModuloAuditoria;
  resultado: ResultadoAuditoria;
  conta: AutorDTO | null;
  emailInformado: string | null;
  alvo: AlvoAuditoriaDTO | null;
  mudancas: MudancaAuditoriaDTO[];
  concedidas: CodigoPermissao[];
  revogadas: CodigoPermissao[];
  motivo: string | null;
  requisicao: { metodo: string; caminho: string } | null;
  origem: { ip: string | null; navegador: string | null };
}

export type PeriodoAuditoria = 'ULTIMA_HORA' | 'ULTIMAS_24_HORAS' | 'ULTIMOS_7_DIAS' | 'ULTIMOS_30_DIAS';

export interface FiltrosAuditoria {
  busca: string;
  conta: string | null;
  categoria: CategoriaAuditoria | null;
  modulo: ModuloAuditoria | null;
  resultado: ResultadoAuditoria | null;
  periodo: PeriodoAuditoria | null;
  pagina: number;
}

export interface ContagemAuditoriaDTO<T extends string> {
  chave: T;
  eventos: number;
}

export interface ResumoContaAuditoriaDTO {
  conta: AutorDTO;
  primeiroEventoEm: string | null;
  ultimoEventoEm: string | null;
  porModulo: ContagemAuditoriaDTO<ModuloAuditoria>[];
  porCategoria: ContagemAuditoriaDTO<CategoriaAuditoria>[];
  negados: number;
}

export interface PaginaAuditoriaDTO {
  geradoEm: string;
  itens: EventoAuditoriaDTO[];
  pagina: number;
  itensPorPagina: number;
  totalItens: number;
  totalPaginas: number;
  totalRegistrados: number;
  registradosDesde: string | null;
  contas: AutorDTO[];
  resumoDaConta: ResumoContaAuditoriaDTO | null;
}

export interface AcessoTelaDTO {
  tela: string;
}

export const PROBLEMAS_ADMINISTRACAO = {
  semPermissao: '/problems/forbidden',
  emailEmUso: '/problems/email-in-use',
  protecaoAdministrador: '/problems/administrator-protection',
  elevacaoDePrivilegio: '/problems/privilege-escalation',
  contaDesativada: '/problems/account-disabled',
  muitasTentativas: '/problems/too-many-attempts',
  conviteInvalido: '/problems/invalid-invitation',
} as const;
