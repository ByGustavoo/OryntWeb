import { describe, expect, it } from 'vitest';
import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import { gerarArquivoDeConsultas, montarTabelaDeConsultas, nomeDoArquivoDeConsultas } from './exportacaoConsultas';
import { filtrosIniciais } from './filtrosConsultas';

const geradoEm = new Date(2026, 9, 12, 15, 30);
const MARCA_DE_ORDEM = String.fromCharCode(0xfeff);

const consultas: ConsultaDetalhadaDTO[] = [
  {
    id: 'q-pedidos',
    sql: 'SELECT * FROM pedidos WHERE status = $1; -- pendentes',
    tipo: 'SELECT',
    tempoMedioMs: 193.4,
    tempoMinimoMs: 50.1,
    tempoMaximoMs: 1270,
    tempoTotalMs: 5160879,
    quantidadeExecucoes: 26685,
    linhasPorExecucao: 14.2,
    percentualTempoTotal: 28.4,
    desempenho: 'MODERADA',
  },
  {
    id: 'q-formula',
    sql: '=cmd()',
    tipo: 'OUTRO',
    tempoMedioMs: 1,
    tempoMinimoMs: 0.5,
    tempoMaximoMs: 2,
    tempoTotalMs: 3,
    quantidadeExecucoes: 3,
    linhasPorExecucao: 0,
    percentualTempoTotal: 0,
    desempenho: 'RAPIDA',
  },
];

function linhasDoCsv(conteudo: string): string[] {
  return conteudo.replace(MARCA_DE_ORDEM, '').trimEnd().split('\r\n');
}

describe('exportação da lista de consultas', () => {
  it('monta uma linha por consulta, com todas as medidas', () => {
    const tabela = montarTabelaDeConsultas(consultas);

    expect(tabela.colunas.map((coluna) => coluna.titulo)).toEqual([
      'Consulta',
      'Tipo de comando',
      'Tempo médio (ms)',
      'Tempo mínimo (ms)',
      'Tempo máximo (ms)',
      'Tempo total (ms)',
      'Execuções',
      'Linhas por execução',
      'Tempo do banco (%)',
      'Desempenho',
    ]);
    expect(tabela.linhas[0]).toEqual([consultas[0]?.sql, 'SELECT', 193.4, 50.1, 1270, 5160879, 26685, 14.2, 28.4, 'Moderada']);
    expect(tabela.linhas).toHaveLength(consultas.length);
  });

  it('dá ao arquivo o período, o dia e as marcas de filtro e de demonstração', () => {
    const opcoes = { filtros: filtrosIniciais, simulada: false, geradoEm };

    expect(nomeDoArquivoDeConsultas(opcoes)).toBe('orynt-consultas-24h-2026-10-12.csv');
    expect(nomeDoArquivoDeConsultas({ ...opcoes, filtros: { ...filtrosIniciais, periodo: 'ULTIMOS_7_DIAS', pagina: 2 } })).toBe(
      'orynt-consultas-7d-2026-10-12.csv',
    );
    expect(nomeDoArquivoDeConsultas({ ...opcoes, filtros: { ...filtrosIniciais, desempenho: 'LENTA' }, simulada: true })).toBe(
      'orynt-consultas-24h-2026-10-12-filtradas-demonstracao.csv',
    );
  });

  it('escreve o CSV no padrão brasileiro, pronto para a planilha', () => {
    const arquivo = gerarArquivoDeConsultas(consultas, { filtros: filtrosIniciais, padrao: 'BRASILEIRO', simulada: false, geradoEm });
    const linhas = linhasDoCsv(arquivo.conteudo);

    expect(arquivo.conteudo.startsWith(MARCA_DE_ORDEM)).toBe(true);
    expect(arquivo.conteudo.endsWith('\r\n')).toBe(true);
    expect(arquivo.tipo).toBe('text/csv;charset=utf-8');
    expect(arquivo.linhas).toBe(2);
    expect(linhas).toHaveLength(3);
    expect(linhas[1]).toBe('"SELECT * FROM pedidos WHERE status = $1; -- pendentes";SELECT;193,4;50,1;1270;5160879;26685;14,2;28,4;Moderada');
  });

  it('troca os separadores no padrão internacional e mantém o nome do arquivo', () => {
    const opcoes = { filtros: filtrosIniciais, simulada: false, geradoEm };
    const arquivo = gerarArquivoDeConsultas(consultas, { ...opcoes, padrao: 'INTERNACIONAL' });

    expect(linhasDoCsv(arquivo.conteudo)[1]).toBe(
      'SELECT * FROM pedidos WHERE status = $1; -- pendentes,SELECT,193.4,50.1,1270,5160879,26685,14.2,28.4,Moderada',
    );
    expect(arquivo.nome).toBe(nomeDoArquivoDeConsultas(opcoes));
  });

  it('neutraliza o SQL que a planilha leria como fórmula', () => {
    const arquivo = gerarArquivoDeConsultas(consultas, { filtros: filtrosIniciais, padrao: 'BRASILEIRO', simulada: false, geradoEm });

    expect(linhasDoCsv(arquivo.conteudo)[2]?.startsWith("'=cmd();Outros;")).toBe(true);
  });

  it('leva o aviso de demonstração para dentro de cada linha', () => {
    const arquivo = gerarArquivoDeConsultas(consultas, { filtros: filtrosIniciais, padrao: 'BRASILEIRO', simulada: true, geradoEm });
    const linhas = linhasDoCsv(arquivo.conteudo);

    expect(linhas[0]?.endsWith(';Origem dos dados')).toBe(true);
    expect(linhas.slice(1).every((linha) => linha.endsWith(';Demonstração'))).toBe(true);
  });
});
