import { describe, expect, it } from 'vitest';
import type { ResumoRelatorioDTO } from '@/modelos/relatorios';
import {
  contarLinhas,
  escreverCsv,
  escreverTabelaParaColar,
  gerarArquivos,
  gerarTextoParaColar,
  montarTabela,
  nomeDoArquivo,
  previaDoArquivo,
} from './exportacaoRelatorio';
import type { OpcoesExportacao, TabelaExportacao } from './exportacaoRelatorio';

const MARCA_DE_ORDEM = String.fromCharCode(0xfeff);

function criarResumo(mudancas: Partial<ResumoRelatorioDTO> = {}): ResumoRelatorioDTO {
  return {
    granularidade: 'SEMANA',
    inicio: '2026-09-28',
    fim: '2026-10-04',
    indicadores: {
      totalConsultas: 2_912_300,
      variacaoTotalConsultas: -2.5,
      tempoMedioMs: 37.2,
      variacaoTempoMedio: -3.9,
      consultasLentas: 3,
      consultasDistintas: 42,
      picoConexoes: 45,
      instantePicoConexoes: new Date(2026, 8, 28, 14, 30).toISOString(),
      limiteConexoes: 100,
    },
    evolucao: [
      { instante: new Date(2026, 8, 28).toISOString(), consultas: 464_512, tempoMedioMs: 36.1 },
      { instante: new Date(2026, 8, 29).toISOString(), consultas: 471_000, tempoMedioMs: 37 },
    ],
    desempenho: [
      { desempenho: 'RAPIDA', consultasDistintas: 36, quantidadeExecucoes: 2_542_000, percentualExecucoes: 87.3, percentualTempoTotal: 13.4 },
      { desempenho: 'MODERADA', consultasDistintas: 3, quantidadeExecucoes: 355_300, percentualExecucoes: 12.2, percentualTempoTotal: 73.7 },
      { desempenho: 'LENTA', consultasDistintas: 3, quantidadeExecucoes: 15_000, percentualExecucoes: 0.5, percentualTempoTotal: 12.9 },
    ],
    consultas: [
      {
        id: 'q-usuarios',
        sql: 'SELECT id, email FROM usuarios WHERE lower(email) = lower($1)',
        tempoMedioMs: 259,
        quantidadeExecucoes: 145_608,
        percentualTempoTotal: 34.7,
        desempenho: 'MODERADA',
        variacaoTempoMedio: -5.1,
      },
      {
        id: 'q-ranking',
        sql: 'SELECT a | b FROM "t"; SELECT 2',
        tempoMedioMs: 1970.5,
        quantidadeExecucoes: 2_621,
        percentualTempoTotal: 4.7,
        desempenho: 'LENTA',
        variacaoTempoMedio: null,
      },
    ],
    ...mudancas,
  };
}

function criarOpcoes(mudancas: Partial<OpcoesExportacao> = {}): OpcoesExportacao {
  return {
    blocos: ['EVOLUCAO', 'CONSULTAS', 'DESEMPENHO', 'INDICADORES'],
    formato: 'CSV',
    padrao: 'BRASILEIRO',
    nomeConexao: 'Loja',
    simulada: false,
    geradoEm: '2026-10-11T19:30:00.000Z',
    ...mudancas,
  };
}

function linhasDoCsv(conteudo: string): string[] {
  return conteudo.replace(MARCA_DE_ORDEM, '').trimEnd().split('\r\n');
}

describe('tabelas do relatório', () => {
  it('monta uma linha por ponto, faixa, consulta ou indicador', () => {
    const resumo = criarResumo();

    expect(contarLinhas(resumo, 'EVOLUCAO')).toBe(2);
    expect(contarLinhas(resumo, 'DESEMPENHO')).toBe(3);
    expect(contarLinhas(resumo, 'CONSULTAS')).toBe(2);
    expect(contarLinhas(resumo, 'INDICADORES')).toBe(6);
  });

  it('escreve o dia como data e a hora como data e hora, no fuso local', () => {
    const dia = criarResumo({
      granularidade: 'DIA',
      inicio: '2026-10-10',
      fim: '2026-10-10',
      evolucao: [{ instante: new Date(2026, 9, 10, 9).toISOString(), consultas: 10, tempoMedioMs: 30 }],
    });

    expect(montarTabela(criarResumo(), 'EVOLUCAO').colunas[0]?.titulo).toBe('Dia');
    expect(montarTabela(criarResumo(), 'EVOLUCAO').linhas[0]?.[0]).toBe('2026-09-28');
    expect(montarTabela(dia, 'EVOLUCAO').colunas[0]?.titulo).toBe('Hora');
    expect(montarTabela(dia, 'EVOLUCAO').linhas[0]?.[0]).toBe('2026-10-10 09:00');
  });
});

describe('CSV', () => {
  it('usa ponto e vírgula e vírgula decimal no padrão brasileiro', () => {
    const [cabecalho, primeira] = linhasDoCsv(escreverCsv(montarTabela(criarResumo(), 'EVOLUCAO'), 'BRASILEIRO'));

    expect(cabecalho).toBe('Dia;Consultas;Tempo médio (ms)');
    expect(primeira).toBe('2026-09-28;464512;36,1');
  });

  it('usa vírgula e ponto decimal no padrão internacional', () => {
    const [cabecalho, primeira] = linhasDoCsv(escreverCsv(montarTabela(criarResumo(), 'EVOLUCAO'), 'INTERNACIONAL'));

    expect(cabecalho).toBe('Dia,Consultas,Tempo médio (ms)');
    expect(primeira).toBe('2026-09-28,464512,36.1');
  });

  it('começa com a marca de ordem de bytes e termina cada linha com CRLF', () => {
    const conteudo = escreverCsv(montarTabela(criarResumo(), 'DESEMPENHO'), 'BRASILEIRO');

    expect(conteudo.startsWith(MARCA_DE_ORDEM)).toBe(true);
    expect(conteudo.endsWith('\r\n')).toBe(true);
    expect(conteudo.split('\r\n')).toHaveLength(5);
  });

  it('põe entre aspas o campo que tem o separador ou aspas, dobrando as aspas', () => {
    const brasileiro = linhasDoCsv(escreverCsv(montarTabela(criarResumo(), 'CONSULTAS'), 'BRASILEIRO'));
    const internacional = linhasDoCsv(escreverCsv(montarTabela(criarResumo(), 'CONSULTAS'), 'INTERNACIONAL'));

    expect(brasileiro[1]).toBe('SELECT id, email FROM usuarios WHERE lower(email) = lower($1);259;-5,1;145608;34,7;Moderada');
    expect(brasileiro[2]).toBe('"SELECT a | b FROM ""t""; SELECT 2";1970,5;;2621;4,7;Lenta');
    expect(internacional[1]).toBe('"SELECT id, email FROM usuarios WHERE lower(email) = lower($1)",259,-5.1,145608,34.7,Moderada');
  });

  it('deixa vazia a célula sem valor', () => {
    const linhas = linhasDoCsv(escreverCsv(montarTabela(criarResumo(), 'INDICADORES'), 'BRASILEIRO'));

    expect(linhas[1]).toBe('Consultas executadas;2912300;-2,5');
    expect(linhas[3]).toBe('Consultas lentas;3;');
  });

  it('neutraliza o texto que uma planilha leria como fórmula, sem mexer em número negativo', () => {
    const tabela: TabelaExportacao = {
      bloco: 'CONSULTAS',
      titulo: 'Consultas',
      colunas: [
        { titulo: 'Consulta', tipo: 'CODIGO' },
        { titulo: 'Variação (%)', tipo: 'DECIMAL' },
      ],
      linhas: [
        ['=HYPERLINK("http://exemplo")', -3.9],
        ['@soma', 2],
        ['-- comentário', null],
      ],
    };
    const linhas = linhasDoCsv(escreverCsv(tabela, 'BRASILEIRO'));

    expect(linhas[1]).toBe('"\'=HYPERLINK(""http://exemplo"")";-3,9');
    expect(linhas[2]).toBe("'@soma;2");
    expect(linhas[3]).toBe("'-- comentário;");
  });
});

describe('arquivos gerados', () => {
  it('gera um CSV por bloco marcado, na ordem do relatório', () => {
    const arquivos = gerarArquivos(criarResumo(), criarOpcoes({ blocos: ['CONSULTAS', 'INDICADORES'] }));

    expect(arquivos.map((arquivo) => arquivo.nome)).toEqual([
      'orynt-resumo-semana-2026-09-28-indicadores.csv',
      'orynt-resumo-semana-2026-09-28-consultas.csv',
    ]);
    expect(arquivos.map((arquivo) => arquivo.bloco)).toEqual(['INDICADORES', 'CONSULTAS']);
    expect(arquivos.every((arquivo) => arquivo.tipo === 'text/csv;charset=utf-8')).toBe(true);
  });

  it('não gera nada sem bloco marcado', () => {
    expect(gerarArquivos(criarResumo(), criarOpcoes({ blocos: [] }))).toEqual([]);
  });

  it('marca o arquivo demonstrativo no nome e em cada linha do CSV', () => {
    const [arquivo] = gerarArquivos(criarResumo(), criarOpcoes({ blocos: ['EVOLUCAO'], simulada: true }));
    const linhas = linhasDoCsv(arquivo?.conteudo ?? '');

    expect(arquivo?.nome).toBe('orynt-resumo-semana-2026-09-28-evolucao-demonstracao.csv');
    expect(linhas[0]).toBe('Dia;Consultas;Tempo médio (ms);Origem dos dados');
    expect(linhas[1]).toBe('2026-09-28;464512;36,1;Demonstração');
  });

  it('nomeia pelo tamanho do período e pelo primeiro dia', () => {
    const mes = criarResumo({ granularidade: 'MES', inicio: '2026-09-01', fim: '2026-09-30' });

    expect(nomeDoArquivo(mes, 'json', false)).toBe('orynt-resumo-mes-2026-09-01.json');
    expect(nomeDoArquivo(mes, 'md', true)).toBe('orynt-resumo-mes-2026-09-01-demonstracao.md');
  });

  it('gera um JSON só, com os campos do relatório e apenas os blocos marcados', () => {
    const [arquivo] = gerarArquivos(criarResumo(), criarOpcoes({ formato: 'JSON', blocos: ['EVOLUCAO', 'INDICADORES'] }));
    const documento = JSON.parse(arquivo?.conteudo ?? '{}') as Record<string, unknown>;

    expect(arquivo?.nome).toBe('orynt-resumo-semana-2026-09-28.json');
    expect(arquivo?.bloco).toBeNull();
    expect(Object.keys(documento)).toEqual([
      'aplicacao',
      'relatorio',
      'conexao',
      'geradoEm',
      'dadosDemonstrativos',
      'periodo',
      'indicadores',
      'evolucao',
    ]);
    expect(documento.periodo).toEqual({ granularidade: 'SEMANA', inicio: '2026-09-28', fim: '2026-10-04' });
    expect(documento.indicadores).toEqual(criarResumo().indicadores);
    expect(documento.dadosDemonstrativos).toBe(false);
  });

  it('avisa dentro do JSON quando os dados são demonstrativos', () => {
    const [arquivo] = gerarArquivos(criarResumo(), criarOpcoes({ formato: 'JSON', simulada: true }));
    const documento = JSON.parse(arquivo?.conteudo ?? '{}') as Record<string, unknown>;

    expect(documento.dadosDemonstrativos).toBe(true);
    expect(documento.aviso).toBe('Dados demonstrativos: os números são fictícios e não vêm de um banco real.');
  });

  it('gera um Markdown com título, uma tabela por bloco e os números em português', () => {
    const [arquivo] = gerarArquivos(criarResumo(), criarOpcoes({ formato: 'MARKDOWN', blocos: ['EVOLUCAO', 'CONSULTAS'] }));
    const linhas = (arquivo?.conteudo ?? '').split('\n');

    expect(arquivo?.nome).toBe('orynt-resumo-semana-2026-09-28.md');
    expect(linhas[0]).toBe('# Resumo de Loja, de 28 de setembro a 4 de outubro de 2026');
    expect(linhas).toContain('## Evolução');
    expect(linhas).toContain('| Dia | Consultas | Tempo médio (ms) |');
    expect(linhas).toContain('| --- | ---: | ---: |');
    expect(linhas).toContain('| 2026-09-28 | 464.512 | 36,1 |');
    expect(linhas.indexOf('## Evolução')).toBeLessThan(linhas.indexOf('## Consultas'));
    expect(arquivo?.conteudo).not.toContain('Dados demonstrativos');
  });

  it('escapa a barra vertical do SQL no Markdown e põe o aviso demonstrativo no topo', () => {
    const [arquivo] = gerarArquivos(
      criarResumo(),
      criarOpcoes({ formato: 'MARKDOWN', blocos: ['CONSULTAS'], simulada: true }),
    );
    const linhas = (arquivo?.conteudo ?? '').split('\n');

    expect(linhas[2]).toBe('> Dados demonstrativos: os números são fictícios e não vêm de um banco real.');
    expect(linhas).toContain('| `SELECT a \\| b FROM "t"; SELECT 2` | 1.970,5 |  | 2.621 | 4,7 | Lenta |');
  });
});

describe('tabela para colar', () => {
  it('separa as colunas por tabulação e respeita o padrão dos números', () => {
    const tabela = montarTabela(criarResumo(), 'EVOLUCAO');

    expect(escreverTabelaParaColar(tabela, 'BRASILEIRO').split('\n')[1]).toBe('2026-09-28\t464512\t36,1');
    expect(escreverTabelaParaColar(tabela, 'INTERNACIONAL').split('\n')[1]).toBe('2026-09-28\t464512\t36.1');
  });

  it('leva a origem demonstrativa junto e não deixa tabulação dentro de uma célula', () => {
    const resumo = criarResumo();
    const [consulta] = resumo.consultas;
    if (!consulta) throw new Error('Falta a consulta do teste.');
    const comTabulacao = criarResumo({ consultas: [{ ...consulta, sql: 'SELECT\t1\nFROM t' }] });
    const linhas = gerarTextoParaColar(comTabulacao, 'CONSULTAS', 'BRASILEIRO', true).split('\n');

    expect(linhas[0]?.endsWith('\tOrigem dos dados')).toBe(true);
    expect(linhas[1]).toBe('SELECT 1 FROM t\t259\t-5,1\t145608\t34,7\tModerada\tDemonstração');
    expect(linhas).toHaveLength(2);
  });
});

describe('prévia do arquivo', () => {
  it('mostra as primeiras linhas, sem a marca de ordem, e conta as que ficaram de fora', () => {
    const conteudo = escreverCsv(montarTabela(criarResumo(), 'INDICADORES'), 'BRASILEIRO');
    const previa = previaDoArquivo(conteudo, 3);

    expect(previa.linhas).toEqual(['Indicador;Valor;Variação (%)', 'Consultas executadas;2912300;-2,5', 'Tempo médio de execução (ms);37,2;-3,9']);
    expect(previa.restantes).toBe(4);
  });

  it('não sobra nada quando o arquivo cabe no limite', () => {
    expect(previaDoArquivo('a\nb\n', 5)).toEqual({ linhas: ['a', 'b'], restantes: 0 });
  });
});
