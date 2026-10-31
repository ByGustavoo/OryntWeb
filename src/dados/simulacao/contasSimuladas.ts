import { PREFIXO_ARMAZENAMENTO } from '@/configuracoes/aplicacao';
import type { AutorDTO, CodigoPermissao, ContaDTO, PerfilConta } from '@/modelos/administracao';
import type { UsuarioDTO } from '@/modelos/autenticacao';
import { MINUTOS_DA_JANELA_DE_TENTATIVAS, MINUTOS_DE_BLOQUEIO, TENTATIVAS_ATE_BLOQUEAR } from '@/regras/contas';
import { ehPerfil, normalizarPermissoes, permissoesDoPerfil } from '@/regras/permissoesConta';
import { encerrarAcessoSimulado, lerAcessoSimulado } from './acessoSimulado';
import { ID_CONTA_DEMONSTRACAO, NOME_CONTA_DEMONSTRACAO, CREDENCIAIS_DEMONSTRACAO } from './credenciaisDemonstracao';

export const SENHA_DA_DEMONSTRACAO = 'demonstracao';

const CHAVE_CONTAS = `${PREFIXO_ARMAZENAMENTO}simulacao:contas`;
const CHAVE_TENTATIVAS = `${PREFIXO_ARMAZENAMENTO}simulacao:tentativas-de-login`;
const SESSAO_OCIOSA_MS = 12 * 3_600_000;
const MINUTO_MS = 60_000;

export interface SessaoDaConta {
  id: string;
  iniciadaEm: string;
  vistaEm: string;
}

export interface ConviteSimulado {
  resumoDoToken: string;
  enviadoEm: string;
  expiraEm: string;
}

export interface ContaSimulada {
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
  senha: string | null;
  convite: ConviteSimulado | null;
  bloqueadaAte: string | null;
  sessoes: SessaoDaConta[];
}

interface TentativasDoEmail {
  falhas: number[];
  bloqueadoAte: number | null;
}

let contasEmMemoria: ContaSimulada[] | null = null;
let tentativasEmMemoria: Record<string, TentativasDoEmail> = {};

function ler(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string | null): boolean {
  try {
    if (valor === null) window.localStorage.removeItem(chave);
    else window.localStorage.setItem(chave, valor);
    return true;
  } catch {
    return false;
  }
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null;
}

function lerAutor(valor: unknown): AutorDTO | null {
  if (!valor || typeof valor !== 'object') return null;
  const bruto = valor as Record<string, unknown>;
  const nome = texto(bruto.nome);
  const email = texto(bruto.email);
  if (nome === null || email === null) return null;
  return { id: texto(bruto.id), nome, email };
}

function lerConvite(valor: unknown): ConviteSimulado | null {
  if (!valor || typeof valor !== 'object') return null;
  const bruto = valor as Record<string, unknown>;
  const resumo = texto(bruto.resumoDoToken);
  const enviadoEm = texto(bruto.enviadoEm);
  const expiraEm = texto(bruto.expiraEm);
  return resumo && enviadoEm && expiraEm ? { resumoDoToken: resumo, enviadoEm, expiraEm } : null;
}

function lerSessoes(valor: unknown): SessaoDaConta[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const bruto = item as Record<string, unknown>;
    const id = texto(bruto.id);
    const iniciadaEm = texto(bruto.iniciadaEm);
    const vistaEm = texto(bruto.vistaEm);
    return id && iniciadaEm && vistaEm ? [{ id, iniciadaEm, vistaEm }] : [];
  });
}

function lerConta(valor: unknown): ContaSimulada | null {
  if (!valor || typeof valor !== 'object') return null;
  const bruto = valor as Record<string, unknown>;
  const id = texto(bruto.id);
  const nome = texto(bruto.nome);
  const email = texto(bruto.email);
  const criadaEm = texto(bruto.criadaEm);
  if (!id || !nome || !email || !criadaEm || !ehPerfil(bruto.perfil)) return null;
  const permissoes = Array.isArray(bruto.permissoes) ? bruto.permissoes : [];
  return {
    id,
    nome,
    email,
    perfil: bruto.perfil,
    permissoes: normalizarPermissoes(bruto.inicial === true ? [...permissoes, 'BACKUP_GERENCIAR'] : permissoes),
    ativa: bruto.ativa === true,
    inicial: bruto.inicial === true,
    criadaEm,
    criadaPor: lerAutor(bruto.criadaPor),
    atualizadaEm: texto(bruto.atualizadaEm) ?? criadaEm,
    ultimoAcessoEm: texto(bruto.ultimoAcessoEm),
    senha: texto(bruto.senha),
    convite: lerConvite(bruto.convite),
    bloqueadaAte: texto(bruto.bloqueadaAte),
    sessoes: lerSessoes(bruto.sessoes),
  };
}

function contaInicial(agora: Date): ContaSimulada {
  const instante = agora.toISOString();
  return {
    id: ID_CONTA_DEMONSTRACAO,
    nome: NOME_CONTA_DEMONSTRACAO,
    email: CREDENCIAIS_DEMONSTRACAO.email,
    perfil: 'ADMINISTRADOR',
    permissoes: permissoesDoPerfil('ADMINISTRADOR'),
    ativa: true,
    inicial: true,
    criadaEm: instante,
    criadaPor: null,
    atualizadaEm: instante,
    ultimoAcessoEm: null,
    senha: SENHA_DA_DEMONSTRACAO,
    convite: null,
    bloqueadaAte: null,
    sessoes: [],
  };
}

export function lerContasSimuladas(agora: Date = new Date()): ContaSimulada[] {
  const salvo = ler(CHAVE_CONTAS);
  if (salvo === null) {
    if (contasEmMemoria) return contasEmMemoria;
    const iniciais = [contaInicial(agora)];
    gravarContasSimuladas(iniciais);
    return iniciais;
  }
  try {
    const bruto: unknown = JSON.parse(salvo);
    const contas = Array.isArray(bruto) ? bruto.flatMap((item) => lerConta(item) ?? []) : [];
    return contas.length > 0 ? contas : [contaInicial(agora)];
  } catch {
    return [contaInicial(agora)];
  }
}

export function gravarContasSimuladas(contas: ContaSimulada[]): void {
  contasEmMemoria = contas;
  gravar(CHAVE_CONTAS, JSON.stringify(contas));
}

export function atualizarContaSimulada(id: string, mudar: (conta: ContaSimulada) => ContaSimulada): ContaSimulada | null {
  const contas = lerContasSimuladas();
  const atual = contas.find((conta) => conta.id === id);
  if (!atual) return null;
  const nova = mudar(atual);
  gravarContasSimuladas(contas.map((conta) => (conta.id === id ? nova : conta)));
  return nova;
}

export function removerContaSimulada(id: string): void {
  gravarContasSimuladas(lerContasSimuladas().filter((conta) => conta.id !== id));
}

export function contaPorEmail(email: string): ContaSimulada | null {
  const normalizado = email.trim().toLowerCase();
  return lerContasSimuladas().find((conta) => conta.email.toLowerCase() === normalizado) ?? null;
}

export function contaPorId(id: string): ContaSimulada | null {
  return lerContasSimuladas().find((conta) => conta.id === id) ?? null;
}

export function autorDaConta(conta: Pick<ContaSimulada, 'id' | 'nome' | 'email'>): AutorDTO {
  return { id: conta.id, nome: conta.nome, email: conta.email };
}

export function sessoesVivas(conta: ContaSimulada, agora: Date): SessaoDaConta[] {
  return conta.sessoes.filter((sessao) => agora.getTime() - new Date(sessao.vistaEm).getTime() < SESSAO_OCIOSA_MS);
}

export function paraContaDTO(conta: ContaSimulada, agora: Date, conexoesSalvas: number): ContaDTO {
  return {
    id: conta.id,
    nome: conta.nome,
    email: conta.email,
    perfil: conta.perfil,
    permissoes: conta.permissoes,
    ativa: conta.ativa,
    inicial: conta.inicial,
    criadaEm: conta.criadaEm,
    criadaPor: conta.criadaPor,
    atualizadaEm: conta.atualizadaEm,
    ultimoAcessoEm: conta.ultimoAcessoEm,
    convite: conta.convite ? { enviadoEm: conta.convite.enviadoEm, expiraEm: conta.convite.expiraEm } : null,
    bloqueadaAte: conta.bloqueadaAte !== null && new Date(conta.bloqueadaAte).getTime() > agora.getTime() ? conta.bloqueadaAte : null,
    sessoesAtivas: conta.ativa ? sessoesVivas(conta, agora).length : 0,
    conexoesSalvas,
  };
}

export function paraUsuarioDTO(conta: ContaSimulada): UsuarioDTO {
  return {
    id: conta.id,
    nome: conta.nome,
    email: conta.email,
    perfil: conta.perfil,
    permissoes: conta.permissoes,
    simulado: true,
  };
}

export function contaDaSessaoSimulada(agora: Date = new Date()): ContaSimulada | null {
  const acesso = lerAcessoSimulado();
  if (!acesso) return null;
  const conta = contaPorId(acesso.conta);
  if (!conta || !conta.ativa) return null;
  const sessao = sessoesVivas(conta, agora).find((item) => item.id === acesso.sessao);
  return sessao ? conta : null;
}

export function tocarSessaoSimulada(conta: ContaSimulada, agora: Date): void {
  const acesso = lerAcessoSimulado();
  if (!acesso) return;
  atualizarContaSimulada(conta.id, (atual) => ({
    ...atual,
    ultimoAcessoEm: agora.toISOString(),
    sessoes: sessoesVivas(atual, agora).map((sessao) => (sessao.id === acesso.sessao ? { ...sessao, vistaEm: agora.toISOString() } : sessao)),
  }));
}

export function abrirSessaoDaConta(conta: ContaSimulada, agora: Date): string {
  const id = crypto.randomUUID();
  const instante = agora.toISOString();
  atualizarContaSimulada(conta.id, (atual) => ({
    ...atual,
    ultimoAcessoEm: instante,
    sessoes: [...sessoesVivas(atual, agora), { id, iniciadaEm: instante, vistaEm: instante }],
  }));
  return id;
}

export function encerrarSessaoDaConta(contaId: string, sessaoId: string): void {
  atualizarContaSimulada(contaId, (atual) => ({ ...atual, sessoes: atual.sessoes.filter((sessao) => sessao.id !== sessaoId) }));
}

export function encerrarSessoesDaConta(contaId: string): number {
  const conta = contaPorId(contaId);
  if (!conta) return 0;
  const quantidade = conta.sessoes.length;
  atualizarContaSimulada(contaId, (atual) => ({ ...atual, sessoes: [] }));
  const acesso = lerAcessoSimulado();
  if (acesso?.conta === contaId) encerrarAcessoSimulado();
  return quantidade;
}

function lerTentativas(): Record<string, TentativasDoEmail> {
  const salvo = ler(CHAVE_TENTATIVAS);
  if (salvo === null) return tentativasEmMemoria;
  try {
    const bruto: unknown = JSON.parse(salvo);
    if (!bruto || typeof bruto !== 'object') return {};
    const resultado: Record<string, TentativasDoEmail> = {};
    for (const [email, valor] of Object.entries(bruto as Record<string, unknown>)) {
      if (!valor || typeof valor !== 'object') continue;
      const item = valor as Record<string, unknown>;
      resultado[email] = {
        falhas: Array.isArray(item.falhas) ? item.falhas.filter((falha): falha is number => typeof falha === 'number') : [],
        bloqueadoAte: typeof item.bloqueadoAte === 'number' ? item.bloqueadoAte : null,
      };
    }
    return resultado;
  } catch {
    return {};
  }
}

function gravarTentativas(tentativas: Record<string, TentativasDoEmail>): void {
  tentativasEmMemoria = tentativas;
  gravar(CHAVE_TENTATIVAS, JSON.stringify(tentativas));
}

function chaveDoEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function bloqueioDoEmail(email: string, agora: Date): number | null {
  const tentativas = lerTentativas()[chaveDoEmail(email)];
  if (!tentativas?.bloqueadoAte || tentativas.bloqueadoAte <= agora.getTime()) return null;
  return tentativas.bloqueadoAte;
}

export function registrarFalhaDeLogin(email: string, agora: Date): number | null {
  const chave = chaveDoEmail(email);
  const todas = lerTentativas();
  const inicioDaJanela = agora.getTime() - MINUTOS_DA_JANELA_DE_TENTATIVAS * MINUTO_MS;
  const falhas = [...(todas[chave]?.falhas ?? []).filter((instante) => instante > inicioDaJanela), agora.getTime()];
  const bloqueia = falhas.length >= TENTATIVAS_ATE_BLOQUEAR;
  const bloqueadoAte = bloqueia ? agora.getTime() + MINUTOS_DE_BLOQUEIO * MINUTO_MS : null;
  gravarTentativas({ ...todas, [chave]: { falhas: bloqueia ? [] : falhas, bloqueadoAte } });
  if (bloqueadoAte !== null) {
    const conta = contaPorEmail(email);
    if (conta) atualizarContaSimulada(conta.id, (atual) => ({ ...atual, bloqueadaAte: new Date(bloqueadoAte).toISOString() }));
  }
  return bloqueadoAte;
}

export function limparTentativasDeLogin(email: string): void {
  const todas = { ...lerTentativas() };
  delete todas[chaveDoEmail(email)];
  gravarTentativas(todas);
  const conta = contaPorEmail(email);
  if (conta?.bloqueadaAte) atualizarContaSimulada(conta.id, (atual) => ({ ...atual, bloqueadaAte: null }));
}

export function restaurarContasSimuladas(): void {
  contasEmMemoria = null;
  tentativasEmMemoria = {};
  gravar(CHAVE_CONTAS, null);
  gravar(CHAVE_TENTATIVAS, null);
  encerrarAcessoSimulado();
}
