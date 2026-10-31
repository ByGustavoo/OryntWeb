import type { FrequenciaBackup, SituacaoAgendamento, TipoFrequencia, UnidadeIntervalo } from '@/modelos/backup';
import { pluralizar } from '@/utilitarios/formatacao';

export const MS_POR_HORA = 3_600_000;
const MS_POR_DIA = 24 * MS_POR_HORA;
export const FOLGA_DO_ATRASO_MS = MS_POR_HORA;

export const INTERVALO_MAXIMO: Record<UnidadeIntervalo, number> = { HORAS: 168, DIAS: 90 };
const HORARIO_VALIDO = /^([01]\d|2[0-3]):[0-5]\d$/;

export const tiposFrequencia: TipoFrequencia[] = ['DIARIA', 'SEMANAL', 'MENSAL', 'PERSONALIZADA'];

export const rotuloTipoFrequencia: Record<TipoFrequencia, string> = {
  DIARIA: 'Diário',
  SEMANAL: 'Semanal',
  MENSAL: 'Mensal',
  PERSONALIZADA: 'Personalizado',
};

export const rotuloUnidadeIntervalo: Record<UnidadeIntervalo, string> = { HORAS: 'Horas', DIAS: 'Dias' };

export const diasDaSemana: { valor: number; rotulo: string; naFrase: string }[] = [
  { valor: 1, rotulo: 'Segunda-feira', naFrase: 'Toda segunda-feira' },
  { valor: 2, rotulo: 'Terça-feira', naFrase: 'Toda terça-feira' },
  { valor: 3, rotulo: 'Quarta-feira', naFrase: 'Toda quarta-feira' },
  { valor: 4, rotulo: 'Quinta-feira', naFrase: 'Toda quinta-feira' },
  { valor: 5, rotulo: 'Sexta-feira', naFrase: 'Toda sexta-feira' },
  { valor: 6, rotulo: 'Sábado', naFrase: 'Todo sábado' },
  { valor: 0, rotulo: 'Domingo', naFrase: 'Todo domingo' },
];

export function horarioValido(horario: string): boolean {
  return HORARIO_VALIDO.test(horario);
}

function lerHorario(horario: string): [horas: number, minutos: number] {
  const [horas = '0', minutos = '0'] = horario.split(':');
  return [Number(horas), Number(minutos)];
}

function noHorario(base: Date, horario: string, deslocamentoDias = 0): Date {
  const [horas, minutos] = lerHorario(horario);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + deslocamentoDias, horas, minutos);
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

function noMes(ano: number, mes: number, dia: number, horario: string): Date {
  const [horas, minutos] = lerHorario(horario);
  return new Date(ano, mes, Math.min(dia, ultimoDiaDoMes(ano, mes)), horas, minutos);
}

function passosDoIntervalo(frequencia: Extract<FrequenciaBackup, { tipo: 'PERSONALIZADA' }>, base: Date, instante: Date): number {
  const passoMs = frequencia.intervalo * (frequencia.unidade === 'HORAS' ? MS_POR_HORA : MS_POR_DIA);
  return Math.floor((instante.getTime() - base.getTime()) / passoMs);
}

function noPasso(frequencia: Extract<FrequenciaBackup, { tipo: 'PERSONALIZADA' }>, base: Date, passo: number): Date {
  if (frequencia.unidade === 'HORAS') return new Date(base.getTime() + passo * frequencia.intervalo * MS_POR_HORA);
  return noHorario(base, frequencia.horario, passo * frequencia.intervalo);
}

export function ocorrenciaSeguinte(frequencia: FrequenciaBackup, ancora: Date, depoisDe: Date): Date {
  switch (frequencia.tipo) {
    case 'DIARIA': {
      const hoje = noHorario(depoisDe, frequencia.horario);
      return hoje > depoisDe ? hoje : noHorario(depoisDe, frequencia.horario, 1);
    }
    case 'SEMANAL': {
      const faltam = (frequencia.diaDaSemana - depoisDe.getDay() + 7) % 7;
      const candidata = noHorario(depoisDe, frequencia.horario, faltam);
      return candidata > depoisDe ? candidata : noHorario(depoisDe, frequencia.horario, faltam + 7);
    }
    case 'MENSAL': {
      const candidata = noMes(depoisDe.getFullYear(), depoisDe.getMonth(), frequencia.diaDoMes, frequencia.horario);
      return candidata > depoisDe ? candidata : noMes(depoisDe.getFullYear(), depoisDe.getMonth() + 1, frequencia.diaDoMes, frequencia.horario);
    }
    case 'PERSONALIZADA': {
      const base = noHorario(ancora, frequencia.horario);
      if (base > depoisDe) return base;
      const candidata = noPasso(frequencia, base, passosDoIntervalo(frequencia, base, depoisDe) + 1);
      return candidata > depoisDe ? candidata : noPasso(frequencia, base, passosDoIntervalo(frequencia, base, depoisDe) + 2);
    }
  }
}

export function ocorrenciaAnterior(frequencia: FrequenciaBackup, ancora: Date, ate: Date): Date | null {
  switch (frequencia.tipo) {
    case 'DIARIA': {
      const hoje = noHorario(ate, frequencia.horario);
      return hoje <= ate ? hoje : noHorario(ate, frequencia.horario, -1);
    }
    case 'SEMANAL': {
      const passaram = (ate.getDay() - frequencia.diaDaSemana + 7) % 7;
      const candidata = noHorario(ate, frequencia.horario, -passaram);
      return candidata <= ate ? candidata : noHorario(ate, frequencia.horario, -passaram - 7);
    }
    case 'MENSAL': {
      const candidata = noMes(ate.getFullYear(), ate.getMonth(), frequencia.diaDoMes, frequencia.horario);
      return candidata <= ate ? candidata : noMes(ate.getFullYear(), ate.getMonth() - 1, frequencia.diaDoMes, frequencia.horario);
    }
    case 'PERSONALIZADA': {
      const base = noHorario(ancora, frequencia.horario);
      if (base > ate) return null;
      const candidata = noPasso(frequencia, base, passosDoIntervalo(frequencia, base, ate));
      return candidata <= ate ? candidata : noPasso(frequencia, base, passosDoIntervalo(frequencia, base, ate) - 1);
    }
  }
}

export function proximasOcorrencias(frequencia: FrequenciaBackup, ancora: Date, depoisDe: Date, quantidade: number): Date[] {
  const resultado: Date[] = [];
  let referencia = depoisDe;
  for (let indice = 0; indice < quantidade; indice += 1) {
    referencia = ocorrenciaSeguinte(frequencia, ancora, referencia);
    resultado.push(referencia);
  }
  return resultado;
}

export function ocorrenciasEntre(frequencia: FrequenciaBackup, ancora: Date, depoisDe: Date, ate: Date, limite = 500): Date[] {
  const resultado: Date[] = [];
  let referencia = ocorrenciaSeguinte(frequencia, ancora, depoisDe);
  while (referencia <= ate && resultado.length < limite) {
    resultado.push(referencia);
    referencia = ocorrenciaSeguinte(frequencia, ancora, referencia);
  }
  return resultado;
}

export function descreverFrequencia(frequencia: FrequenciaBackup): string {
  switch (frequencia.tipo) {
    case 'DIARIA':
      return `Todo dia às ${frequencia.horario}`;
    case 'SEMANAL': {
      const dia = diasDaSemana.find((item) => item.valor === frequencia.diaDaSemana);
      return `${dia?.naFrase ?? 'Toda semana'} às ${frequencia.horario}`;
    }
    case 'MENSAL':
      return `Todo dia ${frequencia.diaDoMes} às ${frequencia.horario}`;
    case 'PERSONALIZADA':
      return frequencia.unidade === 'HORAS'
        ? `A cada ${frequencia.intervalo} ${pluralizar(frequencia.intervalo, 'hora', 'horas')}, a partir das ${frequencia.horario}`
        : `A cada ${frequencia.intervalo} ${pluralizar(frequencia.intervalo, 'dia', 'dias')} às ${frequencia.horario}`;
  }
}

interface EstadoDoAgendamento {
  ativo: boolean;
  conexaoId: string | null;
  frequencia: FrequenciaBackup;
  vigenteDesde: string;
  ultimaExecucaoEm: string | null;
}

export function agendamentoAtrasado(agendamento: EstadoDoAgendamento, agora: Date): boolean {
  if (!agendamento.ativo || !agendamento.conexaoId) return false;
  const vigenteDesde = new Date(agendamento.vigenteDesde);
  const prevista = ocorrenciaAnterior(agendamento.frequencia, vigenteDesde, new Date(agora.getTime() - FOLGA_DO_ATRASO_MS));
  if (!prevista || prevista < vigenteDesde) return false;
  return !agendamento.ultimaExecucaoEm || new Date(agendamento.ultimaExecucaoEm) < prevista;
}

export function lembreteDevido(agendamento: EstadoDoAgendamento, agora: Date): Date | null {
  if (!agendamento.ativo || !agendamento.conexaoId) return null;
  const vigenteDesde = new Date(agendamento.vigenteDesde);
  const prevista = ocorrenciaAnterior(agendamento.frequencia, vigenteDesde, agora);
  if (!prevista || prevista < vigenteDesde) return null;
  if (agora.getTime() - prevista.getTime() > FOLGA_DO_ATRASO_MS) return null;
  const atendida = agendamento.ultimaExecucaoEm !== null && new Date(agendamento.ultimaExecucaoEm) >= prevista;
  return atendida ? null : prevista;
}

export function situacaoDoAgendamento(agendamento: EstadoDoAgendamento, agora: Date): SituacaoAgendamento {
  if (!agendamento.conexaoId) return 'SEM_CONEXAO';
  if (!agendamento.ativo) return 'INATIVO';
  return agendamentoAtrasado(agendamento, agora) ? 'ATRASADO' : 'ATIVO';
}
