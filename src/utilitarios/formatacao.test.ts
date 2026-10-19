import { describe, expect, it } from 'vitest';
import {
  formatarComSinal,
  formatarDataHoraCompleta,
  formatarDataOpcional,
  formatarDuracaoExtensa,
  formatarDuracaoMs,
  formatarMedia,
  formatarNumero,
  formatarPercentual,
  formatarPontosPercentuais,
  formatarTamanho,
  formatarTempoRelativo,
  formatarVariacao,
  formatarVersao,
  iniciarComMaiuscula,
  medirDuracao,
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

describe('formatarDuracaoExtensa', () => {
  it('segue a duração curta abaixo de um minuto', () => {
    expect(formatarDuracaoExtensa(12.44)).toBe('12,4 ms');
    expect(formatarDuracaoExtensa(45000)).toBe('45,00 s');
  });

  it('passa para minutos e segundos a partir de um minuto', () => {
    expect(formatarDuracaoExtensa(59600)).toBe('1 min 0 s');
    expect(formatarDuracaoExtensa(771000)).toBe('12 min 51 s');
  });

  it('passa para horas e minutos a partir de uma hora', () => {
    expect(formatarDuracaoExtensa(5160879)).toBe('1 h 26 min');
    expect(formatarDuracaoExtensa(4_000_000_000)).toBe('1.111 h 6 min');
  });
});

describe('medirDuracao', () => {
  it('escolhe a unidade e as casas pelo tamanho da duração', () => {
    expect(medirDuracao(12.44)).toEqual({ valor: 12.4, casas: 1, unidade: 'ms' });
    expect(medirDuracao(193.4)).toEqual({ valor: 193, casas: 0, unidade: 'ms' });
    expect(medirDuracao(1270)).toEqual({ valor: 1.27, casas: 2, unidade: 's' });
    expect(medirDuracao(771000)).toEqual({ valor: 12.9, casas: 1, unidade: 'min' });
    expect(medirDuracao(5160879)).toEqual({ valor: 1.4, casas: 1, unidade: 'h' });
  });

  it('muda de unidade nos mesmos limites de formatarDuracaoMs', () => {
    expect(medirDuracao(99.94).unidade).toBe('ms');
    expect(medirDuracao(999).unidade).toBe('ms');
    expect(medirDuracao(1000)).toEqual({ valor: 1, casas: 2, unidade: 's' });
    expect(medirDuracao(0)).toEqual({ valor: 0, casas: 1, unidade: 'ms' });
  });
});

describe('formatarMedia', () => {
  it('mostra até uma casa decimal, sem zero sobrando', () => {
    expect(formatarMedia(50)).toBe('50');
    expect(formatarMedia(14.2)).toBe('14,2');
    expect(formatarMedia(0.44)).toBe('0,4');
    expect(formatarMedia(1864)).toBe('1.864');
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

describe('formatarDataHoraCompleta', () => {
  it('escreve o dia, o mês por extenso, o ano e a hora', () => {
    const texto = formatarDataHoraCompleta(new Date(2026, 9, 12, 14, 31));
    expect(texto).toContain('12 de outubro de 2026');
    expect(texto).toContain('14:31');
  });
});

describe('formatarTamanho', () => {
  it('mostra bytes abaixo de 1 kB e uma casa decimal a partir dele', () => {
    expect(formatarTamanho(812)).toBe('812 B');
    expect(formatarTamanho(1024)).toBe('1,0 kB');
    expect(formatarTamanho(1536)).toBe('1,5 kB');
    expect(formatarTamanho(3 * 1024 * 1024)).toBe('3,0 MB');
    expect(formatarTamanho(2150 * 1024 * 1024)).toBe('2,1 GB');
  });
});

describe('formatarComSinal', () => {
  it('põe o sinal na frente do valor absoluto formatado', () => {
    expect(formatarComSinal(84, formatarDuracaoMs)).toBe('+84,0 ms');
    expect(formatarComSinal(-255, formatarDuracaoMs)).toBe('−255 ms');
    expect(formatarComSinal(0, formatarNumero)).toBe('0');
  });
});

describe('formatarPontosPercentuais', () => {
  it('escreve a diferença entre dois percentuais em pontos percentuais', () => {
    expect(formatarPontosPercentuais(1.3)).toBe('+1,3 p.p.');
    expect(formatarPontosPercentuais(-0.4)).toBe('−0,4 p.p.');
    expect(formatarPontosPercentuais(0)).toBe('0,0 p.p.');
  });
});

describe('iniciarComMaiuscula', () => {
  it('troca só a primeira letra', () => {
    expect(iniciarComMaiuscula('setembro de 2026')).toBe('Setembro de 2026');
    expect(iniciarComMaiuscula('28/09 a 04/10')).toBe('28/09 a 04/10');
  });
});
