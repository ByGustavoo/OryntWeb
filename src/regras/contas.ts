import type {
  CodigoPermissao,
  ContaDTO,
  FiltroSituacaoConta,
  FiltrosContas,
  NovaContaDTO,
  PerfilConta,
  SituacaoConta,
} from '@/modelos/administracao';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { correspondeABusca, limparBusca, termosDaBusca } from './buscaConsultas';
import { lerPagina, paginaAposMudanca } from './paginacaoLocal';
import { PERFIS, ehPerfil, normalizarPermissoes, rotuloDoPerfil } from './permissoesConta';
import { TAMANHO_MAXIMO_EMAIL } from './validacaoAcesso';

export const DIAS_SEM_ACESSO = 30;
export const DIAS_DE_VALIDADE_DO_CONVITE = 7;
export const TAMANHO_MINIMO_NOME = 2;
export const TAMANHO_MAXIMO_NOME = 80;
export const TENTATIVAS_ATE_BLOQUEAR = 5;
export const MINUTOS_DA_JANELA_DE_TENTATIVAS = 15;
export const MINUTOS_DE_BLOQUEIO = 15;

const DIA_MS = 86_400_000;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const situacoesDeConta: SituacaoConta[] = ['ATIVA', 'CONVITE_PENDENTE', 'CONVITE_EXPIRADO', 'BLOQUEADA', 'DESATIVADA'];

export const filtrosSituacaoConta: FiltroSituacaoConta[] = [
  'ATIVA',
  'SEM_ACESSO_RECENTE',
  'CONVITE_PENDENTE',
  'CONVITE_EXPIRADO',
  'BLOQUEADA',
  'DESATIVADA',
];

export const rotuloSituacaoConta: Record<SituacaoConta, string> = {
  ATIVA: 'Ativa',
  CONVITE_PENDENTE: 'Convite pendente',
  CONVITE_EXPIRADO: 'Convite expirado',
  BLOQUEADA: 'Bloqueada',
  DESATIVADA: 'Desativada',
};

export const rotuloFiltroSituacaoConta: Record<FiltroSituacaoConta, string> = {
  ...rotuloSituacaoConta,
  SEM_ACESSO_RECENTE: `Sem acesso há ${DIAS_SEM_ACESSO} dias`,
};

export const filtrosContasIniciais: FiltrosContas = { busca: '', perfil: null, situacao: null, pagina: 1 };

export function situacaoDaConta(conta: ContaDTO, agora: Date): SituacaoConta {
  if (!conta.ativa) return 'DESATIVADA';
  if (conta.bloqueadaAte !== null && new Date(conta.bloqueadaAte).getTime() > agora.getTime()) return 'BLOQUEADA';
  if (conta.convite !== null) return new Date(conta.convite.expiraEm).getTime() > agora.getTime() ? 'CONVITE_PENDENTE' : 'CONVITE_EXPIRADO';
  return 'ATIVA';
}

export function semAcessoRecente(conta: ContaDTO, agora: Date): boolean {
  if (situacaoDaConta(conta, agora) !== 'ATIVA') return false;
  const referencia = conta.ultimoAcessoEm ?? conta.criadaEm;
  return agora.getTime() - new Date(referencia).getTime() >= DIAS_SEM_ACESSO * DIA_MS;
}

function correspondeASituacao(conta: ContaDTO, filtro: FiltroSituacaoConta, agora: Date): boolean {
  if (filtro === 'SEM_ACESSO_RECENTE') return semAcessoRecente(conta, agora);
  return situacaoDaConta(conta, agora) === filtro;
}

export function lerFiltrosContas(valor: unknown): FiltrosContas {
  if (!valor || typeof valor !== 'object') return filtrosContasIniciais;
  const guardado = valor as Record<string, unknown>;
  return {
    busca: typeof guardado.busca === 'string' ? limparBusca(guardado.busca) : '',
    perfil: ehPerfil(guardado.perfil) ? guardado.perfil : null,
    situacao: filtrosSituacaoConta.find((item) => item === guardado.situacao) ?? null,
    pagina: lerPagina(guardado.pagina),
  };
}

export function aplicarMudancaContas(filtros: FiltrosContas, mudanca: Partial<FiltrosContas>): FiltrosContas {
  return lerFiltrosContas({ ...filtros, ...mudanca, pagina: paginaAposMudanca(filtros, mudanca) });
}

export function temFiltroAtivoContas(filtros: FiltrosContas): boolean {
  return filtros.busca !== '' || filtros.perfil !== null || filtros.situacao !== null;
}

export function semFiltrosContas(): Pick<FiltrosContas, 'busca' | 'perfil' | 'situacao'> {
  return { busca: '', perfil: null, situacao: null };
}

const ordemDaSituacao: Record<SituacaoConta, number> = {
  ATIVA: 0,
  BLOQUEADA: 1,
  CONVITE_PENDENTE: 2,
  CONVITE_EXPIRADO: 3,
  DESATIVADA: 4,
};

export function filtrarContas(contas: ContaDTO[], filtros: FiltrosContas, agora: Date): ContaDTO[] {
  const termos = termosDaBusca(filtros.busca);
  return contas
    .filter((conta) => filtros.perfil === null || conta.perfil === filtros.perfil)
    .filter((conta) => filtros.situacao === null || correspondeASituacao(conta, filtros.situacao, agora))
    .filter((conta) => termos.length === 0 || correspondeABusca(`${conta.nome}\n${conta.email}`, termos))
    .sort(
      (a, b) =>
        ordemDaSituacao[situacaoDaConta(a, agora)] - ordemDaSituacao[situacaoDaConta(b, agora)] ||
        a.nome.localeCompare(b.nome, 'pt-BR') ||
        a.email.localeCompare(b.email),
    );
}

export interface ContagemDeAtencao {
  semAcesso: number;
  convitesExpirados: number;
  bloqueadas: number;
}

export function contarAtencao(contas: ContaDTO[], agora: Date): ContagemDeAtencao {
  return {
    semAcesso: contas.filter((conta) => semAcessoRecente(conta, agora)).length,
    convitesExpirados: contas.filter((conta) => situacaoDaConta(conta, agora) === 'CONVITE_EXPIRADO').length,
    bloqueadas: contas.filter((conta) => situacaoDaConta(conta, agora) === 'BLOQUEADA').length,
  };
}

export function resumirContas(total: number, encontradas: number, filtros: FiltrosContas): string {
  const palavra = pluralizar(total, 'conta', 'contas');
  if (!temFiltroAtivoContas(filtros)) return `${formatarNumero(total)} ${palavra}`;
  return `${formatarNumero(encontradas)} de ${formatarNumero(total)} ${palavra}`;
}

export function descreverFiltrosContas(filtros: FiltrosContas): string[] {
  const partes: string[] = [];
  if (filtros.busca) partes.push(`busca “${filtros.busca}”`);
  if (filtros.perfil) partes.push(`perfil ${rotuloDoPerfil(filtros.perfil)}`);
  if (filtros.situacao) partes.push(rotuloFiltroSituacaoConta[filtros.situacao].toLowerCase());
  return partes;
}

export interface CamposConta {
  nome: string;
  email: string;
  perfil: PerfilConta;
  permissoes: CodigoPermissao[];
  ativa: boolean;
}

export type CampoConta = 'nome' | 'email';
export type ErrosConta = Partial<Record<CampoConta, string>>;

export const ORDEM_CAMPOS_CONTA: CampoConta[] = ['nome', 'email'];

export function validarNomeConta(valor: string): string | undefined {
  const nome = valor.trim();
  if (!nome) return 'Informe o nome da pessoa.';
  if (nome.length < TAMANHO_MINIMO_NOME) return `O nome precisa de pelo menos ${TAMANHO_MINIMO_NOME} letras.`;
  if (nome.length > TAMANHO_MAXIMO_NOME) return `O nome pode ter até ${TAMANHO_MAXIMO_NOME} caracteres.`;
  return undefined;
}

export function validarEmailConta(valor: string): string | undefined {
  const email = valor.trim();
  if (!email) return 'Informe o e-mail que a pessoa usa para entrar.';
  if (email.length > TAMANHO_MAXIMO_EMAIL) return `O e-mail pode ter até ${TAMANHO_MAXIMO_EMAIL} caracteres.`;
  if (!EMAIL_VALIDO.test(email)) return 'Digite um e-mail completo, como pessoa@empresa.com.';
  return undefined;
}

export function validarCampoConta(campo: CampoConta, valor: string): string | undefined {
  return campo === 'nome' ? validarNomeConta(valor) : validarEmailConta(valor);
}

export function validarConta(campos: Pick<CamposConta, CampoConta>): ErrosConta {
  const erros: ErrosConta = {};
  for (const campo of ORDEM_CAMPOS_CONTA) {
    const erro = validarCampoConta(campo, campos[campo]);
    if (erro) erros[campo] = erro;
  }
  return erros;
}

export function montarNovaConta(campos: CamposConta): NovaContaDTO {
  return {
    nome: campos.nome.trim().replace(/\s+/g, ' '),
    email: campos.email.trim().toLowerCase(),
    perfil: campos.perfil,
    permissoes: normalizarPermissoes(campos.permissoes),
    ativa: campos.ativa,
  };
}

export function emailJaUsado(contas: Pick<ContaDTO, 'id' | 'email'>[], email: string, ignorar: string | null): boolean {
  const normalizado = email.trim().toLowerCase();
  return contas.some((conta) => conta.id !== ignorar && conta.email.toLowerCase() === normalizado);
}

export function perfisOrdenados(): PerfilConta[] {
  return [...PERFIS];
}

export function descreverConvite(conta: ContaDTO, agora: Date): string | null {
  if (!conta.convite) return null;
  const expira = new Date(conta.convite.expiraEm);
  if (expira.getTime() <= agora.getTime()) return 'O convite expirou sem ser aceito. Reenvie para a pessoa definir a senha.';
  const dias = Math.ceil((expira.getTime() - agora.getTime()) / DIA_MS);
  return `A pessoa ainda não definiu a senha. O convite vale por mais ${formatarNumero(dias)} ${pluralizar(dias, 'dia', 'dias')}.`;
}

export function consequenciasDaExclusao(conta: ContaDTO): string[] {
  const itens = [
    'A pessoa perde o acesso ao Orynt na hora, e as sessões abertas dela terminam.',
    conta.conexoesSalvas > 0
      ? `As ${formatarNumero(conta.conexoesSalvas)} ${pluralizar(conta.conexoesSalvas, 'conexão salva', 'conexões salvas')} da conta são apagadas, sem mudar nada nos bancos.`
      : 'A conta não tem conexões salvas.',
    'A auditoria continua com tudo o que ela fez, com o nome e o e-mail que tinha em cada evento.',
    'As alterações que ela fez nos papéis e nas permissões do banco continuam em Alterações.',
  ];
  return itens;
}
