import { describe, expect, it } from 'vitest';
import {
  formatarDataOpcional,
  formatarDuracaoMs,
  formatarNumero,
  formatarPercentual,
  formatarTempoRelativo,
  formatarVariacao,
  formatarVersao,
  pluralizar,
} from './formatacao';

describe('formatarNumero', () => {
  it('usa ponto como separador de milhar', () => {
    expect(formatarNumero(1284530)).toBe('1.284.530');
  });
});

describe('formatarDuracaoMs', () => {
  it('mostra uma casa decimal abaixo de 100 ms', () => {
    expect(formatarDuracaoMs(1.8)).toBe('1,8 ms');
    expect(formatarDuracaoMs(12.44)).toBe('12,4 ms');
  });

  it('arredonda para inteiro entre 100 ms e 1 s', () => {
    expect(formatarDuracaoMs(268.4)).toBe('268 ms');
  });

  it('passa para segundos a partir de 1 s', () => {
    expect(formatarDuracaoMs(1840)).toBe('1,84 s');
  });
});

describe('formatarPercentual e formatarVariacao', () => {
  it('usa vírgula decimal', () => {
    expect(formatarPercentual(34.42)).toBe('34,4%');
  });

  it('marca o sentido da variação com sinal', () => {
    expect(formatarVariacao(8.24)).toBe('+8,2%');
    expect(formatarVariacao(-3.1)).toBe('−3,1%');
    expect(formatarVariacao(0)).toBe('0,0%');
  });
});

describe('formatarTempoRelativo', () => {
  const agora = new Date('2026-10-10T15:00:00.000Z');

  it('descreve minutos, horas e dias', () => {
    expect(formatarTempoRelativo('2026-10-10T14:59:40.000Z', agora)).toBe('agora há pouco');
    expect(formatarTempoRelativo('2026-10-10T14:48:00.000Z', agora)).toBe('há 12 min');
    expect(formatarTempoRelativo('2026-10-10T12:00:00.000Z', agora)).toBe('há 3 h');
    expect(formatarTempoRelativo('2026-10-09T12:00:00.000Z', agora)).toBe('há 1 dia');
    expect(formatarTempoRelativo('2026-10-07T12:00:00.000Z', agora)).toBe('há 3 dias');
  });
});

describe('pluralizar', () => {
  it('escolhe o singular só para um', () => {
    expect(pluralizar(1, 'consulta', 'consultas')).toBe('consulta');
    expect(pluralizar(0, 'consulta', 'consultas')).toBe('consultas');
  });
});

describe('formatarVersao', () => {
  it('prefixa com v a versão numérica', () => {
    expect(formatarVersao('1.0.0')).toBe('v1.0.0');
  });

  it('mantém como está o que não começa com número', () => {
    expect(formatarVersao('Simulada')).toBe('Simulada');
  });
});

describe('formatarDataOpcional', () => {
  it('devolve null sem instante ou com instante inválido', () => {
    expect(formatarDataOpcional(null)).toBeNull();
    expect(formatarDataOpcional('')).toBeNull();
    expect(formatarDataOpcional('ontem')).toBeNull();
  });

  it('escreve dia, mês abreviado e ano', () => {
    expect(formatarDataOpcional('2026-09-29T15:00:00')).toBe('29 de set. de 2026');
  });
});
