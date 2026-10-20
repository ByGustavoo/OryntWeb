import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import type {
  AutorDTO,
  CategoriaAuditoria,
  ContagemAuditoriaDTO,
  EventoAuditoriaDTO,
  ModuloAuditoria,
  PaginaAuditoriaDTO,
  ResumoContaAuditoriaDTO,
} from '@/modelos/administracao';
import { EVENTOS_POR_PAGINA, categoriasAuditoria, filtrarEventos, filtrosAuditoriaIniciais, lerFiltrosAuditoria, modulosAuditoria } from '@/regras/auditoria';
import { lerEventosSimulados } from '../auditoriaSimulada';
import type { ContextoSimulado } from '../autorizacaoSimulada';
import { semAcessoAutenticado } from '../autorizacaoSimulada';
import { ok } from '../resposta';

function numero(valor: unknown): number | undefined {
  const convertido = typeof valor === 'string' ? Number(valor) : valor;
  return typeof convertido === 'number' && Number.isFinite(convertido) ? convertido : undefined;
}

function contasDoRegistro(eventos: EventoAuditoriaDTO[]): AutorDTO[] {
  const porId = new Map<string, AutorDTO>();
  for (const evento of eventos) {
    if (evento.conta?.id && !porId.has(evento.conta.id)) porId.set(evento.conta.id, evento.conta);
  }
  return [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function contar<T extends string>(chaves: readonly T[], eventos: EventoAuditoriaDTO[], ler: (evento: EventoAuditoriaDTO) => T): ContagemAuditoriaDTO<T>[] {
  return chaves
    .map((chave) => ({ chave, eventos: eventos.filter((evento) => ler(evento) === chave).length }))
    .filter((item) => item.eventos > 0)
    .sort((a, b) => b.eventos - a.eventos);
}

function resumirConta(conta: AutorDTO, eventos: EventoAuditoriaDTO[]): ResumoContaAuditoriaDTO {
  const daConta = eventos.filter((evento) => evento.conta?.id === conta.id);
  return {
    conta,
    primeiroEventoEm: daConta[daConta.length - 1]?.ocorridoEm ?? null,
    ultimoEventoEm: daConta[0]?.ocorridoEm ?? null,
    porModulo: contar<ModuloAuditoria>(modulosAuditoria, daConta, (evento) => evento.modulo),
    porCategoria: contar<CategoriaAuditoria>(categoriasAuditoria, daConta, (evento) => evento.categoria),
    negados: daConta.filter((evento) => evento.resultado === 'NEGADO').length,
  };
}

export function listarAuditoria(
  requisicao: RequisicaoTransporte,
  agora: Date,
  _parametros: Record<string, string>,
  contexto: ContextoSimulado,
): RespostaTransporte {
  if (!contexto.conta) return semAcessoAutenticado();
  const filtros = lerFiltrosAuditoria({ ...requisicao.consulta, pagina: numero(requisicao.consulta.pagina) });
  const todos = lerEventosSimulados();
  const encontrados = filtrarEventos(todos, filtros, agora);
  const totalPaginas = Math.max(1, Math.ceil(encontrados.length / EVENTOS_POR_PAGINA));
  const pagina = Math.min(filtros.pagina, totalPaginas);
  const inicio = (pagina - 1) * EVENTOS_POR_PAGINA;
  const contas = contasDoRegistro(todos);
  const contaFiltrada = filtros.conta ? contas.find((conta) => conta.id === filtros.conta) : undefined;
  const daConta = contaFiltrada
    ? filtrarEventos(todos, { ...filtrosAuditoriaIniciais, conta: contaFiltrada.id, periodo: filtros.periodo }, agora)
    : [];

  const resposta: PaginaAuditoriaDTO = {
    geradoEm: agora.toISOString(),
    itens: encontrados.slice(inicio, inicio + EVENTOS_POR_PAGINA),
    pagina,
    itensPorPagina: EVENTOS_POR_PAGINA,
    totalItens: encontrados.length,
    totalPaginas,
    totalRegistrados: todos.length,
    registradosDesde: todos[todos.length - 1]?.ocorridoEm ?? null,
    contas,
    resumoDaConta: contaFiltrada ? resumirConta(contaFiltrada, daConta) : null,
  };
  return ok(resposta);
}
