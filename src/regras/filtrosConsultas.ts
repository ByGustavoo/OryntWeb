import type {
  ConsultaDetalhadaDTO,
  DirecaoOrdenacao,
  FiltrosConsultas,
  OrdenacaoConsultas,
  PaginaConsultasDTO,
  TipoComando,
} from '@/modelos/consultas';
import type { DesempenhoConsulta, PeriodoDashboard } from '@/modelos/dashboard';
import {
  desempenhosConsulta,
  direcoesOrdenacao,
  ordenacoesConsultas,
  periodosDashboard,
  rotuloFaixaDesempenho,
  rotuloTipoComando,
  tiposComando,
} from '@/modelos/rotulos';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { limparBusca } from './buscaConsultas';

export const TAMANHO_DA_PAGINA = 25;
export const TAMANHO_MAXIMO_DA_PAGINA = 100;

export const filtrosIniciais: FiltrosConsultas = {
  periodo: 'ULTIMAS_24_HORAS',
  busca: '',
  desempenho: null,
  tipo: null,
  ordenacao: 'PERCENTUAL_TEMPO_TOTAL',
  direcao: 'DESC',
  pagina: 1,
};

export interface IntervaloDaPagina {
  primeiro: number;
  ultimo: number;
}

export type SentidoDoPasso = -1 | 1;
export type PontaDaPagina = 'PRIMEIRA' | 'ULTIMA';

export type PassoNaLista =
  | { tipo: 'CONSULTA'; consulta: ConsultaDetalhadaDTO }
  | { tipo: 'PAGINA'; pagina: number; ponta: PontaDaPagina };

function lerDaLista<T extends string>(lista: readonly T[], valor: unknown): T | null {
  return lista.find((item) => item === valor) ?? null;
}

export function lerPeriodoDaLista(valor: unknown): PeriodoDashboard | null {
  return lerDaLista(periodosDashboard, valor);
}

export function lerDesempenho(valor: unknown): DesempenhoConsulta | null {
  return lerDaLista(desempenhosConsulta, valor);
}

export function lerTipoComando(valor: unknown): TipoComando | null {
  return lerDaLista(tiposComando, valor);
}

export function lerOrdenacao(valor: unknown): OrdenacaoConsultas | null {
  return lerDaLista(ordenacoesConsultas, valor);
}

export function lerDirecao(valor: unknown): DirecaoOrdenacao | null {
  return lerDaLista(direcoesOrdenacao, valor);
}

export function lerNumeroDaPagina(valor: unknown): number | null {
  const numero = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : valor;
  return typeof numero === 'number' && Number.isInteger(numero) && numero >= 1 ? numero : null;
}

export function lerFiltros(valor: unknown): FiltrosConsultas {
  if (!valor || typeof valor !== 'object') return filtrosIniciais;
  const guardado = valor as Record<string, unknown>;

  return {
    periodo: lerPeriodoDaLista(guardado.periodo) ?? filtrosIniciais.periodo,
    busca: typeof guardado.busca === 'string' ? limparBusca(guardado.busca) : filtrosIniciais.busca,
    desempenho: lerDesempenho(guardado.desempenho),
    tipo: lerTipoComando(guardado.tipo),
    ordenacao: lerOrdenacao(guardado.ordenacao) ?? filtrosIniciais.ordenacao,
    direcao: lerDirecao(guardado.direcao) ?? filtrosIniciais.direcao,
    pagina: lerNumeroDaPagina(guardado.pagina) ?? filtrosIniciais.pagina,
  };
}

export function aplicarMudanca(filtros: FiltrosConsultas, mudanca: Partial<FiltrosConsultas>): FiltrosConsultas {
  const mudouSoAPagina = Object.keys(mudanca).every((campo) => campo === 'pagina');
  return lerFiltros({ ...filtros, ...mudanca, pagina: mudouSoAPagina ? (mudanca.pagina ?? filtros.pagina) : 1 });
}

export function alternarOrdenacao(
  filtros: FiltrosConsultas,
  ordenacao: OrdenacaoConsultas,
): Pick<FiltrosConsultas, 'ordenacao' | 'direcao'> {
  if (filtros.ordenacao !== ordenacao) return { ordenacao, direcao: 'DESC' };
  return { ordenacao, direcao: filtros.direcao === 'DESC' ? 'ASC' : 'DESC' };
}

export function temFiltroAtivo(filtros: FiltrosConsultas): boolean {
  return filtros.busca !== '' || filtros.desempenho !== null || filtros.tipo !== null;
}

export function semFiltros(): Pick<FiltrosConsultas, 'busca' | 'desempenho' | 'tipo'> {
  return { busca: filtrosIniciais.busca, desempenho: filtrosIniciais.desempenho, tipo: filtrosIniciais.tipo };
}

export function intervaloDaPagina(pagina: PaginaConsultasDTO): IntervaloDaPagina {
  if (pagina.itens.length === 0) return { primeiro: 0, ultimo: 0 };
  const primeiro = (pagina.pagina - 1) * pagina.tamanhoPagina + 1;
  return { primeiro, ultimo: primeiro + pagina.itens.length - 1 };
}

export function posicaoNaLista(pagina: PaginaConsultasDTO, id: string): number | null {
  const indice = pagina.itens.findIndex((consulta) => consulta.id === id);
  return indice < 0 ? null : (pagina.pagina - 1) * pagina.tamanhoPagina + indice + 1;
}

export function passoNaLista(pagina: PaginaConsultasDTO, id: string, sentido: SentidoDoPasso): PassoNaLista | null {
  const indice = pagina.itens.findIndex((consulta) => consulta.id === id);
  if (indice < 0) return null;

  const vizinha = pagina.itens[indice + sentido];
  if (vizinha) return { tipo: 'CONSULTA', consulta: vizinha };

  const outraPagina = pagina.pagina + sentido;
  if (outraPagina < 1 || outraPagina > pagina.totalPaginas) return null;
  return { tipo: 'PAGINA', pagina: outraPagina, ponta: sentido === 1 ? 'PRIMEIRA' : 'ULTIMA' };
}

export function consultaDaPonta(pagina: PaginaConsultasDTO, ponta: PontaDaPagina): ConsultaDetalhadaDTO | null {
  return (ponta === 'PRIMEIRA' ? pagina.itens[0] : pagina.itens[pagina.itens.length - 1]) ?? null;
}

export function resumirResultado(pagina: PaginaConsultasDTO, filtros: FiltrosConsultas): string {
  if (pagina.totalDoPeriodo === 0) return 'Nenhuma consulta no período';
  const doPeriodo = `${formatarNumero(pagina.totalDoPeriodo)} ${pluralizar(pagina.totalDoPeriodo, 'consulta', 'consultas')}`;
  if (!temFiltroAtivo(filtros)) return doPeriodo;
  return `${formatarNumero(pagina.totalItens)} de ${doPeriodo}`;
}

export function descreverFiltros(filtros: FiltrosConsultas): string[] {
  const partes: string[] = [];
  if (filtros.busca !== '') partes.push(`busca por “${filtros.busca}”`);
  if (filtros.desempenho) partes.push(`desempenho: ${rotuloFaixaDesempenho[filtros.desempenho].toLowerCase()}`);
  if (filtros.tipo) partes.push(`comando: ${rotuloTipoComando[filtros.tipo]}`);
  return partes;
}
