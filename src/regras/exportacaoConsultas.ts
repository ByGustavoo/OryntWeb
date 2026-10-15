import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import type { ConsultaDetalhadaDTO, FiltrosConsultas } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import { rotuloDesempenho, rotuloTipoComando } from '@/modelos/rotulos';
import { comOrigem, escreverCsv } from './exportacaoRelatorio';
import type { PadraoNumerico, TabelaDeDados } from './exportacaoRelatorio';
import { temFiltroAtivo } from './filtrosConsultas';
import { escreverData } from './periodoRelatorio';

export interface ArquivoDeConsultas {
  nome: string;
  tipo: string;
  conteudo: string;
  linhas: number;
}

interface OpcoesDoArquivo {
  filtros: FiltrosConsultas;
  padrao: PadraoNumerico;
  simulada: boolean;
  geradoEm: Date;
}

export const nomeDoPeriodo: Record<PeriodoDashboard, string> = {
  ULTIMA_HORA: '1h',
  ULTIMAS_24_HORAS: '24h',
  ULTIMOS_7_DIAS: '7d',
  ULTIMOS_30_DIAS: '30d',
};

export function montarTabelaDeConsultas(consultas: ConsultaDetalhadaDTO[]): TabelaDeDados {
  return {
    colunas: [
      { titulo: 'Consulta', tipo: 'CODIGO' },
      { titulo: 'Tipo de comando', tipo: 'TEXTO' },
      { titulo: 'Tempo médio (ms)', tipo: 'DECIMAL' },
      { titulo: 'Tempo mínimo (ms)', tipo: 'DECIMAL' },
      { titulo: 'Tempo máximo (ms)', tipo: 'DECIMAL' },
      { titulo: 'Tempo total (ms)', tipo: 'DECIMAL' },
      { titulo: 'Execuções', tipo: 'INTEIRO' },
      { titulo: 'Linhas por execução', tipo: 'DECIMAL' },
      { titulo: 'Tempo do banco (%)', tipo: 'DECIMAL' },
      { titulo: 'Desempenho', tipo: 'TEXTO' },
    ],
    linhas: consultas.map((consulta) => [
      consulta.sql,
      rotuloTipoComando[consulta.tipo],
      consulta.tempoMedioMs,
      consulta.tempoMinimoMs,
      consulta.tempoMaximoMs,
      consulta.tempoTotalMs,
      consulta.quantidadeExecucoes,
      consulta.linhasPorExecucao,
      consulta.percentualTempoTotal,
      rotuloDesempenho[consulta.desempenho],
    ]),
  };
}

export function nomeDoArquivoDeConsultas({ filtros, simulada, geradoEm }: Omit<OpcoesDoArquivo, 'padrao'>): string {
  const partes = [
    NOME_APLICACAO.toLowerCase(),
    'consultas',
    nomeDoPeriodo[filtros.periodo],
    escreverData(geradoEm),
    temFiltroAtivo(filtros) ? 'filtradas' : null,
    simulada ? 'demonstracao' : null,
  ];
  return `${partes.filter((parte) => parte !== null).join('-')}.csv`;
}

export function gerarArquivoDeConsultas(consultas: ConsultaDetalhadaDTO[], opcoes: OpcoesDoArquivo): ArquivoDeConsultas {
  return {
    nome: nomeDoArquivoDeConsultas(opcoes),
    tipo: 'text/csv;charset=utf-8',
    conteudo: escreverCsv(comOrigem(montarTabelaDeConsultas(consultas), opcoes.simulada), opcoes.padrao),
    linhas: consultas.length,
  };
}
