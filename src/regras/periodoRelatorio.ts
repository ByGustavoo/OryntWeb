import type { PeriodoDashboard } from '@/modelos/dashboard';
import type { GranularidadeRelatorio, PeriodoRelatorio } from '@/modelos/relatorios';

export const MESES_DE_HISTORICO = 12;
export const GRANULARIDADE_INICIAL: GranularidadeRelatorio = 'SEMANA';

export const granularidadesRelatorio: GranularidadeRelatorio[] = ['DIA', 'SEMANA', 'MES'];

export interface PeriodoAnteriorNaFrase {
  comparado: string;
  em: string;
  de: string;
}

export const periodoAnteriorNaFrase: Record<GranularidadeRelatorio, PeriodoAnteriorNaFrase> = {
  DIA: { comparado: 'ao dia anterior', em: 'no dia anterior', de: 'do dia anterior' },
  SEMANA: { comparado: 'à semana anterior', em: 'na semana anterior', de: 'da semana anterior' },
  MES: { comparado: 'ao mês anterior', em: 'no mês anterior', de: 'do mês anterior' },
};

export const granularidadeDoDashboard: Record<PeriodoDashboard, GranularidadeRelatorio> = {
  ULTIMA_HORA: 'DIA',
  ULTIMAS_24_HORAS: 'DIA',
  ULTIMOS_7_DIAS: 'SEMANA',
  ULTIMOS_30_DIAS: 'MES',
};

export const ultimoPeriodoNaFrase: Record<GranularidadeRelatorio, string> = {
  DIA: 'de ontem',
  SEMANA: 'da semana passada',
  MES: 'do mês passado',
};

const DIAS_DA_SEMANA = 7;
const PRIMEIRO_DIA_DA_SEMANA = 1;
const MS_POR_DIA = 86_400_000;
const FORMATO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const NOMES_DOS_DIAS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

const DIAS_NA_FRASE = [
  'no domingo',
  'na segunda-feira',
  'na terça-feira',
  'na quarta-feira',
  'na quinta-feira',
  'na sexta-feira',
  'no sábado',
];

export function lerData(texto: string): Date | null {
  const partes = FORMATO_DATA.exec(texto);
  if (!partes) return null;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]) - 1;
  const dia = Number(partes[3]);
  const data = new Date(ano, mes, dia);
  const existe = data.getFullYear() === ano && data.getMonth() === mes && data.getDate() === dia;
  return existe ? data : null;
}

export function escreverData(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function somarDias(data: Date, dias: number): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

function alinhar(data: Date, granularidade: GranularidadeRelatorio): Date {
  if (granularidade === 'MES') return new Date(data.getFullYear(), data.getMonth(), 1);
  if (granularidade === 'DIA') return somarDias(data, 0);
  const recuo = (data.getDay() - PRIMEIRO_DIA_DA_SEMANA + DIAS_DA_SEMANA) % DIAS_DA_SEMANA;
  return somarDias(data, -recuo);
}

function deslocar(inicio: Date, granularidade: GranularidadeRelatorio, passos: number): Date {
  if (granularidade === 'MES') return new Date(inicio.getFullYear(), inicio.getMonth() + passos, 1);
  return somarDias(inicio, granularidade === 'SEMANA' ? passos * DIAS_DA_SEMANA : passos);
}

function criar(granularidade: GranularidadeRelatorio, inicio: Date): PeriodoRelatorio {
  return { granularidade, inicio: escreverData(inicio) };
}

export function inicioDoPeriodo(periodo: PeriodoRelatorio): Date {
  const inicio = lerData(periodo.inicio);
  if (!inicio) throw new Error(`Período de relatório sem data de início válida: ${periodo.inicio}`);
  return inicio;
}

export function inicioDoSeguinte(periodo: PeriodoRelatorio): Date {
  return deslocar(inicioDoPeriodo(periodo), periodo.granularidade, 1);
}

export function fimDoPeriodo(periodo: PeriodoRelatorio): string {
  return escreverData(somarDias(inicioDoSeguinte(periodo), -1));
}

export function diasDoPeriodo(periodo: PeriodoRelatorio): Date[] {
  const limite = inicioDoSeguinte(periodo).getTime();
  const dias: Date[] = [];
  for (let dia = inicioDoPeriodo(periodo); dia.getTime() < limite; dia = somarDias(dia, 1)) dias.push(dia);
  return dias;
}

export function periodoVizinho(periodo: PeriodoRelatorio, passos: number): PeriodoRelatorio {
  return criar(periodo.granularidade, deslocar(inicioDoPeriodo(periodo), periodo.granularidade, passos));
}

export function distanciaEmPassos(de: PeriodoRelatorio, ate: PeriodoRelatorio): number {
  const partida = inicioDoPeriodo(de);
  const chegada = inicioDoPeriodo(ate);
  if (de.granularidade === 'MES') {
    return (chegada.getFullYear() - partida.getFullYear()) * 12 + chegada.getMonth() - partida.getMonth();
  }
  const dias = Math.round((chegada.getTime() - partida.getTime()) / MS_POR_DIA);
  return de.granularidade === 'SEMANA' ? Math.round(dias / DIAS_DA_SEMANA) : dias;
}

export function ultimoPeriodoFechado(granularidade: GranularidadeRelatorio, hoje: Date): PeriodoRelatorio {
  return criar(granularidade, deslocar(alinhar(hoje, granularidade), granularidade, -1));
}

export function primeiroPeriodoDisponivel(granularidade: GranularidadeRelatorio, hoje: Date): PeriodoRelatorio {
  const limite = new Date(hoje.getFullYear(), hoje.getMonth() - MESES_DE_HISTORICO, 1);
  const alinhado = alinhar(limite, granularidade);
  return criar(granularidade, alinhado.getTime() < limite.getTime() ? deslocar(alinhado, granularidade, 1) : alinhado);
}

export function ehUltimoPeriodoFechado(periodo: PeriodoRelatorio, hoje: Date): boolean {
  return periodo.inicio >= ultimoPeriodoFechado(periodo.granularidade, hoje).inicio;
}

export function ehPrimeiroPeriodoDisponivel(periodo: PeriodoRelatorio, hoje: Date): boolean {
  return periodo.inicio <= primeiroPeriodoDisponivel(periodo.granularidade, hoje).inicio;
}

export function lerGranularidade(valor: unknown): GranularidadeRelatorio | null {
  return granularidadesRelatorio.find((granularidade) => granularidade === valor) ?? null;
}

export function lerPeriodo(valor: unknown, hoje: Date): PeriodoRelatorio | null {
  if (!valor || typeof valor !== 'object') return null;
  const { granularidade: granularidadeLida, inicio } = valor as Record<string, unknown>;
  const granularidade = lerGranularidade(granularidadeLida);
  if (!granularidade || typeof inicio !== 'string') return null;

  const data = lerData(inicio);
  if (!data || escreverData(alinhar(data, granularidade)) !== inicio) return null;

  const foraDoHistorico =
    inicio < primeiroPeriodoDisponivel(granularidade, hoje).inicio ||
    inicio > ultimoPeriodoFechado(granularidade, hoje).inicio;
  return foraDoHistorico ? null : { granularidade, inicio };
}

export function trocarGranularidade(
  periodo: PeriodoRelatorio,
  granularidade: GranularidadeRelatorio,
  hoje: Date,
): PeriodoRelatorio {
  if (granularidade === periodo.granularidade) return periodo;
  const ultimoDia = somarDias(inicioDoSeguinte(periodo), -1);
  const candidato = criar(granularidade, alinhar(ultimoDia, granularidade));
  const primeiro = primeiroPeriodoDisponivel(granularidade, hoje);
  const ultimo = ultimoPeriodoFechado(granularidade, hoje);
  if (candidato.inicio < primeiro.inicio) return primeiro;
  if (candidato.inicio > ultimo.inicio) return ultimo;
  return candidato;
}

function diaDoMes(data: Date): string {
  return data.getDate() === 1 ? '1º' : String(data.getDate());
}

function mesDe(data: Date): string {
  return MESES[data.getMonth()] ?? '';
}

export function dataPorExtenso(data: Date, comAno = true): string {
  const semAno = `${diaDoMes(data)} de ${mesDe(data)}`;
  return comAno ? `${semAno} de ${data.getFullYear()}` : semAno;
}

export function nomeDoDia(data: Date): string {
  return NOMES_DOS_DIAS[data.getDay()] ?? '';
}

export function diaNaFrase(data: Date): string {
  return DIAS_NA_FRASE[data.getDay()] ?? '';
}

export function rotuloDoPeriodo(periodo: PeriodoRelatorio, comAno = true): string {
  const inicio = inicioDoPeriodo(periodo);
  if (periodo.granularidade === 'MES') return comAno ? `${mesDe(inicio)} de ${inicio.getFullYear()}` : mesDe(inicio);
  if (periodo.granularidade === 'DIA') return dataPorExtenso(inicio, comAno);

  const fim = somarDias(inicioDoSeguinte(periodo), -1);
  if (inicio.getFullYear() !== fim.getFullYear()) return `${dataPorExtenso(inicio)} a ${dataPorExtenso(fim)}`;
  if (inicio.getMonth() !== fim.getMonth()) return `${dataPorExtenso(inicio, false)} a ${dataPorExtenso(fim, comAno)}`;
  return `${diaDoMes(inicio)} a ${dataPorExtenso(fim, comAno)}`;
}

function diaEMes(data: Date, comAno: boolean): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return comAno ? `${dia}/${mes}/${data.getFullYear()}` : `${dia}/${mes}`;
}

export function rotuloCurtoDoPeriodo(periodo: PeriodoRelatorio, comAno = false): string {
  const inicio = inicioDoPeriodo(periodo);
  if (periodo.granularidade === 'MES') return rotuloDoPeriodo(periodo, comAno);
  if (periodo.granularidade === 'DIA') return diaEMes(inicio, comAno);

  const fim = somarDias(inicioDoSeguinte(periodo), -1);
  const viraOAno = inicio.getFullYear() !== fim.getFullYear();
  return `${diaEMes(inicio, comAno && viraOAno)} a ${diaEMes(fim, comAno)}`;
}

export function anosDoPeriodo(periodo: PeriodoRelatorio): number[] {
  const inicio = inicioDoPeriodo(periodo).getFullYear();
  const fim = somarDias(inicioDoSeguinte(periodo), -1).getFullYear();
  return inicio === fim ? [inicio] : [inicio, fim];
}

export function periodoNaFrase(periodo: PeriodoRelatorio): string {
  return `${periodo.granularidade === 'SEMANA' ? 'de' : 'em'} ${rotuloDoPeriodo(periodo)}`;
}

export function periodoComoReferencia(periodo: PeriodoRelatorio, comAno = true): string {
  const rotulo = rotuloDoPeriodo(periodo, comAno);
  return periodo.granularidade === 'SEMANA' ? `na semana de ${rotulo}` : `em ${rotulo}`;
}
