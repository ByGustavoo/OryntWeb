import type {
  CategoriaAuditoria,
  EventoAuditoriaDTO,
  FiltrosAuditoria,
  ModuloAuditoria,
  PeriodoAuditoria,
  ResultadoAuditoria,
  TipoEventoAuditoria,
} from '@/modelos/administracao';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { correspondeABusca, limparBusca, termosDaBusca } from './buscaConsultas';
import { lerPagina, paginaAposMudanca } from './paginacaoLocal';
import { rotuloDaPermissao } from './permissoesConta';

export const EVENTOS_POR_PAGINA = 25;
export const LIMITE_DE_EVENTOS_GUARDADOS = 5000;

export const categoriasAuditoria: CategoriaAuditoria[] = [
  'AUTENTICACAO',
  'NAVEGACAO',
  'CONSULTA',
  'CRIACAO',
  'ATUALIZACAO',
  'EXCLUSAO',
  'PERMISSOES',
];

export const rotuloCategoriaAuditoria: Record<CategoriaAuditoria, string> = {
  AUTENTICACAO: 'Login e logout',
  NAVEGACAO: 'Acesso a telas',
  CONSULTA: 'Consulta de dados',
  CRIACAO: 'Criação',
  ATUALIZACAO: 'Atualização',
  EXCLUSAO: 'Exclusão',
  PERMISSOES: 'Permissões',
};

export const modulosAuditoria: ModuloAuditoria[] = [
  'ACESSO',
  'DASHBOARD',
  'RELATORIOS',
  'CONSULTAS',
  'OBJETOS',
  'BANCO',
  'CONEXOES',
  'ADMINISTRACAO',
  'CONFIGURACOES',
];

export const rotuloModuloAuditoria: Record<ModuloAuditoria, string> = {
  ACESSO: 'Acesso',
  DASHBOARD: 'Dashboard',
  RELATORIOS: 'Relatórios',
  CONSULTAS: 'Consultas SQL',
  OBJETOS: 'Objetos do banco',
  BANCO: 'Usuários e permissões',
  CONEXOES: 'Conexões',
  ADMINISTRACAO: 'Administração',
  CONFIGURACOES: 'Configurações',
};

export const resultadosAuditoria: ResultadoAuditoria[] = ['SUCESSO', 'FALHA', 'NEGADO'];

export const rotuloResultadoAuditoria: Record<ResultadoAuditoria, string> = {
  SUCESSO: 'Sucesso',
  FALHA: 'Falha',
  NEGADO: 'Negado',
};

export const periodosAuditoria: PeriodoAuditoria[] = ['ULTIMA_HORA', 'ULTIMAS_24_HORAS', 'ULTIMOS_7_DIAS', 'ULTIMOS_30_DIAS'];

export const rotuloPeriodoAuditoria: Record<PeriodoAuditoria, string> = {
  ULTIMA_HORA: 'Última hora',
  ULTIMAS_24_HORAS: 'Últimas 24 horas',
  ULTIMOS_7_DIAS: 'Últimos 7 dias',
  ULTIMOS_30_DIAS: 'Últimos 30 dias',
};

const duracaoDoPeriodoMs: Record<PeriodoAuditoria, number> = {
  ULTIMA_HORA: 3_600_000,
  ULTIMAS_24_HORAS: 86_400_000,
  ULTIMOS_7_DIAS: 7 * 86_400_000,
  ULTIMOS_30_DIAS: 30 * 86_400_000,
};

interface ClassificacaoDoTipo {
  categoria: CategoriaAuditoria;
  modulo: ModuloAuditoria;
}

const classificacaoDoTipo: Record<Exclude<TipoEventoAuditoria, 'TELA_ACESSADA' | 'ACESSO_NEGADO'>, ClassificacaoDoTipo> = {
  LOGIN: { categoria: 'AUTENTICACAO', modulo: 'ACESSO' },
  LOGIN_FALHOU: { categoria: 'AUTENTICACAO', modulo: 'ACESSO' },
  LOGIN_BLOQUEADO: { categoria: 'AUTENTICACAO', modulo: 'ACESSO' },
  LOGOUT: { categoria: 'AUTENTICACAO', modulo: 'ACESSO' },
  RECUPERACAO_PEDIDA: { categoria: 'AUTENTICACAO', modulo: 'ACESSO' },
  SENHA_REDEFINIDA: { categoria: 'AUTENTICACAO', modulo: 'ACESSO' },
  CONVITE_ACEITO: { categoria: 'AUTENTICACAO', modulo: 'ACESSO' },
  CONTA_CRIADA: { categoria: 'CRIACAO', modulo: 'ADMINISTRACAO' },
  CONTA_EDITADA: { categoria: 'ATUALIZACAO', modulo: 'ADMINISTRACAO' },
  CONTA_ATIVADA: { categoria: 'ATUALIZACAO', modulo: 'ADMINISTRACAO' },
  CONTA_DESATIVADA: { categoria: 'ATUALIZACAO', modulo: 'ADMINISTRACAO' },
  CONTA_DESBLOQUEADA: { categoria: 'ATUALIZACAO', modulo: 'ADMINISTRACAO' },
  CONVITE_REENVIADO: { categoria: 'ATUALIZACAO', modulo: 'ADMINISTRACAO' },
  SESSOES_ENCERRADAS: { categoria: 'ATUALIZACAO', modulo: 'ADMINISTRACAO' },
  CONTA_EXCLUIDA: { categoria: 'EXCLUSAO', modulo: 'ADMINISTRACAO' },
  PERMISSOES_ALTERADAS: { categoria: 'PERMISSOES', modulo: 'ADMINISTRACAO' },
  CONEXAO_CRIADA: { categoria: 'CRIACAO', modulo: 'CONEXOES' },
  CONEXAO_ATIVADA: { categoria: 'ATUALIZACAO', modulo: 'CONEXOES' },
  CONEXAO_ENCERRADA: { categoria: 'ATUALIZACAO', modulo: 'CONEXOES' },
  CONEXAO_RENOMEADA: { categoria: 'ATUALIZACAO', modulo: 'CONEXOES' },
  CONEXAO_EXCLUIDA: { categoria: 'EXCLUSAO', modulo: 'CONEXOES' },
  BANCO_ALTERADO: { categoria: 'PERMISSOES', modulo: 'BANCO' },
};

export function classificarTipo(tipo: Exclude<TipoEventoAuditoria, 'TELA_ACESSADA' | 'ACESSO_NEGADO'>): ClassificacaoDoTipo {
  return classificacaoDoTipo[tipo];
}

export function categoriaDoMetodo(metodo: string): CategoriaAuditoria {
  if (metodo === 'GET') return 'CONSULTA';
  if (metodo === 'POST') return 'CRIACAO';
  if (metodo === 'DELETE') return 'EXCLUSAO';
  return 'ATUALIZACAO';
}

function alvoDe(evento: EventoAuditoriaDTO): string {
  return evento.alvo?.rotulo ?? 'um registro que não existe mais';
}

const motivoDoLogin: Record<string, string> = {
  SENHA_INCORRETA: 'senha incorreta',
  CONTA_INEXISTENTE: 'e-mail sem conta',
  CONTA_DESATIVADA: 'conta desativada',
  CONVITE_PENDENTE: 'convite ainda não aceito',
  BLOQUEADA: 'login bloqueado por tentativas',
};

export function descreverEvento(evento: EventoAuditoriaDTO): string {
  const alvo = alvoDe(evento);
  switch (evento.tipo) {
    case 'LOGIN':
      return 'Entrou no Orynt';
    case 'LOGIN_FALHOU':
      return evento.motivo && motivoDoLogin[evento.motivo]
        ? `Login recusado: ${motivoDoLogin[evento.motivo] ?? ''}`
        : 'Login recusado';
    case 'LOGIN_BLOQUEADO':
      return 'Login bloqueado depois de várias tentativas';
    case 'LOGOUT':
      return 'Saiu do Orynt';
    case 'RECUPERACAO_PEDIDA':
      return 'Pediu um código para trocar a senha';
    case 'SENHA_REDEFINIDA':
      return 'Trocou a senha pela recuperação';
    case 'CONVITE_ACEITO':
      return 'Aceitou o convite e definiu a senha';
    case 'TELA_ACESSADA':
      return `Abriu ${alvo}`;
    case 'ACESSO_NEGADO':
      return evento.alvo?.tipo === 'TELA' ? `Tentou abrir ${alvo} sem permissão` : `Tentou ${alvo} sem permissão`;
    case 'CONTA_CRIADA':
      return `Criou a conta de ${alvo}`;
    case 'CONTA_EDITADA':
      return `Editou a conta de ${alvo}`;
    case 'CONTA_ATIVADA':
      return `Ativou a conta de ${alvo}`;
    case 'CONTA_DESATIVADA':
      return `Desativou a conta de ${alvo}`;
    case 'CONTA_DESBLOQUEADA':
      return `Desbloqueou a conta de ${alvo}`;
    case 'CONVITE_REENVIADO':
      return `Reenviou o convite de ${alvo}`;
    case 'SESSOES_ENCERRADAS':
      return `Encerrou as sessões de ${alvo}`;
    case 'CONTA_EXCLUIDA':
      return `Excluiu a conta de ${alvo}`;
    case 'PERMISSOES_ALTERADAS':
      return `Mudou as permissões de ${alvo}`;
    case 'CONEXAO_CRIADA':
      return evento.resultado === 'SUCESSO' ? `Conectou a ${alvo} pela primeira vez` : `Tentou conectar a ${alvo}`;
    case 'CONEXAO_ATIVADA':
      return evento.resultado === 'SUCESSO' ? `Conectou a ${alvo}` : `Tentou reconectar a ${alvo}`;
    case 'CONEXAO_ENCERRADA':
      return `Desconectou de ${alvo}`;
    case 'CONEXAO_RENOMEADA':
      return `Renomeou a conexão ${alvo}`;
    case 'CONEXAO_EXCLUIDA':
      return `Excluiu a conexão ${alvo}`;
    case 'BANCO_ALTERADO':
      return evento.resultado === 'SUCESSO' ? `${alvo} no banco` : `${alvo} no banco, recusado`;
  }
}

export function descreverMotivo(evento: EventoAuditoriaDTO): string | null {
  if (evento.tipo === 'LOGIN_FALHOU' && evento.motivo) return motivoDoLogin[evento.motivo] ?? evento.motivo;
  return evento.motivo;
}

export function descreverPermissoesDoEvento(evento: EventoAuditoriaDTO): { concedidas: string[]; revogadas: string[] } {
  return {
    concedidas: evento.concedidas.map(rotuloDaPermissao),
    revogadas: evento.revogadas.map(rotuloDaPermissao),
  };
}

export function responsavelDoEvento(evento: EventoAuditoriaDTO): string {
  if (evento.conta) return evento.conta.nome;
  if (evento.emailInformado) return evento.emailInformado;
  return 'Sem conta identificada';
}

function textoParaBusca(evento: EventoAuditoriaDTO): string {
  return [
    descreverEvento(evento),
    evento.conta?.nome ?? '',
    evento.conta?.email ?? '',
    evento.emailInformado ?? '',
    evento.alvo?.rotulo ?? '',
    rotuloModuloAuditoria[evento.modulo],
    rotuloCategoriaAuditoria[evento.categoria],
    evento.requisicao ? `${evento.requisicao.metodo} ${evento.requisicao.caminho}` : '',
    descreverMotivo(evento) ?? '',
    ...evento.mudancas.flatMap((mudanca) => [mudanca.antes ?? '', mudanca.depois ?? '']),
  ].join('\n');
}

export const filtrosAuditoriaIniciais: FiltrosAuditoria = {
  busca: '',
  conta: null,
  categoria: null,
  modulo: null,
  resultado: null,
  periodo: null,
  pagina: 1,
};

const ID_DE_CONTA_VALIDO = /^[A-Za-z0-9_.:-]{1,80}$/;

export function lerIdDeConta(valor: unknown): string | null {
  return typeof valor === 'string' && ID_DE_CONTA_VALIDO.test(valor) ? valor : null;
}

export function lerFiltrosAuditoria(valor: unknown): FiltrosAuditoria {
  if (!valor || typeof valor !== 'object') return filtrosAuditoriaIniciais;
  const guardado = valor as Record<string, unknown>;
  return {
    busca: typeof guardado.busca === 'string' ? limparBusca(guardado.busca) : '',
    conta: lerIdDeConta(guardado.conta),
    categoria: categoriasAuditoria.find((item) => item === guardado.categoria) ?? null,
    modulo: modulosAuditoria.find((item) => item === guardado.modulo) ?? null,
    resultado: resultadosAuditoria.find((item) => item === guardado.resultado) ?? null,
    periodo: periodosAuditoria.find((item) => item === guardado.periodo) ?? null,
    pagina: lerPagina(guardado.pagina),
  };
}

export function aplicarMudancaAuditoria(filtros: FiltrosAuditoria, mudanca: Partial<FiltrosAuditoria>): FiltrosAuditoria {
  return lerFiltrosAuditoria({ ...filtros, ...mudanca, pagina: paginaAposMudanca(filtros, mudanca) });
}

export function temFiltroAtivoAuditoria(filtros: FiltrosAuditoria): boolean {
  return (
    filtros.busca !== '' ||
    filtros.conta !== null ||
    filtros.categoria !== null ||
    filtros.modulo !== null ||
    filtros.resultado !== null ||
    filtros.periodo !== null
  );
}

export function semFiltrosAuditoria(): Omit<FiltrosAuditoria, 'pagina'> {
  return { busca: '', conta: null, categoria: null, modulo: null, resultado: null, periodo: null };
}

export function mesmosFiltrosAuditoria(primeiro: FiltrosAuditoria, segundo: FiltrosAuditoria): boolean {
  return (
    primeiro.busca === segundo.busca &&
    primeiro.conta === segundo.conta &&
    primeiro.categoria === segundo.categoria &&
    primeiro.modulo === segundo.modulo &&
    primeiro.resultado === segundo.resultado &&
    primeiro.periodo === segundo.periodo &&
    primeiro.pagina === segundo.pagina
  );
}

export function inicioDoPeriodo(periodo: PeriodoAuditoria, agora: Date): Date {
  return new Date(agora.getTime() - duracaoDoPeriodoMs[periodo]);
}

export function filtrarEventos(eventos: EventoAuditoriaDTO[], filtros: FiltrosAuditoria, agora: Date): EventoAuditoriaDTO[] {
  const termos = termosDaBusca(filtros.busca);
  const inicio = filtros.periodo ? inicioDoPeriodo(filtros.periodo, agora).toISOString() : null;
  return eventos
    .filter((evento) => filtros.conta === null || evento.conta?.id === filtros.conta || evento.alvo?.id === filtros.conta)
    .filter((evento) => filtros.categoria === null || evento.categoria === filtros.categoria)
    .filter((evento) => filtros.modulo === null || evento.modulo === filtros.modulo)
    .filter((evento) => filtros.resultado === null || evento.resultado === filtros.resultado)
    .filter((evento) => inicio === null || evento.ocorridoEm >= inicio)
    .filter((evento) => termos.length === 0 || correspondeABusca(textoParaBusca(evento), termos))
    .sort((a, b) => b.ocorridoEm.localeCompare(a.ocorridoEm) || b.id.localeCompare(a.id));
}

export function resumirAuditoria(total: number, filtros: FiltrosAuditoria): string {
  const palavra = pluralizar(total, 'evento', 'eventos');
  if (!temFiltroAtivoAuditoria(filtros)) return `${formatarNumero(total)} ${palavra} registrados`;
  return `${formatarNumero(total)} ${palavra} ${pluralizar(total, 'encontrado', 'encontrados')}`;
}

export function descreverFiltrosAuditoria(filtros: FiltrosAuditoria, nomeDaConta: string | null): string[] {
  const partes: string[] = [];
  if (filtros.busca) partes.push(`busca “${filtros.busca}”`);
  if (filtros.conta) partes.push(nomeDaConta ? `conta ${nomeDaConta}` : 'a conta escolhida');
  if (filtros.categoria) partes.push(rotuloCategoriaAuditoria[filtros.categoria].toLowerCase());
  if (filtros.modulo) partes.push(`módulo ${rotuloModuloAuditoria[filtros.modulo]}`);
  if (filtros.resultado) partes.push(`resultado ${rotuloResultadoAuditoria[filtros.resultado].toLowerCase()}`);
  if (filtros.periodo) partes.push(rotuloPeriodoAuditoria[filtros.periodo].toLowerCase());
  return partes;
}

const NAVEGADORES: { padrao: RegExp; nome: string }[] = [
  { padrao: /Edg\/(\d+)/, nome: 'Edge' },
  { padrao: /OPR\/(\d+)/, nome: 'Opera' },
  { padrao: /Firefox\/(\d+)/, nome: 'Firefox' },
  { padrao: /Chrome\/(\d+)/, nome: 'Chrome' },
  { padrao: /Version\/(\d+)[\d.]* .*Safari/, nome: 'Safari' },
];

const SISTEMAS: { padrao: RegExp; nome: string }[] = [
  { padrao: /iPhone|iPad|iPod/, nome: 'iOS' },
  { padrao: /Android/, nome: 'Android' },
  { padrao: /Windows/, nome: 'Windows' },
  { padrao: /Mac OS X|Macintosh/, nome: 'macOS' },
  { padrao: /CrOS/, nome: 'ChromeOS' },
  { padrao: /Linux/, nome: 'Linux' },
];

export function resumirNavegador(agente: string | null | undefined): string | null {
  if (!agente) return null;
  const navegador = NAVEGADORES.map(({ padrao, nome }) => ({ nome, versao: padrao.exec(agente)?.[1] })).find(
    (item) => item.versao !== undefined,
  );
  const sistema = SISTEMAS.find(({ padrao }) => padrao.test(agente))?.nome;
  if (!navegador && !sistema) return null;
  const parteNavegador = navegador ? `${navegador.nome} ${navegador.versao ?? ''}`.trim() : 'Navegador desconhecido';
  return sistema ? `${parteNavegador} no ${sistema}` : parteNavegador;
}
