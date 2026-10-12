import type { ConsultaResumoDTO, DesempenhoConsulta, PontoAtividadeDTO } from '@/modelos/dashboard';
import type {
  FaixaDesempenhoDTO,
  GranularidadeRelatorio,
  PeriodoRelatorio,
  ResumoRelatorioDTO,
} from '@/modelos/relatorios';
import {
  formatarDuracaoMs,
  formatarNumero,
  formatarPercentual,
  iniciarComMaiuscula,
  pluralizar,
} from '@/utilitarios/formatacao';
import { consultasPorExtenso, quantidadePorExtenso } from './destaquesRelatorio';
import type { Destaque } from './destaquesRelatorio';
import {
  anosDoPeriodo,
  diasDoPeriodo,
  distanciaEmPassos,
  lerPeriodo,
  periodoComoReferencia,
  periodoVizinho,
  rotuloCurtoDoPeriodo,
  rotuloDoPeriodo,
} from './periodoRelatorio';

export interface ParDePeriodos {
  periodo: PeriodoRelatorio;
  base: PeriodoRelatorio;
}

export interface AtalhoDeBase {
  passos: number;
  rotulo: string;
}

export interface ValorComparado {
  principal: number;
  base: number;
  diferenca: number;
  variacao: number | null;
}

export interface IndicadoresComparados {
  totalConsultas: ValorComparado;
  consultasPorDia: ValorComparado | null;
  tempoMedioMs: ValorComparado;
  consultasLentas: ValorComparado;
  picoConexoes: ValorComparado;
}

export interface PontoComparado {
  posicao: number;
  instantePrincipal: string | null;
  instanteBase: string | null;
  consultasPrincipal: number | null;
  consultasBase: number | null;
  tempoMedioPrincipal: number | null;
  tempoMedioBase: number | null;
}

export interface FaixaComparada {
  desempenho: DesempenhoConsulta;
  execucoes: ValorComparado;
  tempo: ValorComparado;
}

export interface MedidasDaConsulta {
  tempoMedioMs: number;
  quantidadeExecucoes: number;
  percentualTempoTotal: number;
  desempenho: DesempenhoConsulta;
}

export type TendenciaConsulta = 'PIOROU' | 'MELHOROU' | 'ESTAVEL' | 'SEM_COMPARACAO';
export type FiltroConsultas = 'TODAS' | 'PIORARAM' | 'MELHORARAM';

export interface ConsultaComparada {
  id: string;
  sql: string;
  principal: MedidasDaConsulta | null;
  base: MedidasDaConsulta | null;
  diferencaTempoMedioMs: number | null;
  variacaoTempoMedio: number | null;
  variacaoExecucoes: number | null;
  tendencia: TendenciaConsulta;
}

export interface RotulosDaComparacao {
  principal: string;
  base: string;
}

export const VARIACAO_DESPREZIVEL = 0.05;

export const atalhosDeBase: Record<GranularidadeRelatorio, AtalhoDeBase[]> = {
  DIA: [
    { passos: -1, rotulo: 'Dia anterior' },
    { passos: -7, rotulo: '7 dias antes' },
  ],
  SEMANA: [
    { passos: -1, rotulo: 'Semana anterior' },
    { passos: -4, rotulo: '4 semanas antes' },
  ],
  MES: [
    { passos: -1, rotulo: 'Mês anterior' },
    { passos: -3, rotulo: '3 meses antes' },
  ],
};

const faixas: DesempenhoConsulta[] = ['RAPIDA', 'MODERADA', 'LENTA'];

const faixaNaFrase: Record<DesempenhoConsulta, string> = {
  RAPIDA: 'rápidas',
  MODERADA: 'moderadas',
  LENTA: 'lentas',
};

function arredondar(valor: number): number {
  return Math.round(valor * 10) / 10;
}

export function basePadrao(periodo: PeriodoRelatorio, hoje: Date): PeriodoRelatorio {
  return lerPeriodo(periodoVizinho(periodo, -1), hoje) ?? periodoVizinho(periodo, 1);
}

export function baseDoAtalho(periodo: PeriodoRelatorio, atalho: AtalhoDeBase, hoje: Date): PeriodoRelatorio | null {
  return lerPeriodo(periodoVizinho(periodo, atalho.passos), hoje);
}

export function atalhoEmUso(par: ParDePeriodos): AtalhoDeBase | null {
  const passos = distanciaEmPassos(par.periodo, par.base);
  return atalhosDeBase[par.periodo.granularidade].find((atalho) => atalho.passos === passos) ?? null;
}

export function lerBase(valor: unknown, periodo: PeriodoRelatorio, hoje: Date): PeriodoRelatorio | null {
  const base = lerPeriodo(valor, hoje);
  if (!base || base.granularidade !== periodo.granularidade || base.inicio === periodo.inicio) return null;
  return base;
}

export function acompanharPeriodo(par: ParDePeriodos, proximo: PeriodoRelatorio, hoje: Date): ParDePeriodos {
  if (proximo.granularidade !== par.periodo.granularidade) return { periodo: proximo, base: basePadrao(proximo, hoje) };
  const passos = distanciaEmPassos(par.periodo, par.base);
  const mesmaDistancia = lerBase(periodoVizinho(proximo, passos), proximo, hoje);
  return { periodo: proximo, base: mesmaDistancia ?? basePadrao(proximo, hoje) };
}

export function vizinhaDaBase(par: ParDePeriodos, sentido: -1 | 1, hoje: Date): PeriodoRelatorio | null {
  const vizinha = periodoVizinho(par.base, sentido);
  const candidata = vizinha.inicio === par.periodo.inicio ? periodoVizinho(vizinha, sentido) : vizinha;
  return lerPeriodo(candidata, hoje);
}

export function inverterPeriodos(par: ParDePeriodos): ParDePeriodos {
  return { periodo: par.base, base: par.periodo };
}

export function periodosDaComparacao(principal: ResumoRelatorioDTO, base: ResumoRelatorioDTO): ParDePeriodos {
  return {
    periodo: { granularidade: principal.granularidade, inicio: principal.inicio },
    base: { granularidade: base.granularidade, inicio: base.inicio },
  };
}

function precisaDoAno({ periodo, base }: ParDePeriodos): boolean {
  return new Set([...anosDoPeriodo(periodo), ...anosDoPeriodo(base)]).size > 1;
}

export function rotulosDaComparacao(par: ParDePeriodos): RotulosDaComparacao {
  const comAno = precisaDoAno(par);
  return { principal: rotuloCurtoDoPeriodo(par.periodo, comAno), base: rotuloCurtoDoPeriodo(par.base, comAno) };
}

export function titulosDaComparacao(par: ParDePeriodos): RotulosDaComparacao {
  const rotulos = rotulosDaComparacao(par);
  return { principal: iniciarComMaiuscula(rotulos.principal), base: iniciarComMaiuscula(rotulos.base) };
}

function viraOAno(periodo: PeriodoRelatorio): boolean {
  return anosDoPeriodo(periodo).length > 1;
}

export function rotulosDoSeletor({ periodo, base }: ParDePeriodos): RotulosDaComparacao {
  const anoNasDuasPontas = viraOAno(periodo) || viraOAno(base);
  return {
    principal: iniciarComMaiuscula(rotuloCurtoDoPeriodo(periodo, true, anoNasDuasPontas)),
    base: iniciarComMaiuscula(rotuloCurtoDoPeriodo(base, true, anoNasDuasPontas)),
  };
}

export function referenciaDaBase(par: ParDePeriodos): string {
  return periodoComoReferencia(par.base, precisaDoAno(par));
}

export function variacaoEntre(principal: number, base: number): number | null {
  if (base <= 0) return null;
  return arredondar(((principal - base) / base) * 100);
}

function comparar(principal: number, base: number): ValorComparado {
  return { principal, base, diferenca: principal - base, variacao: variacaoEntre(principal, base) };
}

function compararFatias(principal: number, base: number): ValorComparado {
  return { principal, base, diferenca: arredondar(principal - base), variacao: variacaoEntre(principal, base) };
}

export function compararIndicadores(principal: ResumoRelatorioDTO, base: ResumoRelatorioDTO): IndicadoresComparados {
  const { periodo, base: periodoBase } = periodosDaComparacao(principal, base);
  const diasDoPrincipal = diasDoPeriodo(periodo).length;
  const diasDaBase = diasDoPeriodo(periodoBase).length;
  const total = comparar(principal.indicadores.totalConsultas, base.indicadores.totalConsultas);

  return {
    totalConsultas: total,
    consultasPorDia:
      diasDoPrincipal === diasDaBase
        ? null
        : comparar(Math.round(total.principal / diasDoPrincipal), Math.round(total.base / diasDaBase)),
    tempoMedioMs: comparar(principal.indicadores.tempoMedioMs, base.indicadores.tempoMedioMs),
    consultasLentas: comparar(principal.indicadores.consultasLentas, base.indicadores.consultasLentas),
    picoConexoes: comparar(principal.indicadores.picoConexoes, base.indicadores.picoConexoes),
  };
}

export function alinharEvolucao(principal: PontoAtividadeDTO[], base: PontoAtividadeDTO[]): PontoComparado[] {
  return Array.from({ length: Math.max(principal.length, base.length) }, (_, posicao) => {
    const doPrincipal = principal[posicao];
    const daBase = base[posicao];
    return {
      posicao,
      instantePrincipal: doPrincipal?.instante ?? null,
      instanteBase: daBase?.instante ?? null,
      consultasPrincipal: doPrincipal?.consultas ?? null,
      consultasBase: daBase?.consultas ?? null,
      tempoMedioPrincipal: doPrincipal?.tempoMedioMs ?? null,
      tempoMedioBase: daBase?.tempoMedioMs ?? null,
    };
  });
}

export function compararDesempenho(principal: FaixaDesempenhoDTO[], base: FaixaDesempenhoDTO[]): FaixaComparada[] {
  const ler = (lista: FaixaDesempenhoDTO[], desempenho: DesempenhoConsulta) =>
    lista.find((faixa) => faixa.desempenho === desempenho);

  return faixas.map((desempenho) => {
    const doPrincipal = ler(principal, desempenho);
    const daBase = ler(base, desempenho);
    return {
      desempenho,
      execucoes: compararFatias(doPrincipal?.percentualExecucoes ?? 0, daBase?.percentualExecucoes ?? 0),
      tempo: compararFatias(doPrincipal?.percentualTempoTotal ?? 0, daBase?.percentualTempoTotal ?? 0),
    };
  });
}

export function resumirMudancaDeDesempenho(faixasComparadas: FaixaComparada[], referencia: string): string | null {
  const [primeira, ...demais] = faixasComparadas;
  if (!primeira) return null;
  const maior = demais.reduce(
    (atual, faixa) => (Math.abs(faixa.tempo.diferenca) > Math.abs(atual.tempo.diferenca) ? faixa : atual),
    primeira,
  );

  if (Math.abs(maior.tempo.diferenca) < VARIACAO_DESPREZIVEL) {
    return 'O tempo do banco se dividiu entre as três faixas da mesma forma nos dois períodos.';
  }
  return `As consultas ${faixaNaFrase[maior.desempenho]} consumiram ${formatarPercentual(maior.tempo.principal)} do tempo do banco, contra ${formatarPercentual(maior.tempo.base)} ${referencia}.`;
}

function medir(consulta: ConsultaResumoDTO | undefined): MedidasDaConsulta | null {
  if (!consulta) return null;
  return {
    tempoMedioMs: consulta.tempoMedioMs,
    quantidadeExecucoes: consulta.quantidadeExecucoes,
    percentualTempoTotal: consulta.percentualTempoTotal,
    desempenho: consulta.desempenho,
  };
}

function classificarTendencia(variacao: number | null): TendenciaConsulta {
  if (variacao === null) return 'SEM_COMPARACAO';
  if (Math.abs(variacao) < VARIACAO_DESPREZIVEL) return 'ESTAVEL';
  return variacao > 0 ? 'PIOROU' : 'MELHOROU';
}

function ordenarPelaMudanca(a: ConsultaComparada, b: ConsultaComparada): number {
  if (a.variacaoTempoMedio === null || b.variacaoTempoMedio === null) {
    return Number(a.variacaoTempoMedio === null) - Number(b.variacaoTempoMedio === null);
  }
  return b.variacaoTempoMedio - a.variacaoTempoMedio;
}

export function compararConsultas(principal: ConsultaResumoDTO[], base: ConsultaResumoDTO[]): ConsultaComparada[] {
  const daBase = new Map(base.map((consulta) => [consulta.id, consulta]));
  const doPrincipal = new Set(principal.map((consulta) => consulta.id));
  const todas = [...principal, ...base.filter((consulta) => !doPrincipal.has(consulta.id))];

  return todas
    .map((consulta) => {
      const noPrincipal = medir(doPrincipal.has(consulta.id) ? consulta : undefined);
      const naBase = medir(daBase.get(consulta.id));
      const variacaoTempoMedio = noPrincipal && naBase ? variacaoEntre(noPrincipal.tempoMedioMs, naBase.tempoMedioMs) : null;

      return {
        id: consulta.id,
        sql: consulta.sql,
        principal: noPrincipal,
        base: naBase,
        diferencaTempoMedioMs: noPrincipal && naBase ? arredondar(noPrincipal.tempoMedioMs - naBase.tempoMedioMs) : null,
        variacaoTempoMedio,
        variacaoExecucoes:
          noPrincipal && naBase ? variacaoEntre(noPrincipal.quantidadeExecucoes, naBase.quantidadeExecucoes) : null,
        tendencia: classificarTendencia(variacaoTempoMedio),
      };
    })
    .sort(ordenarPelaMudanca);
}

export function filtrarConsultas(consultas: ConsultaComparada[], filtro: FiltroConsultas): ConsultaComparada[] {
  if (filtro === 'PIORARAM') return consultas.filter((consulta) => consulta.tendencia === 'PIOROU');
  if (filtro === 'MELHORARAM') return consultas.filter((consulta) => consulta.tendencia === 'MELHOROU');
  return consultas;
}

function contarTendencia(quantidade: number, singular: string, plural: string): string {
  if (quantidade === 0) return `nenhuma ${singular}`;
  return `${formatarNumero(quantidade)} ${pluralizar(quantidade, singular, plural)}`;
}

export function resumirTendencias(consultas: ConsultaComparada[]): string {
  const pioraram = filtrarConsultas(consultas, 'PIORARAM').length;
  const melhoraram = filtrarConsultas(consultas, 'MELHORARAM').length;
  return `${contarTendencia(pioraram, 'piorou', 'pioraram')} e ${contarTendencia(melhoraram, 'melhorou', 'melhoraram')}`;
}

function percentual(variacao: number): string {
  return formatarPercentual(Math.abs(variacao));
}

function mudarVolume(indicadores: IndicadoresComparados, referencia: string): Destaque {
  const { principal, base, variacao } = indicadores.totalConsultas;
  const executou = `O banco executou ${consultasPorExtenso(principal)}`;

  if (variacao === null) return { tipo: 'VOLUME', tom: 'neutro', texto: `${executou}.` };
  if (Math.abs(variacao) < VARIACAO_DESPREZIVEL) {
    return { tipo: 'VOLUME', tom: 'neutro', texto: `${executou}, o mesmo volume registrado ${referencia}.` };
  }
  const sentido = variacao > 0 ? 'a mais' : 'a menos';
  return {
    tipo: 'VOLUME',
    tom: 'neutro',
    texto: `${executou}, contra ${quantidadePorExtenso(base)} ${referencia}: ${percentual(variacao)} ${sentido}.`,
  };
}

function mudarCalendario(indicadores: IndicadoresComparados, par: ParDePeriodos): Destaque | null {
  const porDia = indicadores.consultasPorDia;
  if (!porDia || porDia.variacao === null) return null;
  const comAno = precisaDoAno(par);
  const dias = (periodo: PeriodoRelatorio) => diasDoPeriodo(periodo).length;
  const tamanhos = `${iniciarComMaiuscula(rotuloDoPeriodo(par.periodo, comAno))} tem ${dias(par.periodo)} dias e ${rotuloDoPeriodo(par.base, comAno)}, ${dias(par.base)}`;

  if (Math.abs(porDia.variacao) < VARIACAO_DESPREZIVEL) {
    return { tipo: 'CALENDARIO', tom: 'neutro', texto: `${tamanhos}: por dia, o volume foi o mesmo.` };
  }
  const sentido = porDia.variacao > 0 ? 'maior' : 'menor';
  return {
    tipo: 'CALENDARIO',
    tom: 'neutro',
    texto: `${tamanhos}: por dia, o volume foi ${percentual(porDia.variacao)} ${sentido}.`,
  };
}

function mudarTempo(indicadores: IndicadoresComparados, referencia: string): Destaque {
  const { principal, base, variacao } = indicadores.tempoMedioMs;
  const ficou = `O tempo médio de execução ficou em ${formatarDuracaoMs(principal)}`;

  if (variacao === null) return { tipo: 'TEMPO', tom: 'neutro', texto: `${ficou}.` };
  if (Math.abs(variacao) < VARIACAO_DESPREZIVEL) {
    return { tipo: 'TEMPO', tom: 'neutro', texto: `${ficou}, igual ao registrado ${referencia}.` };
  }
  const contra = `${ficou}, contra ${formatarDuracaoMs(base)} ${referencia}: ${percentual(variacao)}`;
  return variacao < 0
    ? { tipo: 'TEMPO', tom: 'positivo', texto: `${contra} menor.` }
    : { tipo: 'TEMPO', tom: 'atencao', texto: `${contra} maior.` };
}

function consultasLentas(quantidade: number): string {
  return `${formatarNumero(quantidade)} ${pluralizar(quantidade, 'consulta lenta', 'consultas lentas')}`;
}

function mudarLentas(indicadores: IndicadoresComparados, referencia: string): Destaque {
  const { principal, base } = indicadores.consultasLentas;

  if (principal === base) {
    const texto =
      principal === 0
        ? 'Nenhum dos dois períodos teve consultas lentas.'
        : `Os dois períodos tiveram ${consultasLentas(principal)}.`;
    return { tipo: 'LENTAS', tom: 'neutro', texto };
  }
  const tom = principal > base ? 'atencao' : 'positivo';
  if (principal === 0) {
    return { tipo: 'LENTAS', tom, texto: `O período não teve consultas lentas, contra ${formatarNumero(base)} ${referencia}.` };
  }
  const contra = base === 0 ? 'nenhuma' : formatarNumero(base);
  return { tipo: 'LENTAS', tom, texto: `O período teve ${consultasLentas(principal)}, contra ${contra} ${referencia}.` };
}

function mudarConsulta(
  consultas: ConsultaComparada[],
  tendencia: 'PIOROU' | 'MELHOROU',
  referencia: string,
): Destaque | null {
  const candidatas = consultas.filter((consulta) => consulta.tendencia === tendencia);
  const [primeira, ...demais] = candidatas;
  if (!primeira) return null;
  const maior = demais.reduce(
    (atual, consulta) =>
      Math.abs(consulta.variacaoTempoMedio ?? 0) > Math.abs(atual.variacaoTempoMedio ?? 0) ? consulta : atual,
    primeira,
  );
  if (!maior.principal || !maior.base || maior.variacaoTempoMedio === null) return null;

  const piorou = tendencia === 'PIOROU';
  return {
    tipo: piorou ? 'PIORA' : 'MELHORA',
    tom: piorou ? 'atencao' : 'positivo',
    texto: `A consulta que mais ${piorou ? 'piorou' : 'melhorou'} teve tempo médio de ${formatarDuracaoMs(maior.principal.tempoMedioMs)}, contra ${formatarDuracaoMs(maior.base.tempoMedioMs)} ${referencia}: ${percentual(maior.variacaoTempoMedio)} ${piorou ? 'maior' : 'menor'}.`,
    sql: maior.sql,
  };
}

export function montarMudancas(principal: ResumoRelatorioDTO, base: ResumoRelatorioDTO): Destaque[] {
  if (principal.indicadores.totalConsultas <= 0 || base.indicadores.totalConsultas <= 0) return [];
  const par = periodosDaComparacao(principal, base);
  const referencia = referenciaDaBase(par);
  const indicadores = compararIndicadores(principal, base);
  const consultas = compararConsultas(principal.consultas, base.consultas);

  return [
    mudarVolume(indicadores, referencia),
    mudarCalendario(indicadores, par),
    mudarTempo(indicadores, referencia),
    mudarLentas(indicadores, referencia),
    mudarConsulta(consultas, 'PIOROU', referencia),
    mudarConsulta(consultas, 'MELHOROU', referencia),
  ].filter((mudanca): mudanca is Destaque => mudanca !== null);
}

export function cabecalhoDaComparacao(nomeConexao: string, par: ParDePeriodos, simulada: boolean): string {
  const aviso = simulada ? ' (dados demonstrativos)' : '';
  return `Comparação de ${nomeConexao}: ${rotuloDoPeriodo(par.periodo)} em relação a ${rotuloDoPeriodo(par.base)}${aviso}`;
}
