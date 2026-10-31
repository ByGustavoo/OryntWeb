import { describe, expect, it } from 'vitest';
import type { FrequenciaBackup } from '@/modelos/backup';
import {
  agendamentoAtrasado,
  descreverFrequencia,
  lembreteDevido,
  ocorrenciaAnterior,
  ocorrenciaSeguinte,
  ocorrenciasEntre,
  proximasOcorrencias,
  situacaoDoAgendamento,
} from './frequenciaBackup';

const quinta = new Date(2026, 9, 29, 10, 0);

describe('ocorrenciaSeguinte', () => {
  it('passa para o dia seguinte quando o horário de hoje já foi', () => {
    const diaria: FrequenciaBackup = { tipo: 'DIARIA', horario: '02:00' };
    expect(ocorrenciaSeguinte(diaria, quinta, quinta)).toEqual(new Date(2026, 9, 30, 2, 0));
    expect(ocorrenciaSeguinte({ tipo: 'DIARIA', horario: '23:00' }, quinta, quinta)).toEqual(new Date(2026, 9, 29, 23, 0));
  });

  it('acha o próximo dia da semana e pula uma semana quando já passou', () => {
    expect(ocorrenciaSeguinte({ tipo: 'SEMANAL', diaDaSemana: 0, horario: '03:00' }, quinta, quinta)).toEqual(new Date(2026, 10, 1, 3, 0));
    expect(ocorrenciaSeguinte({ tipo: 'SEMANAL', diaDaSemana: 4, horario: '09:00' }, quinta, quinta)).toEqual(new Date(2026, 10, 5, 9, 0));
  });

  it('roda no último dia dos meses que não têm o dia escolhido', () => {
    const mensal: FrequenciaBackup = { tipo: 'MENSAL', diaDoMes: 31, horario: '01:00' };
    expect(ocorrenciaSeguinte(mensal, quinta, new Date(2026, 10, 1))).toEqual(new Date(2026, 10, 30, 1, 0));
    expect(ocorrenciaSeguinte(mensal, quinta, new Date(2027, 1, 1))).toEqual(new Date(2027, 1, 28, 1, 0));
  });

  it('conta o intervalo personalizado a partir da âncora', () => {
    const horas: FrequenciaBackup = { tipo: 'PERSONALIZADA', intervalo: 6, unidade: 'HORAS', horario: '00:30' };
    expect(ocorrenciaSeguinte(horas, quinta, quinta)).toEqual(new Date(2026, 9, 29, 12, 30));
    const dias: FrequenciaBackup = { tipo: 'PERSONALIZADA', intervalo: 3, unidade: 'DIAS', horario: '02:00' };
    expect(ocorrenciaSeguinte(dias, quinta, new Date(2026, 9, 29, 1, 0))).toEqual(new Date(2026, 9, 29, 2, 0));
    expect(ocorrenciaSeguinte(dias, quinta, quinta)).toEqual(new Date(2026, 10, 1, 2, 0));
  });
});

describe('ocorrenciaAnterior', () => {
  it('é o espelho da seguinte', () => {
    expect(ocorrenciaAnterior({ tipo: 'DIARIA', horario: '02:00' }, quinta, quinta)).toEqual(new Date(2026, 9, 29, 2, 0));
    expect(ocorrenciaAnterior({ tipo: 'SEMANAL', diaDaSemana: 0, horario: '03:00' }, quinta, quinta)).toEqual(new Date(2026, 9, 25, 3, 0));
    expect(ocorrenciaAnterior({ tipo: 'MENSAL', diaDoMes: 31, horario: '01:00' }, quinta, new Date(2026, 10, 15))).toEqual(new Date(2026, 9, 31, 1, 0));
  });

  it('não existe antes da âncora de um intervalo personalizado', () => {
    expect(ocorrenciaAnterior({ tipo: 'PERSONALIZADA', intervalo: 6, unidade: 'HORAS', horario: '12:00' }, quinta, quinta)).toBeNull();
  });
});

describe('listas de ocorrências', () => {
  it('devolve as próximas em ordem', () => {
    const [primeira, segunda, terceira] = proximasOcorrencias({ tipo: 'DIARIA', horario: '02:00' }, quinta, quinta, 3);
    expect(primeira).toEqual(new Date(2026, 9, 30, 2, 0));
    expect(segunda).toEqual(new Date(2026, 9, 31, 2, 0));
    expect(terceira).toEqual(new Date(2026, 10, 1, 2, 0));
  });

  it('respeita o intervalo aberto no início e fechado no fim', () => {
    const diaria: FrequenciaBackup = { tipo: 'DIARIA', horario: '02:00' };
    expect(ocorrenciasEntre(diaria, quinta, new Date(2026, 9, 29, 2, 0), new Date(2026, 9, 31, 2, 0))).toHaveLength(2);
  });
});

describe('descreverFrequencia', () => {
  it('escreve cada frequência em português', () => {
    expect(descreverFrequencia({ tipo: 'DIARIA', horario: '02:00' })).toBe('Todo dia às 02:00');
    expect(descreverFrequencia({ tipo: 'SEMANAL', diaDaSemana: 0, horario: '03:00' })).toBe('Todo domingo às 03:00');
    expect(descreverFrequencia({ tipo: 'SEMANAL', diaDaSemana: 2, horario: '03:00' })).toBe('Toda terça-feira às 03:00');
    expect(descreverFrequencia({ tipo: 'PERSONALIZADA', intervalo: 1, unidade: 'DIAS', horario: '03:00' })).toBe('A cada 1 dia às 03:00');
  });
});

describe('situação do agendamento', () => {
  const base = {
    ativo: true,
    conexaoId: 'c1',
    frequencia: { tipo: 'DIARIA', horario: '02:00' } as FrequenciaBackup,
    vigenteDesde: new Date(2026, 9, 20).toISOString(),
    ultimaExecucaoEm: new Date(2026, 9, 29, 2, 0).toISOString(),
  };

  it('fica ativo quando a última ocorrência prevista rodou', () => {
    expect(situacaoDoAgendamento(base, quinta)).toBe('ATIVO');
  });

  it('fica atrasado quando a ocorrência prevista não rodou', () => {
    expect(situacaoDoAgendamento({ ...base, ultimaExecucaoEm: new Date(2026, 9, 27, 2, 0).toISOString() }, quinta)).toBe('ATRASADO');
  });

  it('dá uma hora de folga antes de acusar o atraso', () => {
    const agora = new Date(2026, 9, 29, 2, 30);
    expect(agendamentoAtrasado({ ...base, ultimaExecucaoEm: new Date(2026, 9, 28, 2, 0).toISOString() }, agora)).toBe(false);
  });

  it('não cobra o que estava previsto antes de o agendamento valer', () => {
    expect(agendamentoAtrasado({ ...base, vigenteDesde: new Date(2026, 9, 29, 9, 0).toISOString(), ultimaExecucaoEm: null }, quinta)).toBe(false);
  });

  it('dá prioridade à falta de conexão e depois à desativação', () => {
    expect(situacaoDoAgendamento({ ...base, conexaoId: null, ativo: false }, quinta)).toBe('SEM_CONEXAO');
    expect(situacaoDoAgendamento({ ...base, ativo: false, ultimaExecucaoEm: null }, quinta)).toBe('INATIVO');
  });
});

describe('lembreteDevido', () => {
  const base = {
    ativo: true,
    conexaoId: 'c1',
    frequencia: { tipo: 'DIARIA', horario: '02:00' } as FrequenciaBackup,
    vigenteDesde: new Date(2026, 9, 20).toISOString(),
    ultimaExecucaoEm: new Date(2026, 9, 28, 2, 0).toISOString(),
  };

  it('avisa quando a hora chega e o backup ainda não foi feito', () => {
    expect(lembreteDevido(base, new Date(2026, 9, 29, 2, 10))).toEqual(new Date(2026, 9, 29, 2, 0));
  });

  it('deixa de avisar depois da folga, quando o agendamento passa a atrasado', () => {
    const agora = new Date(2026, 9, 29, 3, 30);
    expect(lembreteDevido(base, agora)).toBeNull();
    expect(agendamentoAtrasado(base, agora)).toBe(true);
  });

  it('não avisa o que já foi feito, nem o que está desativado ou sem conexão', () => {
    const agora = new Date(2026, 9, 29, 2, 10);
    expect(lembreteDevido({ ...base, ultimaExecucaoEm: new Date(2026, 9, 29, 2, 5).toISOString() }, agora)).toBeNull();
    expect(lembreteDevido({ ...base, ativo: false }, agora)).toBeNull();
    expect(lembreteDevido({ ...base, conexaoId: null }, agora)).toBeNull();
  });

  it('não cobra o que estava previsto antes de o agendamento valer', () => {
    expect(lembreteDevido({ ...base, vigenteDesde: new Date(2026, 9, 29, 2, 5).toISOString() }, new Date(2026, 9, 29, 2, 10))).toBeNull();
  });
});
