import { describe, expect, it } from 'vitest';
import type { HistoricoConsultaDTO } from '@/modelos/consultas';
import { gerarArquivoDoHistorico, montarTabelaDoHistorico, nomeDoArquivoDoHistorico } from './exportacaoHistorico';

const geradoEm = new Date(2026, 9, 12, 15, 30);
const MARCA_DE_ORDEM = String.fromCharCode(0xfeff);

function historico(mudanca: Partial<HistoricoConsultaDTO> = {}): HistoricoConsultaDTO {
  return {
    periodo: 'ULTIMAS_24_HORAS',
    consulta: {
      id: 'q-pedidos',
      sql: 'SELECT * FROM pedidos WHERE status = $1; -- pendentes',
      tipo: 'SELECT',
      tempoMedioMs: 193.4,
      tempoMinimoMs: 50.1,
      tempoMaximoMs: 1270,
      tempoTotalMs: 77360,
      quantidadeExecucoes: 400,
      linhasPorExecucao: 14.2,
      percentualTempoTotal: 28.4,
      desempenho: 'MODERADA',
    },
    trocasDePlano: [],
    variacaoExecucoes: 3.2,
    variacaoTempoMedio: -4.1,
    posicao: 2,
    totalDoPeriodo: 42,
    idAnterior: 'q-a',
    idSeguinte: null,
    pontos: [
      { instante: new Date(2026, 9, 11, 23, 0).toISOString(), quantidadeExecucoes: 100, tempoMedioMs: 180.5, tempoMaximoMs: 1270 },
      { instante: new Date(2026, 9, 12, 0, 0).toISOString(), quantidadeExecucoes: 300, tempoMedioMs: 197.7, tempoMaximoMs: 610 },
      { instante: new Date(2026, 9, 12, 1, 0).toISOString(), quantidadeExecucoes: 0, tempoMedioMs: null, tempoMaximoMs: null },
    ],
    ...mudanca,
  };
}

describe('tabela do histórico de uma consulta', () => {
  it('tem uma linha por intervalo, com o início, as três medidas e a consulta', () => {
    const tabela = montarTabelaDoHistorico(historico());

    expect(tabela.colunas.map((coluna) => coluna.titulo)).toEqual([
      'Início do intervalo',
      'Execuções',
      'Tempo médio (ms)',
      'Tempo máximo (ms)',
      'Consulta',
    ]);
    expect(tabela.linhas).toEqual([
      ['2026-10-11 23:00', 100, 180.5, 1270, 'SELECT * FROM pedidos WHERE status = $1; -- pendentes'],
      ['2026-10-12 00:00', 300, 197.7, 610, 'SELECT * FROM pedidos WHERE status = $1; -- pendentes'],
      ['2026-10-12 01:00', 0, null, null, 'SELECT * FROM pedidos WHERE status = $1; -- pendentes'],
    ]);
  });

  it('escreve só a data quando cada intervalo é um dia', () => {
    const tabela = montarTabelaDoHistorico(
      historico({
        periodo: 'ULTIMOS_30_DIAS',
        pontos: [{ instante: new Date(2026, 9, 11).toISOString(), quantidadeExecucoes: 5, tempoMedioMs: 1, tempoMaximoMs: 2 }],
      }),
    );

    expect(tabela.linhas[0]?.[0]).toBe('2026-10-11');
  });
});

describe('arquivo do histórico de uma consulta', () => {
  it('leva no nome o período, o dia e o aviso de demonstração', () => {
    expect(nomeDoArquivoDoHistorico(historico(), false, geradoEm)).toBe('orynt-historico-consulta-24h-2026-10-12.csv');
    expect(nomeDoArquivoDoHistorico(historico({ periodo: 'ULTIMOS_7_DIAS' }), true, geradoEm)).toBe(
      'orynt-historico-consulta-7d-2026-10-12-demonstracao.csv',
    );
  });

  it('escreve o CSV no padrão brasileiro, com a célula vazia no intervalo sem execuções', () => {
    const arquivo = gerarArquivoDoHistorico(historico(), { padrao: 'BRASILEIRO', simulada: false, geradoEm });

    expect(arquivo.tipo).toBe('text/csv;charset=utf-8');
    expect(arquivo.linhas).toBe(3);
    expect(arquivo.conteudo).toBe(
      `${MARCA_DE_ORDEM}${[
        'Início do intervalo;Execuções;Tempo médio (ms);Tempo máximo (ms);Consulta',
        '2026-10-11 23:00;100;180,5;1270;"SELECT * FROM pedidos WHERE status = $1; -- pendentes"',
        '2026-10-12 00:00;300;197,7;610;"SELECT * FROM pedidos WHERE status = $1; -- pendentes"',
        '2026-10-12 01:00;0;;;"SELECT * FROM pedidos WHERE status = $1; -- pendentes"',
      ].join('\r\n')}\r\n`,
    );
  });

  it('usa vírgula e ponto decimal no padrão internacional e marca a origem dos dados demonstrativos', () => {
    const arquivo = gerarArquivoDoHistorico(historico(), { padrao: 'INTERNACIONAL', simulada: true, geradoEm });
    const [cabecalho, primeira] = arquivo.conteudo.replace(MARCA_DE_ORDEM, '').split('\r\n');

    expect(arquivo.nome).toBe('orynt-historico-consulta-24h-2026-10-12-demonstracao.csv');
    expect(cabecalho).toBe('Início do intervalo,Execuções,Tempo médio (ms),Tempo máximo (ms),Consulta,Origem dos dados');
    expect(primeira).toBe('2026-10-11 23:00,100,180.5,1270,SELECT * FROM pedidos WHERE status = $1; -- pendentes,Demonstração');
  });

  it('neutraliza o SQL que uma planilha leria como fórmula', () => {
    const base = historico();
    const arquivo = gerarArquivoDoHistorico(historico({ consulta: { ...base.consulta, sql: '=cmd()' } }), {
      padrao: 'BRASILEIRO',
      simulada: false,
      geradoEm,
    });

    expect(arquivo.conteudo.split('\r\n')[1]).toBe("2026-10-11 23:00;100;180,5;1270;'=cmd()");
  });
});
