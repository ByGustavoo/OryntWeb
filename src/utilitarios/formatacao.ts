const LOCALIDADE = 'pt-BR';
const MS_POR_SEGUNDO = 1000;
const MS_POR_MINUTO = 60_000;
const MS_POR_HORA = 3_600_000;
const SEGUNDOS_POR_MINUTO = 60;
const MINUTOS_POR_HORA = 60;
const HORAS_POR_DIA = 24;
const SINAL_DE_MENOS = '−';
const LIMITE_NUMERO_COMPACTO = 1_000_000;
const BYTES_POR_KB = 1024;

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
const formatadorData = new Intl.DateTimeFormat(LOCALIDADE, { day: '2-digit', month: 'short', year: 'numeric' });
const formatadorDataHoraCompleta = new Intl.DateTimeFormat(LOCALIDADE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatarNumero(valor: number): string {
  return formatadorInteiro.format(valor);
}

export function formatarNumeroCompacto(valor: number): string {
  return formatadorCompacto.format(valor);
}

export function formatarQuantidade(valor: number): string {
  return valor >= LIMITE_NUMERO_COMPACTO ? formatarNumeroCompacto(valor) : formatarNumero(valor);
}

export function formatarDecimal(valor: number, casas = 1): string {
  return valor.toLocaleString(LOCALIDADE, { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function formatarMedia(valor: number): string {
  return valor.toLocaleString(LOCALIDADE, { maximumFractionDigits: 1 });
}

export function formatarDuracaoMs(milissegundos: number): string {
  if (milissegundos >= MS_POR_SEGUNDO) return `${formatarDecimal(milissegundos / MS_POR_SEGUNDO, 2)} s`;
  if (milissegundos >= 100) return `${formatarNumero(milissegundos)} ms`;
  return `${formatarDecimal(milissegundos, 1)} ms`;
}

export function formatarDuracaoExtensa(milissegundos: number): string {
  const segundos = Math.round(milissegundos / MS_POR_SEGUNDO);
  if (segundos < SEGUNDOS_POR_MINUTO) return formatarDuracaoMs(milissegundos);
  const minutos = Math.floor(segundos / SEGUNDOS_POR_MINUTO);
  if (minutos < MINUTOS_POR_HORA) return `${minutos} min ${segundos % SEGUNDOS_POR_MINUTO} s`;
  const horas = Math.floor(minutos / MINUTOS_POR_HORA);
  return `${formatarNumero(horas)} h ${minutos % MINUTOS_POR_HORA} min`;
}

export interface MedidaDeDuracao {
  valor: number;
  casas: number;
  unidade: string;
}

function medir(valor: number, casas: number, unidade: string): MedidaDeDuracao {
  const escala = 10 ** casas;
  return { valor: Math.round(valor * escala) / escala, casas, unidade };
}

export function medirDuracao(milissegundos: number): MedidaDeDuracao {
  if (milissegundos >= MS_POR_HORA) return medir(milissegundos / MS_POR_HORA, 1, 'h');
  if (milissegundos >= MS_POR_MINUTO) return medir(milissegundos / MS_POR_MINUTO, 1, 'min');
  if (milissegundos >= MS_POR_SEGUNDO) return medir(milissegundos / MS_POR_SEGUNDO, 2, 's');
  if (milissegundos >= 100) return medir(milissegundos, 0, 'ms');
  return medir(milissegundos, 1, 'ms');
}

export function formatarTamanho(bytes: number): string {
  if (bytes < BYTES_POR_KB) return `${formatarNumero(bytes)} B`;
  if (bytes < BYTES_POR_KB ** 2) return `${formatarDecimal(bytes / BYTES_POR_KB, 1)} kB`;
  if (bytes < BYTES_POR_KB ** 3) return `${formatarDecimal(bytes / BYTES_POR_KB ** 2, 1)} MB`;
  return `${formatarDecimal(bytes / BYTES_POR_KB ** 3, 1)} GB`;
}

export function formatarPercentual(valor: number): string {
  return `${formatarDecimal(valor, 1)}%`;
}

export function formatarVariacao(valor: number): string {
  const sinal = valor > 0 ? '+' : valor < 0 ? SINAL_DE_MENOS : '';
  return `${sinal}${formatarDecimal(Math.abs(valor), 1)}%`;
}

export function formatarComSinal(valor: number, formatar: (absoluto: number) => string): string {
  const sinal = valor > 0 ? '+' : valor < 0 ? SINAL_DE_MENOS : '';
  return `${sinal}${formatar(Math.abs(valor))}`;
}

export function formatarPontosPercentuais(valor: number): string {
  return `${formatarComSinal(valor, (absoluto) => formatarDecimal(absoluto, 1))} p.p.`;
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

export function formatarDataHoraCompleta(instante: Date): string {
  return formatadorDataHoraCompleta.format(instante);
}

export function formatarDataOpcional(instante: string | null): string | null {
  if (!instante || Number.isNaN(new Date(instante).getTime())) return null;
  return formatadorData.format(new Date(instante));
}

export function formatarVersao(versao: string): string {
  return /^\d/.test(versao) ? `v${versao}` : versao;
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

export function iniciarComMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function iniciarComMinuscula(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}
