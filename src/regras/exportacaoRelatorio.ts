import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import type { GranularidadeRelatorio, PeriodoRelatorio, ResumoRelatorioDTO } from '@/modelos/relatorios';
import { rotuloDesempenho, rotuloFaixaDesempenho } from '@/modelos/rotulos';
import { formatarNumero } from '@/utilitarios/formatacao';
import { escreverData, periodoNaFrase } from './periodoRelatorio';

export type BlocoExportacao = 'EVOLUCAO' | 'CONSULTAS' | 'DESEMPENHO' | 'INDICADORES';
export type FormatoExportacao = 'CSV' | 'JSON' | 'MARKDOWN';
export type PadraoNumerico = 'BRASILEIRO' | 'INTERNACIONAL';
export type TipoColuna = 'TEXTO' | 'CODIGO' | 'INTEIRO' | 'DECIMAL';
export type CelulaExportacao = string | number | null;

export interface ColunaExportacao {
  titulo: string;
  tipo: TipoColuna;
}

export interface TabelaDeDados {
  colunas: ColunaExportacao[];
  linhas: CelulaExportacao[][];
}

export interface TabelaExportacao extends TabelaDeDados {
  bloco: BlocoExportacao;
  titulo: string;
}

export interface ArquivoExportacao {
  nome: string;
  tipo: string;
  conteudo: string;
  bloco: BlocoExportacao | null;
}

export interface OpcoesExportacao {
  blocos: BlocoExportacao[];
  formato: FormatoExportacao;
  padrao: PadraoNumerico;
  nomeConexao: string;
  simulada: boolean;
  geradoEm: string;
}

export interface PreviaArquivo {
  linhas: string[];
  restantes: number;
}

export const blocosExportacao: BlocoExportacao[] = ['EVOLUCAO', 'CONSULTAS', 'DESEMPENHO', 'INDICADORES'];
export const formatosExportacao: FormatoExportacao[] = ['CSV', 'JSON', 'MARKDOWN'];
export const padroesNumericos: PadraoNumerico[] = ['BRASILEIRO', 'INTERNACIONAL'];

export const rotuloBloco: Record<BlocoExportacao, string> = {
  EVOLUCAO: 'Evolução',
  CONSULTAS: 'Consultas',
  DESEMPENHO: 'Desempenho',
  INDICADORES: 'Indicadores',
};

export const rotuloPadraoNumerico: Record<PadraoNumerico, string> = {
  BRASILEIRO: 'Padrão brasileiro',
  INTERNACIONAL: 'Padrão internacional',
};

export const descricaoPadraoNumerico: Record<PadraoNumerico, string> = {
  BRASILEIRO: 'Ponto e vírgula entre as colunas e vírgula decimal, como o Excel em português espera.',
  INTERNACIONAL: 'Vírgula entre as colunas e ponto decimal.',
};

const ordemNoRelatorio: BlocoExportacao[] = ['INDICADORES', 'EVOLUCAO', 'DESEMPENHO', 'CONSULTAS'];

const nomeDoBloco: Record<BlocoExportacao, string> = {
  EVOLUCAO: 'evolucao',
  CONSULTAS: 'consultas',
  DESEMPENHO: 'desempenho',
  INDICADORES: 'indicadores',
};

const nomeDaGranularidade: Record<GranularidadeRelatorio, string> = {
  DIA: 'dia',
  SEMANA: 'semana',
  MES: 'mes',
};

const separadorDeCampos: Record<PadraoNumerico, string> = {
  BRASILEIRO: ';',
  INTERNACIONAL: ',',
};

const separadorDecimal: Record<PadraoNumerico, string> = {
  BRASILEIRO: ',',
  INTERNACIONAL: '.',
};

const MARCA_DE_ORDEM = String.fromCharCode(0xfeff);
const QUEBRA_CSV = '\r\n';
const TABULACAO = '\t';
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;
const ESPACOS_DE_CONTROLE = /[\t\r\n]+/g;
const COLUNA_DE_ORIGEM: ColunaExportacao = { titulo: 'Origem dos dados', tipo: 'TEXTO' };
const ORIGEM_DEMONSTRATIVA = 'Demonstração';
const AVISO_DEMONSTRATIVO = 'Dados demonstrativos: os números são fictícios e não vêm de um banco real.';

function ordenar(blocos: BlocoExportacao[]): BlocoExportacao[] {
  return ordemNoRelatorio.filter((bloco) => blocos.includes(bloco));
}

function periodoDoResumo(resumo: ResumoRelatorioDTO): PeriodoRelatorio {
  return { granularidade: resumo.granularidade, inicio: resumo.inicio };
}

function escreverMomento(instante: string, granularidade: GranularidadeRelatorio): string {
  const data = new Date(instante);
  if (granularidade !== 'DIA') return escreverData(data);
  return `${escreverData(data)} ${String(data.getHours()).padStart(2, '0')}:00`;
}

export function montarTabela(resumo: ResumoRelatorioDTO, bloco: BlocoExportacao): TabelaExportacao {
  const titulo = rotuloBloco[bloco];

  if (bloco === 'INDICADORES') {
    const { indicadores } = resumo;
    return {
      bloco,
      titulo,
      colunas: [
        { titulo: 'Indicador', tipo: 'TEXTO' },
        { titulo: 'Valor', tipo: 'DECIMAL' },
        { titulo: 'Variação (%)', tipo: 'DECIMAL' },
      ],
      linhas: [
        ['Consultas executadas', indicadores.totalConsultas, indicadores.variacaoTotalConsultas],
        ['Tempo médio de execução (ms)', indicadores.tempoMedioMs, indicadores.variacaoTempoMedio],
        ['Consultas lentas', indicadores.consultasLentas, null],
        ['Consultas distintas', indicadores.consultasDistintas, null],
        ['Pico de conexões', indicadores.picoConexoes, null],
        ['Limite de conexões', indicadores.limiteConexoes, null],
      ],
    };
  }

  if (bloco === 'EVOLUCAO') {
    return {
      bloco,
      titulo,
      colunas: [
        { titulo: resumo.granularidade === 'DIA' ? 'Hora' : 'Dia', tipo: 'TEXTO' },
        { titulo: 'Consultas', tipo: 'INTEIRO' },
        { titulo: 'Tempo médio (ms)', tipo: 'DECIMAL' },
      ],
      linhas: resumo.evolucao.map((ponto) => [
        escreverMomento(ponto.instante, resumo.granularidade),
        ponto.consultas,
        ponto.tempoMedioMs,
      ]),
    };
  }

  if (bloco === 'DESEMPENHO') {
    return {
      bloco,
      titulo,
      colunas: [
        { titulo: 'Faixa', tipo: 'TEXTO' },
        { titulo: 'Consultas distintas', tipo: 'INTEIRO' },
        { titulo: 'Execuções', tipo: 'INTEIRO' },
        { titulo: 'Execuções (%)', tipo: 'DECIMAL' },
        { titulo: 'Tempo do banco (%)', tipo: 'DECIMAL' },
      ],
      linhas: resumo.desempenho.map((faixa) => [
        rotuloFaixaDesempenho[faixa.desempenho],
        faixa.consultasDistintas,
        faixa.quantidadeExecucoes,
        faixa.percentualExecucoes,
        faixa.percentualTempoTotal,
      ]),
    };
  }

  return {
    bloco,
    titulo,
    colunas: [
      { titulo: 'Consulta', tipo: 'CODIGO' },
      { titulo: 'Tempo médio (ms)', tipo: 'DECIMAL' },
      { titulo: 'Variação do tempo médio (%)', tipo: 'DECIMAL' },
      { titulo: 'Execuções', tipo: 'INTEIRO' },
      { titulo: 'Tempo do banco (%)', tipo: 'DECIMAL' },
      { titulo: 'Desempenho', tipo: 'TEXTO' },
    ],
    linhas: resumo.consultas.map((consulta) => [
      consulta.sql,
      consulta.tempoMedioMs,
      consulta.variacaoTempoMedio,
      consulta.quantidadeExecucoes,
      consulta.percentualTempoTotal,
      rotuloDesempenho[consulta.desempenho],
    ]),
  };
}

export function comOrigem<T extends TabelaDeDados>(tabela: T, simulada: boolean): T {
  if (!simulada) return tabela;
  return {
    ...tabela,
    colunas: [...tabela.colunas, COLUNA_DE_ORIGEM],
    linhas: tabela.linhas.map((linha) => [...linha, ORIGEM_DEMONSTRATIVA]),
  };
}

function neutralizarFormula(texto: string): string {
  return INICIO_DE_FORMULA.test(texto) ? `'${texto}` : texto;
}

function escreverNumero(valor: number, padrao: PadraoNumerico): string {
  return String(valor).replace('.', separadorDecimal[padrao]);
}

function escreverCelula(celula: CelulaExportacao, padrao: PadraoNumerico): string {
  if (celula === null) return '';
  return typeof celula === 'number' ? escreverNumero(celula, padrao) : neutralizarFormula(celula);
}

function citar(campo: string, separador: string): string {
  const precisaDeAspas = campo.includes(separador) || campo.includes('"') || campo.includes('\n') || campo.includes('\r');
  return precisaDeAspas ? `"${campo.replace(/"/g, '""')}"` : campo;
}

export function escreverCsv(tabela: TabelaDeDados, padrao: PadraoNumerico): string {
  const separador = separadorDeCampos[padrao];
  const cabecalho = tabela.colunas.map((coluna) => citar(coluna.titulo, separador));
  const linhas = tabela.linhas.map((linha) => linha.map((celula) => citar(escreverCelula(celula, padrao), separador)));
  return MARCA_DE_ORDEM + [cabecalho, ...linhas].map((linha) => linha.join(separador)).join(QUEBRA_CSV) + QUEBRA_CSV;
}

export function escreverTabelaParaColar(tabela: TabelaExportacao, padrao: PadraoNumerico): string {
  const limpar = (texto: string) => texto.replace(ESPACOS_DE_CONTROLE, ' ');
  const cabecalho = tabela.colunas.map((coluna) => limpar(coluna.titulo));
  const linhas = tabela.linhas.map((linha) => linha.map((celula) => limpar(escreverCelula(celula, padrao))));
  return [cabecalho, ...linhas].map((linha) => linha.join(TABULACAO)).join('\n');
}

function escreverCodigoMarkdown(texto: string): string {
  const cerca = texto.includes('`') ? '``' : '`';
  const respiro = texto.includes('`') ? ' ' : '';
  return `${cerca}${respiro}${texto}${respiro}${cerca}`;
}

function escreverCelulaMarkdown(celula: CelulaExportacao, tipo: TipoColuna): string {
  if (celula === null) return '';
  if (typeof celula === 'number') {
    return tipo === 'INTEIRO' ? formatarNumero(celula) : celula.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
  const texto = celula.replace(ESPACOS_DE_CONTROLE, ' ').replace(/\|/g, '\\|');
  return tipo === 'CODIGO' ? escreverCodigoMarkdown(texto) : texto;
}

function escreverTabelaMarkdown(tabela: TabelaExportacao): string {
  const numerica = (coluna: ColunaExportacao) => coluna.tipo === 'INTEIRO' || coluna.tipo === 'DECIMAL';
  const linha = (celulas: string[]) => `| ${celulas.join(' | ')} |`;

  return [
    `## ${tabela.titulo}`,
    '',
    linha(tabela.colunas.map((coluna) => coluna.titulo)),
    linha(tabela.colunas.map((coluna) => (numerica(coluna) ? '---:' : '---'))),
    ...tabela.linhas.map((celulas) =>
      linha(celulas.map((celula, indice) => escreverCelulaMarkdown(celula, tabela.colunas[indice]?.tipo ?? 'TEXTO'))),
    ),
  ].join('\n');
}

export function escreverMarkdown(resumo: ResumoRelatorioDTO, opcoes: OpcoesExportacao): string {
  const partes = [`# Resumo de ${opcoes.nomeConexao}, ${periodoNaFrase(periodoDoResumo(resumo))}`];
  if (opcoes.simulada) partes.push(`> ${AVISO_DEMONSTRATIVO}`);
  for (const bloco of ordenar(opcoes.blocos)) partes.push(escreverTabelaMarkdown(montarTabela(resumo, bloco)));
  return `${partes.join('\n\n')}\n`;
}

export function escreverJson(resumo: ResumoRelatorioDTO, opcoes: OpcoesExportacao): string {
  const blocos = ordenar(opcoes.blocos);
  const documento = {
    aplicacao: NOME_APLICACAO,
    relatorio: 'RESUMO',
    conexao: opcoes.nomeConexao,
    geradoEm: opcoes.geradoEm,
    dadosDemonstrativos: opcoes.simulada,
    ...(opcoes.simulada ? { aviso: AVISO_DEMONSTRATIVO } : {}),
    periodo: { granularidade: resumo.granularidade, inicio: resumo.inicio, fim: resumo.fim },
    ...(blocos.includes('INDICADORES') ? { indicadores: resumo.indicadores } : {}),
    ...(blocos.includes('EVOLUCAO') ? { evolucao: resumo.evolucao } : {}),
    ...(blocos.includes('DESEMPENHO') ? { desempenho: resumo.desempenho } : {}),
    ...(blocos.includes('CONSULTAS') ? { consultas: resumo.consultas } : {}),
  };
  return `${JSON.stringify(documento, null, 2)}\n`;
}

export function nomeDoArquivo(
  resumo: ResumoRelatorioDTO,
  extensao: string,
  simulada: boolean,
  bloco: BlocoExportacao | null = null,
): string {
  const partes = [
    NOME_APLICACAO.toLowerCase(),
    'resumo',
    nomeDaGranularidade[resumo.granularidade],
    resumo.inicio,
    bloco ? nomeDoBloco[bloco] : null,
    simulada ? 'demonstracao' : null,
  ];
  return `${partes.filter((parte) => parte !== null).join('-')}.${extensao}`;
}

export function gerarArquivos(resumo: ResumoRelatorioDTO, opcoes: OpcoesExportacao): ArquivoExportacao[] {
  const blocos = ordenar(opcoes.blocos);
  if (blocos.length === 0) return [];

  if (opcoes.formato === 'CSV') {
    return blocos.map((bloco) => ({
      nome: nomeDoArquivo(resumo, 'csv', opcoes.simulada, bloco),
      tipo: 'text/csv;charset=utf-8',
      conteudo: escreverCsv(comOrigem(montarTabela(resumo, bloco), opcoes.simulada), opcoes.padrao),
      bloco,
    }));
  }

  if (opcoes.formato === 'JSON') {
    return [
      {
        nome: nomeDoArquivo(resumo, 'json', opcoes.simulada),
        tipo: 'application/json',
        conteudo: escreverJson(resumo, opcoes),
        bloco: null,
      },
    ];
  }

  return [
    {
      nome: nomeDoArquivo(resumo, 'md', opcoes.simulada),
      tipo: 'text/markdown;charset=utf-8',
      conteudo: escreverMarkdown(resumo, opcoes),
      bloco: null,
    },
  ];
}

export function gerarTextoParaColar(
  resumo: ResumoRelatorioDTO,
  bloco: BlocoExportacao,
  padrao: PadraoNumerico,
  simulada: boolean,
): string {
  return escreverTabelaParaColar(comOrigem(montarTabela(resumo, bloco), simulada), padrao);
}

export function contarLinhas(resumo: ResumoRelatorioDTO, bloco: BlocoExportacao): number {
  return montarTabela(resumo, bloco).linhas.length;
}

export function previaDoArquivo(conteudo: string, limite: number): PreviaArquivo {
  const linhas = conteudo.replace(MARCA_DE_ORDEM, '').trimEnd().split(/\r?\n/);
  return { linhas: linhas.slice(0, limite), restantes: Math.max(0, linhas.length - limite) };
}
