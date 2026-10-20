import { PREFIXO_ARMAZENAMENTO } from '@/configuracoes/aplicacao';
import type {
  AlvoAuditoriaDTO,
  AutorDTO,
  CategoriaAuditoria,
  CodigoPermissao,
  EventoAuditoriaDTO,
  ModuloAuditoria,
  MudancaAuditoriaDTO,
  ResultadoAuditoria,
  TipoEventoAuditoria,
} from '@/modelos/administracao';
import { LIMITE_DE_EVENTOS_GUARDADOS, categoriasAuditoria, classificarTipo, modulosAuditoria, resultadosAuditoria, resumirNavegador } from '@/regras/auditoria';
import { normalizarPermissoes } from '@/regras/permissoesConta';

const CHAVE_AUDITORIA = `${PREFIXO_ARMAZENAMENTO}simulacao:auditoria`;

let eventosEmMemoria: EventoAuditoriaDTO[] = [];

export interface NovoEvento {
  tipo: TipoEventoAuditoria;
  resultado: ResultadoAuditoria;
  conta: AutorDTO | null;
  categoria?: CategoriaAuditoria;
  modulo?: ModuloAuditoria;
  emailInformado?: string | null;
  alvo?: AlvoAuditoriaDTO | null;
  mudancas?: MudancaAuditoriaDTO[];
  concedidas?: CodigoPermissao[];
  revogadas?: CodigoPermissao[];
  motivo?: string | null;
  requisicao?: { metodo: string; caminho: string } | null;
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null;
}

function lerAutor(valor: unknown): AutorDTO | null {
  if (!valor || typeof valor !== 'object') return null;
  const bruto = valor as Record<string, unknown>;
  const nome = texto(bruto.nome);
  const email = texto(bruto.email);
  return nome !== null && email !== null ? { id: texto(bruto.id), nome, email } : null;
}

function lerEvento(valor: unknown): EventoAuditoriaDTO | null {
  if (!valor || typeof valor !== 'object') return null;
  const bruto = valor as Record<string, unknown>;
  const id = texto(bruto.id);
  const ocorridoEm = texto(bruto.ocorridoEm);
  const categoria = categoriasAuditoria.find((item) => item === bruto.categoria);
  const modulo = modulosAuditoria.find((item) => item === bruto.modulo);
  const resultado = resultadosAuditoria.find((item) => item === bruto.resultado);
  if (!id || !ocorridoEm || !categoria || !modulo || !resultado || typeof bruto.tipo !== 'string') return null;
  const alvo = bruto.alvo && typeof bruto.alvo === 'object' ? (bruto.alvo as AlvoAuditoriaDTO) : null;
  const origem = bruto.origem && typeof bruto.origem === 'object' ? (bruto.origem as Record<string, unknown>) : {};
  const requisicao = bruto.requisicao && typeof bruto.requisicao === 'object' ? (bruto.requisicao as Record<string, unknown>) : null;
  return {
    id,
    ocorridoEm,
    tipo: bruto.tipo as TipoEventoAuditoria,
    categoria,
    modulo,
    resultado,
    conta: lerAutor(bruto.conta),
    emailInformado: texto(bruto.emailInformado),
    alvo: alvo && typeof alvo.id === 'string' && typeof alvo.rotulo === 'string' ? alvo : null,
    mudancas: Array.isArray(bruto.mudancas) ? (bruto.mudancas as MudancaAuditoriaDTO[]) : [],
    concedidas: normalizarPermissoes(Array.isArray(bruto.concedidas) ? bruto.concedidas : []),
    revogadas: normalizarPermissoes(Array.isArray(bruto.revogadas) ? bruto.revogadas : []),
    motivo: texto(bruto.motivo),
    requisicao:
      requisicao && typeof requisicao.metodo === 'string' && typeof requisicao.caminho === 'string'
        ? { metodo: requisicao.metodo, caminho: requisicao.caminho }
        : null,
    origem: { ip: texto(origem.ip), navegador: texto(origem.navegador) },
  };
}

export function lerEventosSimulados(): EventoAuditoriaDTO[] {
  try {
    const salvo = window.localStorage.getItem(CHAVE_AUDITORIA);
    if (salvo === null) return eventosEmMemoria;
    const bruto: unknown = JSON.parse(salvo);
    return Array.isArray(bruto) ? bruto.flatMap((item) => lerEvento(item) ?? []) : [];
  } catch {
    return eventosEmMemoria;
  }
}

function gravarEventos(eventos: EventoAuditoriaDTO[]): void {
  eventosEmMemoria = eventos;
  try {
    window.localStorage.setItem(CHAVE_AUDITORIA, JSON.stringify(eventos));
  } catch {
    return;
  }
}

function navegadorAtual(): string | null {
  return typeof navigator === 'undefined' ? null : resumirNavegador(navigator.userAgent);
}

export function registrarEvento(novo: NovoEvento, agora: Date = new Date()): EventoAuditoriaDTO {
  const classificacao =
    novo.tipo === 'TELA_ACESSADA' || novo.tipo === 'ACESSO_NEGADO'
      ? { categoria: novo.categoria ?? 'NAVEGACAO', modulo: novo.modulo ?? 'ACESSO' }
      : classificarTipo(novo.tipo);
  const evento: EventoAuditoriaDTO = {
    id: crypto.randomUUID(),
    ocorridoEm: agora.toISOString(),
    tipo: novo.tipo,
    categoria: novo.categoria ?? classificacao.categoria,
    modulo: novo.modulo ?? classificacao.modulo,
    resultado: novo.resultado,
    conta: novo.conta,
    emailInformado: novo.emailInformado ?? null,
    alvo: novo.alvo ?? null,
    mudancas: novo.mudancas ?? [],
    concedidas: novo.concedidas ?? [],
    revogadas: novo.revogadas ?? [],
    motivo: novo.motivo ?? null,
    requisicao: novo.requisicao ?? null,
    origem: { ip: null, navegador: navegadorAtual() },
  };
  const eventos = [evento, ...lerEventosSimulados()].slice(0, LIMITE_DE_EVENTOS_GUARDADOS);
  gravarEventos(eventos);
  return evento;
}

export function restaurarAuditoriaSimulada(): void {
  eventosEmMemoria = [];
  try {
    window.localStorage.removeItem(CHAVE_AUDITORIA);
  } catch {
    return;
  }
}
