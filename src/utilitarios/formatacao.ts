const LOCALIDADE = 'pt-BR';
const MS_POR_SEGUNDO = 1000;
const MS_POR_MINUTO = 60_000;
const MINUTOS_POR_HORA = 60;
const HORAS_POR_DIA = 24;
const SINAL_DE_MENOS = '−';

const formatadorInteiro = new Intl.NumberFormat(LOCALIDADE, { maximumFractionDigits: 0 });
const formatadorCompacto = new Intl.NumberFormat(LOCALIDADE, { notation: 'compact', maximumFractionDigits: 1 });
const formatadorHorario = new Intl.DateTimeFormat(LOCALIDADE, { hour: '2-digit', minute: '2-digit' });
const formatadorDiaMes = new Intl.DateTimeFormat(LOCALIDADE, { day: '2-digit', month: '2-digit' });
const formatadorDiaSemana = new Intl.DateTimeFormat(LOCALIDADE, { weekday: 'short' });
const formatadorInstante = new Intl.DateTimeFormat(LOCALIDADE, {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatarNumero(valor: number): string {
  return formatadorInteiro.format(valor);
}

export function formatarNumeroCompacto(valor: number): string {
  return formatadorCompacto.format(valor);
}

export function formatarDecimal(valor: number, casas = 1): string {
  return valor.toLocaleString(LOCALIDADE, { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function formatarDuracaoMs(milissegundos: number): string {
  if (milissegundos >= MS_POR_SEGUNDO) return `${formatarDecimal(milissegundos / MS_POR_SEGUNDO, 2)} s`;
  if (milissegundos >= 100) return `${formatarNumero(milissegundos)} ms`;
  return `${formatarDecimal(milissegundos, 1)} ms`;
}

export function formatarPercentual(valor: number): string {
  return `${formatarDecimal(valor, 1)}%`;
}

export function formatarVariacao(valor: number): string {
  const sinal = valor > 0 ? '+' : valor < 0 ? SINAL_DE_MENOS : '';
  return `${sinal}${formatarDecimal(Math.abs(valor), 1)}%`;
}

export function formatarHorario(instante: string): string {
  return formatadorHorario.format(new Date(instante));
}

export function formatarDiaMes(instante: string): string {
  return formatadorDiaMes.format(new Date(instante));
}

export function formatarDiaSemana(instante: string): string {
  return formatadorDiaSemana.format(new Date(instante)).replace('.', '');
}

export function formatarInstante(instante: string): string {
  return formatadorInstante.format(new Date(instante)).replace('.', '');
}

export function formatarTempoRelativo(instante: string, agora: Date = new Date()): string {
  const minutos = Math.floor((agora.getTime() - new Date(instante).getTime()) / MS_POR_MINUTO);
  if (minutos < 1) return 'agora há pouco';
  if (minutos < MINUTOS_POR_HORA) return `há ${minutos} min`;
  const horas = Math.floor(minutos / MINUTOS_POR_HORA);
  if (horas < HORAS_POR_DIA) return `há ${horas} h`;
  const dias = Math.floor(horas / HORAS_POR_DIA);
  return `há ${dias} ${pluralizar(dias, 'dia', 'dias')}`;
}

export function pluralizar(quantidade: number, singular: string, plural: string): string {
  return quantidade === 1 ? singular : plural;
}
