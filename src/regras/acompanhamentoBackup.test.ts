import { describe, expect, it } from 'vitest';
import {
  TEMPO_NA_BARRA_MS,
  descreverAndamento,
  descreverEntrega,
  descreverPasso,
  descreverResultado,
  fraseDoResumo,
  pedeConfirmacaoAoSair,
  resumirAcompanhamento,
  resumirDesfecho,
  situacaoDosPassos,
  tempoNaBarraMs,
} from './acompanhamentoBackup';

describe('passos da execução', () => {
  it('mostra feito, atual e pendente enquanto roda', () => {
    expect(situacaoDosPassos({ etapa: 'EXPORTANDO', situacao: 'EM_ANDAMENTO' })).toEqual(['FEITO', 'FEITO', 'ATUAL', 'PENDENTE']);
  });

  it('marca onde parou quando falha ou é cancelado', () => {
    expect(situacaoDosPassos({ etapa: 'CONECTANDO', situacao: 'FALHOU' })).toEqual(['FALHOU', 'PENDENTE', 'PENDENTE', 'PENDENTE']);
    expect(situacaoDosPassos({ etapa: 'EXPORTANDO', situacao: 'CANCELADO' })).toEqual(['FEITO', 'FEITO', 'FALHOU', 'PENDENTE']);
  });

  it('completa todos ao concluir', () => {
    expect(situacaoDosPassos({ etapa: 'FINALIZANDO', situacao: 'CONCLUIDO' })).toEqual(['FEITO', 'FEITO', 'FEITO', 'FEITO']);
  });

  it('descreve a etapa com o que a API informou', () => {
    expect(descreverPasso({ etapa: 'LENDO_ESTRUTURA' })).toBe('Etapa 2 de 4: lendo a estrutura');
  });

  it('resume o andamento com o percentual, ou com a etapa quando não dá para medir', () => {
    expect(descreverAndamento({ etapa: 'EXPORTANDO', progresso: 42 })).toBe('42% · exportando os objetos');
    expect(descreverAndamento({ etapa: 'EXPORTANDO', progresso: null })).toBe('Etapa 3 de 4: exportando os objetos');
  });
});

describe('desfecho no cartão', () => {
  const concluido = { situacao: 'CONCLUIDO', motivoDaFalha: null, tamanhoBytes: null } as const;

  it('diz onde o arquivo está', () => {
    expect(resumirDesfecho(concluido, 'PARA_BAIXAR', { modo: 'NAVEGADOR' })).toBe('Pronto para baixar');
    expect(resumirDesfecho(concluido, 'NA_PASTA', { modo: 'PASTA', pasta: 'Backups' })).toBe('Salvo na pasta Backups');
    expect(resumirDesfecho(concluido, 'NA_PASTA', null)).toBe('Salvo na pasta escolhida');
  });

  it('acrescenta o tamanho quando a API informou', () => {
    expect(resumirDesfecho({ ...concluido, tamanhoBytes: 1024 }, 'BAIXADO', { modo: 'NAVEGADOR' })).toMatch(/^Enviado à pasta de downloads · 1/);
  });

  it('traz o motivo da falha e diz que nada foi salvo no cancelamento', () => {
    expect(resumirDesfecho({ situacao: 'FALHOU', motivoDaFalha: 'A senha mudou.', tamanhoBytes: null }, 'SEM_ARQUIVO', null)).toBe('Falhou. A senha mudou.');
    expect(resumirDesfecho({ situacao: 'FALHOU', motivoDaFalha: null, tamanhoBytes: null }, 'SEM_ARQUIVO', null)).toContain('interrompido');
    expect(resumirDesfecho({ situacao: 'CANCELADO', motivoDaFalha: null, tamanhoBytes: null }, 'SEM_ARQUIVO', null)).toBe('Cancelado. Nenhum arquivo foi salvo.');
  });
});

describe('onde o arquivo foi parar', () => {
  it('nunca fala em servidor', () => {
    const textos = (['AGUARDANDO', 'RECEBENDO', 'PARA_BAIXAR', 'BAIXADO', 'NA_PASTA', 'NA_OUTRA_ABA', 'SEM_ARQUIVO'] as const).map((entrega) =>
      descreverEntrega(entrega, { modo: 'NAVEGADOR' }),
    );
    expect(textos.join(' ')).not.toMatch(/servidor/i);
  });

  it('cita o nome da pasta, que é tudo o que o navegador revela', () => {
    expect(descreverEntrega('NA_PASTA', { modo: 'PASTA', pasta: 'Backups' })).toBe('Salvo na pasta Backups.');
    expect(descreverEntrega('AGUARDANDO', { modo: 'PASTA', pasta: 'Backups' })).toContain('Pasta Backups');
  });

  it('avisa que o arquivo pendente só dura enquanto a aba está aberta', () => {
    expect(descreverEntrega('PARA_BAIXAR', { modo: 'NAVEGADOR' })).toContain('enquanto esta aba estiver aberta');
  });
});

describe('resultado', () => {
  it('traz o motivo da falha, quando existe', () => {
    expect(descreverResultado({ banco: 'loja', situacao: 'FALHOU', motivoDaFalha: 'A senha mudou.', tamanhoBytes: null })).toBe('A senha mudou.');
    expect(descreverResultado({ banco: 'loja', situacao: 'FALHOU', motivoDaFalha: null, tamanhoBytes: null })).toContain('interrompido');
  });

  it('cita o banco ao concluir', () => {
    expect(descreverResultado({ banco: 'financeiro', situacao: 'CONCLUIDO', motivoDaFalha: null, tamanhoBytes: null })).toBe('O backup do banco financeiro foi concluído com sucesso.');
  });
});

describe('tempo na barra', () => {
  it('não some sozinho enquanto o arquivo espera ser baixado, nem quando falha', () => {
    expect(tempoNaBarraMs({ situacao: 'CONCLUIDO' }, 'PARA_BAIXAR')).toBeNull();
    expect(tempoNaBarraMs({ situacao: 'FALHOU' }, 'SEM_ARQUIVO')).toBeNull();
    expect(tempoNaBarraMs({ situacao: 'EM_ANDAMENTO' }, 'AGUARDANDO')).toBeNull();
  });

  it('sai depois de um tempo quando o arquivo já está salvo', () => {
    expect(tempoNaBarraMs({ situacao: 'CONCLUIDO' }, 'NA_PASTA')).toBe(TEMPO_NA_BARRA_MS);
    expect(tempoNaBarraMs({ situacao: 'CONCLUIDO' }, 'BAIXADO')).toBe(TEMPO_NA_BARRA_MS);
  });
});

describe('sair da página', () => {
  it('pede confirmação quando algo se perderia', () => {
    expect(pedeConfirmacaoAoSair({ situacao: 'EM_ANDAMENTO' }, 'AGUARDANDO', false)).toBe(true);
    expect(pedeConfirmacaoAoSair({ situacao: 'CONCLUIDO' }, 'PARA_BAIXAR', false)).toBe(true);
  });

  it('não pede quando nada se perde', () => {
    expect(pedeConfirmacaoAoSair({ situacao: 'CONCLUIDO' }, 'BAIXADO', false)).toBe(false);
    expect(pedeConfirmacaoAoSair({ situacao: 'FALHOU' }, 'SEM_ARQUIVO', false)).toBe(false);
    expect(pedeConfirmacaoAoSair({ situacao: 'EM_ANDAMENTO' }, 'AGUARDANDO', true)).toBe(false);
  });
});

describe('resumo de vários backups', () => {
  it('conta cada situação sem inventar um percentual geral', () => {
    const resumo = resumirAcompanhamento([{ situacao: 'EM_ANDAMENTO' }, { situacao: 'EM_ANDAMENTO' }, { situacao: 'CONCLUIDO' }, { situacao: 'FALHOU' }]);
    expect(resumo).toEqual({ emAndamento: 2, concluidos: 1, comFalha: 1 });
    expect(fraseDoResumo(resumo, 1)).toBe('2 backups em andamento · 1 concluído · 1 com falha · 1 lembrete');
  });
});
