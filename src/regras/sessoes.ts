import type { OperacaoDTO } from '@/modelos/alteracoes';
import type { DirecaoOrdenacao } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import type { PapelDTO } from '@/modelos/papeis';
import type {
  BloqueioDTO,
  EsperaDTO,
  EstadoExibido,
  FiltrosSessoes,
  ListaSessoesDTO,
  OrdenacaoSessoes,
  PapelDasSessoesDTO,
  SessaoDTO,
  SituacaoSessao,
  TipoBloqueio,
  TipoProcesso,
} from '@/modelos/sessoes';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { correspondeABusca, limparBusca, termosDaBusca } from './buscaConsultas';
import { descreverConfiguracao } from './funcoes';
import type { LoteDeComandos } from './indices';
import { lerPagina, paginaAposMudanca } from './paginacaoLocal';
import { identificadorSql, lerNomeDoPapel } from './papeis';
import type { TomDoAviso } from './visoes';

export const SEGUNDOS_ESPERANDO_BLOQUEIO = 30;
export const MINUTOS_OCIOSA_EM_TRANSACAO = 5;
export const MINUTOS_CONSULTA_LONGA = 5;
export const MINUTOS_TRANSACAO_LONGA = 30;
export const SEGUNDOS_ENTRE_ATUALIZACOES = 10;
export const VEZES_PARA_SUGERIR_TEMPO_OCIOSO = 3;
export const TEMPO_OCIOSO_SUGERIDO = '5min';
export const BANCO_DA_CONEXAO = '';
export const MAIORES_DA_DISTRIBUICAO = 5;
export const PERIODO_DO_HISTORICO_DA_SESSAO: PeriodoDashboard = 'ULTIMAS_24_HORAS';

const MS_POR_SEGUNDO = 1000;
const MS_POR_MINUTO = 60_000;
const MS_POR_HORA = 3_600_000;
const MS_POR_DIA = 86_400_000;
const NOMES_NA_FRASE = 3;
const MAXIMO_DE_PONTOS_SEPARADOS = 2;
const NOME_DE_BANCO = /^[\w$.-]{1,63}$/;
const PARAMETRO_TEMPO_OCIOSO = 'idle_in_transaction_session_timeout';

export const situacoesSessao: SituacaoSessao[] = [
  'BLOQUEANDO',
  'ESPERANDO_BLOQUEIO',
  'OCIOSA_EM_TRANSACAO',
  'CONSULTA_LONGA',
  'TRANSACAO_LONGA',
];

export const estadosExibidos: EstadoExibido[] = ['ATIVA', 'ESPERANDO', 'OCIOSA_EM_TRANSACAO', 'OCIOSA'];

export const ordenacoesSessoes: OrdenacaoSessoes[] = ['URGENCIA', 'PID', 'TEMPO_NO_ESTADO', 'TRANSACAO'];

export const rotuloSituacaoSessao: Record<SituacaoSessao, string> = {
  BLOQUEANDO: 'Bloqueando',
  ESPERANDO_BLOQUEIO: 'Esperando bloqueio',
  OCIOSA_EM_TRANSACAO: 'Transação parada',
  CONSULTA_LONGA: 'Consulta longa',
  TRANSACAO_LONGA: 'Transação longa',
};

export const rotuloFiltroSituacaoSessao: Record<SituacaoSessao, string> = {
  BLOQUEANDO: 'Bloqueando outras',
  ESPERANDO_BLOQUEIO: 'Esperando bloqueio',
  OCIOSA_EM_TRANSACAO: 'Transação parada',
  CONSULTA_LONGA: 'Consulta longa',
  TRANSACAO_LONGA: 'Transação longa',
};

export const rotuloEstadoExibido: Record<EstadoExibido, string> = {
  ATIVA: 'Ativa',
  ESPERANDO: 'Esperando',
  OCIOSA_EM_TRANSACAO: 'Ociosa em transação',
  OCIOSA: 'Ociosa',
  OUTRO: 'Em segundo plano',
};

export const rotuloFiltroEstado: Record<EstadoExibido, string> = {
  ATIVA: 'Ativas',
  ESPERANDO: 'Esperando',
  OCIOSA_EM_TRANSACAO: 'Ociosas em transação',
  OCIOSA: 'Ociosas',
  OUTRO: 'Em segundo plano',
};

export const descricaoEstadoExibido: Record<EstadoExibido, string> = {
  ATIVA: 'Rodando uma consulta agora.',
  ESPERANDO: 'Rodando uma consulta que espera um bloqueio de outra sessão.',
  OCIOSA_EM_TRANSACAO: 'Parada, com uma transação aberta.',
  OCIOSA: 'Conectada, esperando o próximo comando.',
  OUTRO: 'Processo do servidor.',
};

export const rotuloTipoProcesso: Record<TipoProcesso, string> = {
  CLIENTE: 'Cliente',
  REPLICACAO: 'Replicação',
  AUTOVACUUM: 'Autovacuum',
  SERVIDOR: 'Servidor',
};

export const rotuloTipoBloqueio: Record<TipoBloqueio, string> = {
  RELACAO: 'Tabela',
  TRANSACAO: 'Transação',
  TUPLA: 'Linha',
  CONSULTIVO: 'Consultivo',
};

export const direcaoInicialDaOrdenacaoSessoes: Record<OrdenacaoSessoes, DirecaoOrdenacao> = {
  URGENCIA: 'DESC',
  PID: 'ASC',
  TEMPO_NO_ESTADO: 'DESC',
  TRANSACAO: 'DESC',
};

export const filtrosSessoesIniciais: FiltrosSessoes = {
  busca: '',
  banco: BANCO_DA_CONEXAO,
  estado: null,
  situacao: null,
  papel: null,
  processos: false,
  automatica: false,
  ordenacao: 'URGENCIA',
  direcao: 'DESC',
  pagina: 1,
};

export interface ContextoDasSessoes {
  geradoEm: string;
  bancoDaConexao: string;
}

export interface AvisoDaSessao {
  tom: TomDoAviso | 'info';
  texto: string;
}

export type AcaoDoComando = 'CANCELAR' | 'ENCERRAR';

export interface ComandoDaSessao {
  acao: AcaoDoComando;
  rotulo: string;
  comando: string;
  explicacao: string;
}

export interface SugestaoDeTempoOcioso {
  papel: string;
  vezes: number;
  comando: string;
  explicacao: string;
  frase: string;
  operacoes: OperacaoDTO[];
}

function lerDaLista<T extends string>(lista: readonly T[], valor: unknown): T | null {
  return lista.find((item) => item === valor) ?? null;
}

function lerBanco(valor: unknown): string | null {
  if (valor === null) return null;
  if (typeof valor === 'string' && (valor === BANCO_DA_CONEXAO || NOME_DE_BANCO.test(valor))) return valor;
  return BANCO_DA_CONEXAO;
}

export function lerPid(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0 ? valor : null;
}

export function lerFiltrosSessoes(valor: unknown): FiltrosSessoes {
  if (!valor || typeof valor !== 'object') return filtrosSessoesIniciais;
  const guardado = valor as Record<string, unknown>;
  const ordenacao = lerDaLista(ordenacoesSessoes, guardado.ordenacao) ?? filtrosSessoesIniciais.ordenacao;

  return {
    busca: typeof guardado.busca === 'string' ? limparBusca(guardado.busca) : filtrosSessoesIniciais.busca,
    banco: 'banco' in guardado ? lerBanco(guardado.banco) : BANCO_DA_CONEXAO,
    estado: lerDaLista(estadosExibidos, guardado.estado),
    situacao: lerDaLista(situacoesSessao, guardado.situacao),
    papel: lerNomeDoPapel(guardado.papel),
    processos: guardado.processos === true,
    automatica: guardado.automatica === true,
    ordenacao,
    direcao: lerDaLista<DirecaoOrdenacao>(['ASC', 'DESC'], guardado.direcao) ?? direcaoInicialDaOrdenacaoSessoes[ordenacao],
    pagina: lerPagina(guardado.pagina),
  };
}

export function aplicarMudancaSessoes(filtros: FiltrosSessoes, mudanca: Partial<FiltrosSessoes>): FiltrosSessoes {
  return lerFiltrosSessoes({ ...filtros, ...mudanca, pagina: paginaAposMudanca(filtros, mudanca, ['pagina', 'automatica']) });
}

export function alternarOrdenacaoSessoes(
  filtros: FiltrosSessoes,
  ordenacao: OrdenacaoSessoes,
): Pick<FiltrosSessoes, 'ordenacao' | 'direcao'> {
  if (filtros.ordenacao !== ordenacao) return { ordenacao, direcao: direcaoInicialDaOrdenacaoSessoes[ordenacao] };
  return { ordenacao, direcao: filtros.direcao === 'DESC' ? 'ASC' : 'DESC' };
}

export function temFiltroAtivoSessoes(filtros: FiltrosSessoes): boolean {
  return (
    filtros.busca !== '' ||
    filtros.banco !== BANCO_DA_CONEXAO ||
    filtros.estado !== null ||
    filtros.situacao !== null ||
    filtros.papel !== null
  );
}

export function semFiltrosSessoes(): Pick<FiltrosSessoes, 'busca' | 'banco' | 'estado' | 'situacao' | 'papel'> {
  return { busca: '', banco: BANCO_DA_CONEXAO, estado: null, situacao: null, papel: null };
}

export function bancoEfetivo(filtros: Pick<FiltrosSessoes, 'banco'>, contexto: Pick<ContextoDasSessoes, 'bancoDaConexao'>): string | null {
  return filtros.banco === BANCO_DA_CONEXAO ? contexto.bancoDaConexao : filtros.banco;
}

export function estadoDasSessoesDoPapel(papel: string, replicacao = false): { sessoes: Partial<FiltrosSessoes> } {
  return { sessoes: { papel, banco: null, processos: replicacao } };
}

function msDesde(instante: string | null, contexto: Pick<ContextoDasSessoes, 'geradoEm'>): number | null {
  if (instante === null) return null;
  return Math.max(0, new Date(contexto.geradoEm).getTime() - new Date(instante).getTime());
}

export function formatarTempoDecorrido(milissegundos: number): string {
  if (milissegundos < MS_POR_SEGUNDO) return 'menos de 1 s';
  if (milissegundos < MS_POR_MINUTO) return `${Math.floor(milissegundos / MS_POR_SEGUNDO)} s`;
  if (milissegundos < MS_POR_HORA) {
    const minutos = Math.floor(milissegundos / MS_POR_MINUTO);
    const segundos = Math.floor((milissegundos % MS_POR_MINUTO) / MS_POR_SEGUNDO);
    return segundos === 0 ? `${minutos} min` : `${minutos} min ${segundos} s`;
  }
  if (milissegundos < MS_POR_DIA) {
    const horas = Math.floor(milissegundos / MS_POR_HORA);
    const minutos = Math.floor((milissegundos % MS_POR_HORA) / MS_POR_MINUTO);
    return minutos === 0 ? `${horas} h` : `${horas} h ${minutos} min`;
  }
  const dias = Math.floor(milissegundos / MS_POR_DIA);
  const horas = Math.floor((milissegundos % MS_POR_DIA) / MS_POR_HORA);
  return horas === 0 ? `${dias} d` : `${dias} d ${horas} h`;
}

const formatadorDoHorario = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const formatadorDoDiaEHorario = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatarHorarioComSegundos(instante: string): string {
  return formatadorDoHorario.format(new Date(instante));
}

export function formatarInicio(instante: string, contexto: Pick<ContextoDasSessoes, 'geradoEm'>): string {
  const mesmoDia = new Date(instante).toDateString() === new Date(contexto.geradoEm).toDateString();
  return mesmoDia ? formatarHorarioComSegundos(instante) : formatadorDoDiaEHorario.format(new Date(instante)).replace('.', '');
}

export function tempoNoEstadoMs(sessao: SessaoDTO, contexto: Pick<ContextoDasSessoes, 'geradoEm'>): number | null {
  return msDesde(sessao.estadoDesde, contexto);
}

export function tempoDaTransacaoMs(sessao: SessaoDTO, contexto: Pick<ContextoDasSessoes, 'geradoEm'>): number | null {
  return msDesde(sessao.transacaoDesde, contexto);
}

export function tempoDaConsultaMs(sessao: SessaoDTO, contexto: Pick<ContextoDasSessoes, 'geradoEm'>): number | null {
  return msDesde(sessao.consultaDesde, contexto);
}

export function esperaBloqueio(sessao: SessaoDTO): boolean {
  return sessao.estado === 'ATIVA' && sessao.espera?.tipo === 'Lock';
}

export function estadoExibido(sessao: SessaoDTO): EstadoExibido {
  if (sessao.tipo !== 'CLIENTE' && sessao.tipo !== 'REPLICACAO') return 'OUTRO';
  if (esperaBloqueio(sessao)) return 'ESPERANDO';
  if (sessao.estado === 'ATIVA' || sessao.estado === 'CHAMADA_DE_FUNCAO') return 'ATIVA';
  if (sessao.estado === 'OCIOSA_EM_TRANSACAO' || sessao.estado === 'OCIOSA_EM_TRANSACAO_ABORTADA') return 'OCIOSA_EM_TRANSACAO';
  if (sessao.estado === 'OCIOSA') return 'OCIOSA';
  return 'OUTRO';
}

export function emAndamento(sessao: SessaoDTO): boolean {
  return sessao.estado === 'ATIVA' || sessao.estado === 'CHAMADA_DE_FUNCAO';
}

export function contaComoConexao(sessao: SessaoDTO): boolean {
  return sessao.tipo === 'CLIENTE' || sessao.tipo === 'REPLICACAO';
}

export function apontavel(sessao: SessaoDTO): boolean {
  return sessao.tipo === 'CLIENTE' && !sessao.doOrynt;
}

export function sessoesQueEsperam(sessao: SessaoDTO, sessoes: SessaoDTO[]): SessaoDTO[] {
  return sessoes.filter((outra) => outra.bloqueadaPor.includes(sessao.pid));
}

export function sessoesQueBloqueiam(sessao: SessaoDTO, sessoes: SessaoDTO[]): SessaoDTO[] {
  return sessao.bloqueadaPor.flatMap((pid) => sessoes.find((outra) => outra.pid === pid) ?? []);
}

export function raizDoBloqueio(sessao: SessaoDTO, sessoes: SessaoDTO[]): SessaoDTO | null {
  const porPid = new Map(sessoes.map((outra) => [outra.pid, outra]));
  const visitados = new Set<number>([sessao.pid]);
  let atual = sessao;
  for (let pid = atual.bloqueadaPor[0]; pid !== undefined; pid = atual.bloqueadaPor[0]) {
    const proxima = porPid.get(pid);
    if (!proxima || visitados.has(pid)) break;
    visitados.add(pid);
    atual = proxima;
  }
  return atual === sessao ? null : atual;
}

export function todasQueEsperam(sessao: SessaoDTO, sessoes: SessaoDTO[]): SessaoDTO[] {
  const encontradas: SessaoDTO[] = [];
  const visitados = new Set<number>([sessao.pid]);
  const fila = [sessao];
  for (let atual = fila.shift(); atual; atual = fila.shift()) {
    for (const outra of sessoesQueEsperam(atual, sessoes)) {
      if (visitados.has(outra.pid)) continue;
      visitados.add(outra.pid);
      encontradas.push(outra);
      fila.push(outra);
    }
  }
  return encontradas;
}

export interface NoDaCadeia {
  sessao: SessaoDTO;
  filhos: NoDaCadeia[];
  total: number;
}

export function cadeiasDeBloqueio(sessoes: SessaoDTO[]): NoDaCadeia[] {
  const porPid = new Map(sessoes.map((sessao) => [sessao.pid, sessao]));
  const filhosDe = new Map<number, SessaoDTO[]>();
  for (const sessao of sessoes) {
    const pai = sessao.bloqueadaPor.find((pid) => porPid.has(pid));
    if (pai === undefined) continue;
    filhosDe.set(pai, [...(filhosDe.get(pai) ?? []), sessao]);
  }

  const montar = (sessao: SessaoDTO, visitados: Set<number>): NoDaCadeia => {
    visitados.add(sessao.pid);
    const filhos = (filhosDe.get(sessao.pid) ?? [])
      .filter((filho) => !visitados.has(filho.pid))
      .sort((a, b) => (a.consultaDesde ?? '').localeCompare(b.consultaDesde ?? '') || a.pid - b.pid)
      .map((filho) => montar(filho, visitados));
    return { sessao, filhos, total: filhos.reduce((soma, filho) => soma + 1 + filho.total, 0) };
  };

  return sessoes
    .filter((sessao) => filhosDe.has(sessao.pid) && !sessao.bloqueadaPor.some((pid) => porPid.has(pid)))
    .map((raiz) => montar(raiz, new Set()))
    .sort((a, b) => b.total - a.total || a.sessao.pid - b.sessao.pid);
}

export interface ResumoDaCadeia {
  niveis: number;
  maiorEsperaMs: number;
}

export function resumirCadeia(cadeia: NoDaCadeia, contexto: ContextoDasSessoes): ResumoDaCadeia {
  const visitar = (no: NoDaCadeia, nivel: number): ResumoDaCadeia =>
    no.filhos.reduce<ResumoDaCadeia>(
      (resumo, filho) => {
        const abaixo = visitar(filho, nivel + 1);
        const espera = tempoDaConsultaMs(filho.sessao, contexto) ?? 0;
        return {
          niveis: Math.max(resumo.niveis, abaixo.niveis),
          maiorEsperaMs: Math.max(resumo.maiorEsperaMs, abaixo.maiorEsperaMs, espera),
        };
      },
      { niveis: nivel, maiorEsperaMs: 0 },
    );
  return visitar(cadeia, 0);
}

export function bloqueiosSegurados(sessao: SessaoDTO): BloqueioDTO[] {
  return sessao.bloqueios.filter((bloqueio) => bloqueio.concedido);
}

export function bloqueioEsperado(sessao: SessaoDTO): BloqueioDTO | null {
  return sessao.bloqueios.find((bloqueio) => !bloqueio.concedido) ?? null;
}

export function situacoesDaSessao(sessao: SessaoDTO, sessoes: SessaoDTO[], contexto: ContextoDasSessoes): SituacaoSessao[] {
  if (!apontavel(sessao)) return [];
  const situacoes: SituacaoSessao[] = [];
  const consulta = tempoDaConsultaMs(sessao, contexto) ?? 0;
  const noEstado = tempoNoEstadoMs(sessao, contexto) ?? 0;
  const transacao = tempoDaTransacaoMs(sessao, contexto) ?? 0;

  if (!esperaBloqueio(sessao) && sessoesQueEsperam(sessao, sessoes).length > 0) situacoes.push('BLOQUEANDO');
  if (esperaBloqueio(sessao) && consulta >= SEGUNDOS_ESPERANDO_BLOQUEIO * MS_POR_SEGUNDO) situacoes.push('ESPERANDO_BLOQUEIO');
  if (estadoExibido(sessao) === 'OCIOSA_EM_TRANSACAO' && noEstado >= MINUTOS_OCIOSA_EM_TRANSACAO * MS_POR_MINUTO) {
    situacoes.push('OCIOSA_EM_TRANSACAO');
  }
  if (emAndamento(sessao) && !esperaBloqueio(sessao) && consulta >= MINUTOS_CONSULTA_LONGA * MS_POR_MINUTO) {
    situacoes.push('CONSULTA_LONGA');
  }
  if (transacao >= MINUTOS_TRANSACAO_LONGA * MS_POR_MINUTO) situacoes.push('TRANSACAO_LONGA');
  return situacoes;
}

export function tomDaSituacaoSessao(situacao: SituacaoSessao): TomDoAviso {
  return situacao === 'BLOQUEANDO' ? 'erro' : 'aviso';
}

const explicacaoDaEspera: Record<string, string> = {
  'Lock:transactionid': 'espera o fim de outra transação',
  'Lock:tuple': 'espera a vez numa linha bloqueada',
  'Lock:relation': 'espera um bloqueio de tabela',
  'Lock:advisory': 'espera um bloqueio consultivo',
  'IO:DataFileRead': 'lendo do disco',
  'IO:DataFileWrite': 'gravando no disco',
  'Client:ClientRead': 'esperando o cliente',
  'Client:ClientWrite': 'enviando ao cliente',
  'Activity:WalSenderMain': 'enviando o WAL para a réplica',
  'Activity:AutoVacuumMain': 'esperando a vez do autovacuum',
  'Activity:CheckpointerMain': 'esperando o próximo checkpoint',
  'Activity:BgWriterMain': 'esperando a próxima rodada',
  'Activity:WalWriterMain': 'esperando o próximo WAL',
  'Activity:LogicalLauncherMain': 'esperando uma assinatura',
  'LWLock:WALWrite': 'esperando a vez de gravar o WAL',
};

export function textoDaEspera(espera: EsperaDTO): string {
  return `${espera.tipo}: ${espera.evento}`;
}

export function explicarEspera(espera: EsperaDTO): string | null {
  return explicacaoDaEspera[`${espera.tipo}:${espera.evento}`] ?? null;
}

function compararPid(a: SessaoDTO, b: SessaoDTO): number {
  return a.pid - b.pid;
}

function pesoDaUrgencia(sessao: SessaoDTO, sessoes: SessaoDTO[], contexto: ContextoDasSessoes): number {
  const [principal] = situacoesDaSessao(sessao, sessoes, contexto);
  if (principal) return situacoesSessao.length - situacoesSessao.indexOf(principal) + 1;
  return sessao.tipo === 'CLIENTE' && !sessao.doOrynt ? 1 : 0;
}

function chaveDeTempo(sessao: SessaoDTO, ordenacao: 'TEMPO_NO_ESTADO' | 'TRANSACAO', contexto: ContextoDasSessoes): number | null {
  return ordenacao === 'TEMPO_NO_ESTADO' ? tempoNoEstadoMs(sessao, contexto) : tempoDaTransacaoMs(sessao, contexto);
}

export function ordenarSessoes(
  lista: SessaoDTO[],
  sessoes: SessaoDTO[],
  ordenacao: OrdenacaoSessoes,
  direcao: DirecaoOrdenacao,
  contexto: ContextoDasSessoes,
): SessaoDTO[] {
  const sinal = direcao === 'ASC' ? 1 : -1;
  if (ordenacao === 'PID') return [...lista].sort((a, b) => sinal * compararPid(a, b));

  if (ordenacao === 'URGENCIA') {
    const pesos = new Map(lista.map((sessao) => [sessao.pid, pesoDaUrgencia(sessao, sessoes, contexto)]));
    return [...lista].sort(
      (a, b) =>
        sinal * ((pesos.get(a.pid) ?? 0) - (pesos.get(b.pid) ?? 0)) ||
        (tempoNoEstadoMs(b, contexto) ?? -1) - (tempoNoEstadoMs(a, contexto) ?? -1) ||
        compararPid(a, b),
    );
  }

  return [...lista].sort((a, b) => {
    const chaveA = chaveDeTempo(a, ordenacao, contexto);
    const chaveB = chaveDeTempo(b, ordenacao, contexto);
    if (chaveA === null || chaveB === null) {
      if (chaveA !== chaveB) return chaveA === null ? 1 : -1;
      return compararPid(a, b);
    }
    if (chaveA !== chaveB) return chaveA < chaveB ? -sinal : sinal;
    return compararPid(a, b);
  });
}

function textoDaBusca(sessao: SessaoDTO): string {
  return [sessao.pid, sessao.papel, sessao.aplicacao, sessao.endereco, sessao.banco, sessao.processo, sessao.consulta]
    .filter((parte) => parte !== null)
    .join(' ');
}

export function noEscopo(sessao: SessaoDTO, filtros: Pick<FiltrosSessoes, 'banco' | 'processos'>, contexto: ContextoDasSessoes): boolean {
  if (!filtros.processos && sessao.tipo !== 'CLIENTE') return false;
  const banco = bancoEfetivo(filtros, contexto);
  if (banco === null || sessao.banco === null) return true;
  return sessao.banco === banco;
}

export function filtrarSessoes(sessoes: SessaoDTO[], filtros: FiltrosSessoes, contexto: ContextoDasSessoes): SessaoDTO[] {
  const termos = termosDaBusca(filtros.busca);
  const encontradas = sessoes.filter(
    (sessao) =>
      noEscopo(sessao, filtros, contexto) &&
      (termos.length === 0 || correspondeABusca(textoDaBusca(sessao), termos)) &&
      (filtros.estado === null || estadoExibido(sessao) === filtros.estado) &&
      (filtros.situacao === null || situacoesDaSessao(sessao, sessoes, contexto).includes(filtros.situacao)) &&
      (filtros.papel === null || sessao.papel === filtros.papel),
  );
  return ordenarSessoes(encontradas, sessoes, filtros.ordenacao, filtros.direcao, contexto);
}

export function contarPorSituacaoSessao(sessoes: SessaoDTO[], contexto: ContextoDasSessoes): Record<SituacaoSessao, number> {
  const contagem = Object.fromEntries(situacoesSessao.map((situacao) => [situacao, 0])) as Record<SituacaoSessao, number>;
  for (const sessao of sessoes) {
    for (const situacao of situacoesDaSessao(sessao, sessoes, contexto)) contagem[situacao] += 1;
  }
  return contagem;
}

export function contarPorEstado(sessoes: SessaoDTO[]): Record<EstadoExibido, number> {
  const contagem: Record<EstadoExibido, number> = { ATIVA: 0, ESPERANDO: 0, OCIOSA_EM_TRANSACAO: 0, OCIOSA: 0, OUTRO: 0 };
  for (const sessao of sessoes) {
    if (sessao.tipo === 'CLIENTE') contagem[estadoExibido(sessao)] += 1;
  }
  return contagem;
}

export function contarConexoes(sessoes: SessaoDTO[]): number {
  return sessoes.filter(contaComoConexao).length;
}

export interface FatiaDaDistribuicao {
  chave: string;
  rotulo: string;
  quantidade: number;
  parte: number;
  vazia: boolean;
}

export type CriterioDaDistribuicao = 'APLICACAO' | 'ORIGEM';

const rotuloDoVazio: Record<CriterioDaDistribuicao, string> = {
  APLICACAO: 'Sem nome de aplicação',
  ORIGEM: 'Socket local',
};

export function distribuirSessoes(sessoes: SessaoDTO[], criterio: CriterioDaDistribuicao): FatiaDaDistribuicao[] {
  const clientes = sessoes.filter((sessao) => sessao.tipo === 'CLIENTE');
  const contagem = new Map<string | null, number>();
  for (const sessao of clientes) {
    const chave = criterio === 'APLICACAO' ? sessao.aplicacao : sessao.endereco;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  const ordenadas = [...contagem.entries()].sort(
    ([chaveA, a], [chaveB, b]) =>
      b - a ||
      Number(chaveA === null) - Number(chaveB === null) ||
      String(chaveA ?? '').localeCompare(String(chaveB ?? ''), 'pt-BR', { numeric: true }),
  );
  const maiores = ordenadas.slice(0, MAIORES_DA_DISTRIBUICAO);
  const resto = ordenadas.slice(MAIORES_DA_DISTRIBUICAO).reduce((soma, [, quantidade]) => soma + quantidade, 0);
  const total = Math.max(1, clientes.length);
  const fatias: FatiaDaDistribuicao[] = maiores.map(([chave, quantidade]) => ({
    chave: chave ?? '',
    rotulo: chave ?? rotuloDoVazio[criterio],
    quantidade,
    parte: quantidade / total,
    vazia: chave === null,
  }));
  if (resto > 0) {
    const outras = ordenadas.length - maiores.length;
    fatias.push({
      chave: '__outras',
      rotulo: `${outras === 1 ? 'Mais 1' : `Mais ${formatarNumero(outras)}`} ${criterio === 'APLICACAO' ? pluralizar(outras, 'aplicação', 'aplicações') : pluralizar(outras, 'origem', 'origens')}`,
      quantidade: resto,
      parte: resto / total,
      vazia: true,
    });
  }
  return fatias;
}

export function bancosDasSessoes(sessoes: SessaoDTO[], contexto: ContextoDasSessoes): string[] {
  const bancos = new Set(sessoes.flatMap((sessao) => (sessao.banco === null ? [] : [sessao.banco])));
  bancos.add(contexto.bancoDaConexao);
  return [...bancos].sort((a, b) => {
    if (a === contexto.bancoDaConexao) return -1;
    if (b === contexto.bancoDaConexao) return 1;
    return a.localeCompare(b, 'pt-BR');
  });
}

export function papeisDasSessoes(sessoes: SessaoDTO[], escolhido: string | null = null): string[] {
  const nomes = new Set(sessoes.flatMap((sessao) => (contaComoConexao(sessao) && sessao.papel ? [sessao.papel] : [])));
  if (escolhido !== null) nomes.add(escolhido);
  return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function resumirSessoes(noEscopoDoFiltro: number, encontradas: number, filtros: FiltrosSessoes): string {
  const palavra = filtros.processos
    ? pluralizar(noEscopoDoFiltro, 'sessão ou processo', 'sessões e processos')
    : pluralizar(noEscopoDoFiltro, 'sessão', 'sessões');
  if (noEscopoDoFiltro === 0) return 'Nenhuma sessão';
  const filtrando =
    filtros.busca !== '' || filtros.estado !== null || filtros.situacao !== null || filtros.papel !== null;
  if (filtrando) return `${formatarNumero(encontradas)} de ${formatarNumero(noEscopoDoFiltro)} ${palavra}`;
  return `${formatarNumero(noEscopoDoFiltro)} ${palavra}`;
}

export function descreverFiltrosSessoes(filtros: FiltrosSessoes, contexto: ContextoDasSessoes): string[] {
  const partes: string[] = [];
  if (filtros.busca !== '') partes.push(`busca por “${filtros.busca}”`);
  const banco = bancoEfetivo(filtros, contexto);
  partes.push(banco === null ? 'qualquer banco' : `banco: ${banco}`);
  if (filtros.estado) partes.push(`estado: ${rotuloFiltroEstado[filtros.estado].toLowerCase()}`);
  if (filtros.situacao) partes.push(`situação: ${rotuloFiltroSituacaoSessao[filtros.situacao].toLowerCase()}`);
  if (filtros.papel) partes.push(`papel: ${filtros.papel}`);
  return partes;
}

function rotuloDaSessao(sessao: SessaoDTO): string {
  return sessao.papel ? `${String(sessao.pid)} (${sessao.papel})` : String(sessao.pid);
}

function duracao(milissegundos: number | null): string {
  return formatarTempoDecorrido(milissegundos ?? 0);
}

function quantasSessoes(quantidade: number): string {
  return `${formatarNumero(quantidade)} ${pluralizar(quantidade, 'sessão', 'sessões')}`;
}

function fraseDoBloqueio(sessao: SessaoDTO, sessoes: SessaoDTO[], contexto: ContextoDasSessoes): string {
  const esperando = todasQueEsperam(sessao, sessoes);
  const maisAntiga = Math.max(0, ...esperando.map((outra) => tempoDaConsultaMs(outra, contexto) ?? 0));
  const quem = esperando.length === 1 ? 'que 1 sessão espera' : `que ${quantasSessoes(esperando.length)} esperam`;
  const fila = `A que espera há mais tempo está parada há ${formatarTempoDecorrido(maisAntiga)}.`;
  if (estadoExibido(sessao) === 'OCIOSA_EM_TRANSACAO') {
    return `Está parada há ${duracao(tempoNoEstadoMs(sessao, contexto))} com uma transação aberta e segura o bloqueio ${quem}. ${fila} Enquanto a aplicação não confirmar ou desfizer a transação, nenhuma delas anda.`;
  }
  return `Roda a consulta há ${duracao(tempoDaConsultaMs(sessao, contexto))} e segura o bloqueio ${quem}. ${fila}`;
}

function fraseDaEspera(sessao: SessaoDTO, sessoes: SessaoDTO[], contexto: ContextoDasSessoes): string {
  const raiz = raizDoBloqueio(sessao, sessoes);
  const direta = sessoesQueBloqueiam(sessao, sessoes)[0];
  const espera = `Espera há ${duracao(tempoDaConsultaMs(sessao, contexto))} um bloqueio`;
  if (!raiz) return `${espera} de outra sessão.`;
  if (direta && direta.pid !== raiz.pid) {
    return `${espera} que a sessão ${rotuloDaSessao(direta)} pegou primeiro, e as duas esperam a sessão ${rotuloDaSessao(raiz)}. Resolver a sessão ${String(raiz.pid)} libera a fila inteira.`;
  }
  return `${espera} que a sessão ${rotuloDaSessao(raiz)} segura. Resolver a sessão ${String(raiz.pid)} libera esta.`;
}

function fraseOciosa(sessao: SessaoDTO, contexto: ContextoDasSessoes): string {
  const desde = sessao.transacaoDesde ? formatarInicio(sessao.transacaoDesde, contexto) : '';
  return `Está parada há ${duracao(tempoNoEstadoMs(sessao, contexto))} com uma transação aberta desde ${desde}. A transação segura os bloqueios que já pegou e impede o VACUUM de limpar as linhas mortas mais novas que ela.`;
}

function fraseDaConsultaLonga(sessao: SessaoDTO, contexto: ContextoDasSessoes): string {
  const espera = sessao.espera ? explicarEspera(sessao.espera) : null;
  return `A consulta roda há ${duracao(tempoDaConsultaMs(sessao, contexto))}${espera ? `, ${espera}` : ''}. Se ela não deveria demorar tanto, confira o plano antes de cancelar.`;
}

function fraseDaTransacaoLonga(sessao: SessaoDTO, contexto: ContextoDasSessoes): string {
  return `A transação está aberta há ${duracao(tempoDaTransacaoMs(sessao, contexto))}: enquanto ela não terminar, o VACUUM não remove as linhas mortas criadas depois do início dela, em nenhuma tabela do banco.`;
}

export function fraseDaSituacaoSessao(
  situacao: SituacaoSessao,
  sessao: SessaoDTO,
  sessoes: SessaoDTO[],
  contexto: ContextoDasSessoes,
): string {
  if (situacao === 'BLOQUEANDO') return fraseDoBloqueio(sessao, sessoes, contexto);
  if (situacao === 'ESPERANDO_BLOQUEIO') return fraseDaEspera(sessao, sessoes, contexto);
  if (situacao === 'OCIOSA_EM_TRANSACAO') return fraseOciosa(sessao, contexto);
  if (situacao === 'CONSULTA_LONGA') return fraseDaConsultaLonga(sessao, contexto);
  return fraseDaTransacaoLonga(sessao, contexto);
}

export function temLimiteOcioso(configuracoes: string[]): boolean {
  return configuracoes.some((configuracao) => {
    const { parametro, valor } = descreverConfiguracao(configuracao);
    return parametro === PARAMETRO_TEMPO_OCIOSO && valor !== '0';
  });
}

export function sugestaoDeTempoOcioso(
  papel: Pick<PapelDTO, 'nome' | 'configuracoes' | 'ociosasEmTransacao30Dias'>,
  limiteDoServidor: string | null,
): SugestaoDeTempoOcioso | null {
  if (papel.ociosasEmTransacao30Dias < VEZES_PARA_SUGERIR_TEMPO_OCIOSO) return null;
  if (limiteDoServidor !== null && limiteDoServidor !== '0') return null;
  if (temLimiteOcioso(papel.configuracoes)) return null;
  const vezes = formatarNumero(papel.ociosasEmTransacao30Dias);
  return {
    papel: papel.nome,
    vezes: papel.ociosasEmTransacao30Dias,
    operacoes: [{ tipo: 'CONFIGURAR_PAPEL', papel: papel.nome, parametro: PARAMETRO_TEMPO_OCIOSO, valor: TEMPO_OCIOSO_SUGERIDO }],
    comando: `ALTER ROLE ${identificadorSql(papel.nome)} SET ${PARAMETRO_TEMPO_OCIOSO} = '${TEMPO_OCIOSO_SUGERIDO}';`,
    explicacao: `O PostgreSQL passa a encerrar a sessão de ${papel.nome} que ficar parada mais de 5 minutos com uma transação aberta, e desfaz essa transação. Vale para as próximas sessões. Confira antes se a aplicação não segura transações de propósito, como um relatório que lê em várias etapas. Nada roda sem você revisar o comando antes.`,
    frase: `Deixou uma transação parada por ${MINUTOS_OCIOSA_EM_TRANSACAO} minutos ou mais em ${vezes} ocasiões nos últimos 30 dias, e nem o papel nem o servidor têm ${PARAMETRO_TEMPO_OCIOSO}.`,
  };
}

export function sugestoesDasSessoes(lista: Pick<ListaSessoesDTO, 'papeis' | 'limiteOciosoEmTransacao'>): SugestaoDeTempoOcioso[] {
  return lista.papeis.flatMap((papel: PapelDasSessoesDTO) => sugestaoDeTempoOcioso(papel, lista.limiteOciosoEmTransacao) ?? []);
}

export type AlvoDoPontoSessao =
  | { tipo: 'SESSAO'; pid: number }
  | { tipo: 'FILTRO'; situacao: SituacaoSessao }
  | { tipo: 'PAPEL'; nome: string };

export interface PontoDeAtencaoSessao {
  tipo: SituacaoSessao | 'SUGESTAO';
  tom: TomDoAviso | 'info';
  titulo: string;
  texto: string;
  alvo: AlvoDoPontoSessao;
}

function listarSessoes(sessoes: SessaoDTO[]): string {
  const nomes = sessoes.slice(0, NOMES_NA_FRASE).map(rotuloDaSessao);
  const restantes = sessoes.length - nomes.length;
  if (restantes > 0) return `${nomes.join(', ')} e mais ${formatarNumero(restantes)}`;
  if (nomes.length === 1) return nomes[0] ?? '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1) ?? ''}`;
}

const tituloDoGrupo: Record<SituacaoSessao, (quantidade: string) => string> = {
  BLOQUEANDO: (quantidade) => `${quantidade} sessões bloqueando outras`,
  ESPERANDO_BLOQUEIO: (quantidade) => `${quantidade} sessões esperando bloqueio`,
  OCIOSA_EM_TRANSACAO: (quantidade) => `${quantidade} transações paradas`,
  CONSULTA_LONGA: (quantidade) => `${quantidade} consultas longas`,
  TRANSACAO_LONGA: (quantidade) => `${quantidade} transações longas`,
};

function fraseDoGrupo(situacao: SituacaoSessao, sessoes: SessaoDTO[]): string {
  const lista = listarSessoes(sessoes);
  if (situacao === 'BLOQUEANDO') return `As sessões ${lista} seguram bloqueios que outras sessões esperam.`;
  if (situacao === 'ESPERANDO_BLOQUEIO') {
    return `As sessões ${lista} esperam um bloqueio há ${SEGUNDOS_ESPERANDO_BLOQUEIO} s ou mais. Resolva primeiro as que bloqueiam.`;
  }
  if (situacao === 'OCIOSA_EM_TRANSACAO') {
    return `As sessões ${lista} estão paradas há ${MINUTOS_OCIOSA_EM_TRANSACAO} min ou mais com uma transação aberta.`;
  }
  if (situacao === 'CONSULTA_LONGA') return `As sessões ${lista} rodam a mesma consulta há ${MINUTOS_CONSULTA_LONGA} min ou mais.`;
  return `As sessões ${lista} têm uma transação aberta há ${MINUTOS_TRANSACAO_LONGA} min ou mais, o que segura o VACUUM.`;
}

function tituloDaSessao(sessao: SessaoDTO): string {
  return `PID ${String(sessao.pid)}${sessao.papel ? ` · ${sessao.papel}` : ''}`;
}

function ordenarParaOsPontos(situacao: SituacaoSessao, sessoes: SessaoDTO[], contexto: ContextoDasSessoes): SessaoDTO[] {
  const chave = (sessao: SessaoDTO) =>
    situacao === 'TRANSACAO_LONGA'
      ? (tempoDaTransacaoMs(sessao, contexto) ?? 0)
      : situacao === 'OCIOSA_EM_TRANSACAO'
        ? (tempoNoEstadoMs(sessao, contexto) ?? 0)
        : (tempoDaConsultaMs(sessao, contexto) ?? 0);
  return [...sessoes].sort((a, b) => chave(b) - chave(a) || compararPid(a, b));
}

export function pontosDeAtencaoSessoes(lista: ListaSessoesDTO, contexto: ContextoDasSessoes): PontoDeAtencaoSessao[] {
  const { sessoes } = lista;
  const pontos = situacoesSessao.flatMap((situacao): PontoDeAtencaoSessao[] => {
    const daSituacao = ordenarParaOsPontos(
      situacao,
      sessoes.filter((sessao) => situacoesDaSessao(sessao, sessoes, contexto)[0] === situacao),
      contexto,
    );
    if (daSituacao.length > MAXIMO_DE_PONTOS_SEPARADOS) {
      return [
        {
          tipo: situacao,
          tom: tomDaSituacaoSessao(situacao),
          titulo: tituloDoGrupo[situacao](formatarNumero(daSituacao.length)),
          texto: fraseDoGrupo(situacao, daSituacao),
          alvo: { tipo: 'FILTRO', situacao },
        },
      ];
    }
    return daSituacao.map((sessao) => ({
      tipo: situacao,
      tom: tomDaSituacaoSessao(situacao),
      titulo: tituloDaSessao(sessao),
      texto: fraseDaSituacaoSessao(situacao, sessao, sessoes, contexto),
      alvo: { tipo: 'SESSAO', pid: sessao.pid },
    }));
  });

  const sugestoes = sugestoesDasSessoes(lista).map(
    (sugestao): PontoDeAtencaoSessao => ({
      tipo: 'SUGESTAO',
      tom: 'info',
      titulo: `Sugestão para ${sugestao.papel}`,
      texto: `${sugestao.frase} Com ${sugestao.comando.replace(/;$/, '')}, o PostgreSQL passa a encerrar essas sessões sozinho.`,
      alvo: { tipo: 'PAPEL', nome: sugestao.papel },
    }),
  );

  return [...pontos, ...sugestoes];
}

export function avisosDaSessao(sessao: SessaoDTO, sessoes: SessaoDTO[], contexto: ContextoDasSessoes): AvisoDaSessao[] {
  const avisos: AvisoDaSessao[] = situacoesDaSessao(sessao, sessoes, contexto).map((situacao) => ({
    tom: tomDaSituacaoSessao(situacao),
    texto: fraseDaSituacaoSessao(situacao, sessao, sessoes, contexto),
  }));
  if (sessao.doOrynt) {
    avisos.push({
      tom: 'info',
      texto: 'É a sessão com que o Orynt tirou este retrato. Ela nunca é apontada e não recebe comando.',
    });
  }
  if (sessao.tipo === 'REPLICACAO') {
    avisos.push({
      tom: 'info',
      texto: 'É a conexão de uma réplica. Encerrá-la interrompe a replicação até a réplica reconectar, por isso o Orynt não oferece comando para ela.',
    });
  }
  return avisos;
}

function explicacaoDoCancelamento(sessao: SessaoDTO, sessoes: SessaoDTO[]): string {
  const libera = sessoesQueEsperam(sessao, sessoes).length > 0 ? ' Se a consulta segura bloqueios fora de uma transação, eles saem com ela.' : '';
  return `Interrompe só a consulta em andamento: a sessão continua aberta e a aplicação recebe o erro “canceling statement due to user request”. Dentro de uma transação, a transação fica abortada até a aplicação desfazê-la.${libera} O Orynt não executa nada no banco.`;
}

function explicacaoDoEncerramento(sessao: SessaoDTO, sessoes: SessaoDTO[]): string {
  const esperando = todasQueEsperam(sessao, sessoes).length;
  const libera = esperando > 0 ? ` Libera ${esperando === 1 ? 'a sessão que espera' : `as ${quantasSessoes(esperando)} que esperam`} por ela.` : '';
  return `Encerra a sessão e desfaz a transação aberta, o que solta os bloqueios que ela segura.${libera} A aplicação perde a conexão e precisa reconectar; o que a transação fez e não confirmou se perde. O Orynt não executa nada no banco.`;
}

function comandoDeCancelar(sessao: SessaoDTO, sessoes: SessaoDTO[]): ComandoDaSessao {
  return {
    acao: 'CANCELAR',
    rotulo: 'Comando que cancela a consulta',
    comando: `SELECT pg_cancel_backend(${sessao.pid});`,
    explicacao: explicacaoDoCancelamento(sessao, sessoes),
  };
}

function comandoDeEncerrar(sessao: SessaoDTO, sessoes: SessaoDTO[]): ComandoDaSessao {
  return {
    acao: 'ENCERRAR',
    rotulo: 'Comando que encerra a sessão',
    comando: `SELECT pg_terminate_backend(${sessao.pid});`,
    explicacao: explicacaoDoEncerramento(sessao, sessoes),
  };
}

export function comandosDaSessao(sessao: SessaoDTO, sessoes: SessaoDTO[]): ComandoDaSessao[] {
  if (!apontavel(sessao)) return [];
  return emAndamento(sessao)
    ? [comandoDeCancelar(sessao, sessoes), comandoDeEncerrar(sessao, sessoes)]
    : [comandoDeEncerrar(sessao, sessoes)];
}

export function comandoDaSituacao(sessao: SessaoDTO, situacao: SituacaoSessao): string | null {
  if (!apontavel(sessao)) return null;
  const cancela = situacao === 'ESPERANDO_BLOQUEIO' || situacao === 'CONSULTA_LONGA' || emAndamento(sessao);
  return cancela ? `SELECT pg_cancel_backend(${sessao.pid});` : `SELECT pg_terminate_backend(${sessao.pid});`;
}

export function loteDeComandosDasSessoes(
  sessoes: SessaoDTO[],
  situacao: SituacaoSessao,
  todas: SessaoDTO[],
  contexto: ContextoDasSessoes,
): LoteDeComandos | null {
  const comandos = [
    ...new Set(
      sessoes
        .filter((sessao) => situacoesDaSessao(sessao, todas, contexto).includes(situacao))
        .flatMap((sessao) => comandoDaSituacao(sessao, situacao) ?? []),
    ),
  ];
  if (comandos.length === 0) return null;
  const quantidade = formatarNumero(comandos.length);
  return {
    comandos,
    rotulo: comandos.length === 1 ? 'Copiar o comando' : `Copiar os ${quantidade} comandos`,
    descricao:
      comandos.length === 1 ? 'Copiar o comando da sessão da lista' : `Copiar os ${quantidade} comandos das sessões da lista, um por linha`,
  };
}

export interface MarcoDaSessao {
  chave: 'SESSAO' | 'TRANSACAO' | 'CONSULTA' | 'ESTADO';
  rotulo: string;
  instante: string;
  ha: string;
}

export function linhaDoTempo(sessao: SessaoDTO, contexto: ContextoDasSessoes): MarcoDaSessao[] {
  const marcos: { chave: MarcoDaSessao['chave']; rotulo: string; instante: string | null }[] = [
    { chave: 'SESSAO', rotulo: 'Sessão aberta', instante: sessao.iniciadaEm },
    { chave: 'TRANSACAO', rotulo: 'Transação aberta', instante: sessao.transacaoDesde },
    { chave: 'CONSULTA', rotulo: emAndamento(sessao) ? 'Consulta começou' : 'Última consulta começou', instante: sessao.consultaDesde },
    { chave: 'ESTADO', rotulo: `${rotuloEstadoExibido[estadoExibido(sessao)]} desde`, instante: sessao.estadoDesde },
  ];
  return marcos.flatMap((marco) =>
    marco.instante === null
      ? []
      : [
          {
            chave: marco.chave,
            rotulo: marco.rotulo,
            instante: marco.instante,
            ha: `há ${formatarTempoDecorrido(msDesde(marco.instante, contexto) ?? 0)}`,
          },
        ],
  );
}

export function descreverBloqueio(bloqueio: BloqueioDTO): string {
  const alvo = bloqueio.alvo ? ` em ${bloqueio.alvo}` : '';
  return `${bloqueio.modo}${alvo}`;
}

export function descreverSessao(sessao: SessaoDTO): string {
  if (sessao.tipo === 'CLIENTE') return sessao.doOrynt ? 'Sessão do próprio Orynt.' : 'Sessão de cliente.';
  if (sessao.tipo === 'REPLICACAO') return 'Conexão de replicação.';
  return `Processo do servidor: ${sessao.processo}.`;
}

export function nomeDaSessao(sessao: SessaoDTO): string {
  if (sessao.tipo === 'CLIENTE' || sessao.tipo === 'REPLICACAO') return sessao.papel ?? sessao.processo;
  return sessao.processo;
}
