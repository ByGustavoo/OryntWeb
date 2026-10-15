import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import type { HistoricoConsultaDTO } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import { nomeDoPeriodo } from './exportacaoConsultas';
import type { ArquivoDeConsultas } from './exportacaoConsultas';
import { comOrigem, escreverCsv } from './exportacaoRelatorio';
import type { PadraoNumerico, TabelaDeDados } from './exportacaoRelatorio';
import { escreverData } from './periodoRelatorio';

interface OpcoesDoArquivo {
  padrao: PadraoNumerico;
  simulada: boolean;
  geradoEm: Date;
}

function escreverInicio(instante: string, periodo: PeriodoDashboard): string {
  const data = new Date(instante);
  if (periodo === 'ULTIMOS_30_DIAS') return escreverData(data);
  const horas = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');
  return `${escreverData(data)} ${horas}:${minutos}`;
}

export function montarTabelaDoHistorico(historico: HistoricoConsultaDTO): TabelaDeDados {
  return {
    colunas: [
      { titulo: 'Início do intervalo', tipo: 'TEXTO' },
      { titulo: 'Execuções', tipo: 'INTEIRO' },
      { titulo: 'Tempo médio (ms)', tipo: 'DECIMAL' },
      { titulo: 'Tempo máximo (ms)', tipo: 'DECIMAL' },
      { titulo: 'Consulta', tipo: 'CODIGO' },
    ],
    linhas: historico.pontos.map((ponto) => [
      escreverInicio(ponto.instante, historico.periodo),
      ponto.quantidadeExecucoes,
      ponto.tempoMedioMs,
      ponto.tempoMaximoMs,
      historico.consulta.sql,
    ]),
  };
}

export function nomeDoArquivoDoHistorico(historico: HistoricoConsultaDTO, simulada: boolean, geradoEm: Date): string {
  const partes = [
    NOME_APLICACAO.toLowerCase(),
    'historico',
    'consulta',
    nomeDoPeriodo[historico.periodo],
    escreverData(geradoEm),
    simulada ? 'demonstracao' : null,
  ];
  return `${partes.filter((parte) => parte !== null).join('-')}.csv`;
}

export function gerarArquivoDoHistorico(historico: HistoricoConsultaDTO, opcoes: OpcoesDoArquivo): ArquivoDeConsultas {
  return {
    nome: nomeDoArquivoDoHistorico(historico, opcoes.simulada, opcoes.geradoEm),
    tipo: 'text/csv;charset=utf-8',
    conteudo: escreverCsv(comOrigem(montarTabelaDoHistorico(historico), opcoes.simulada), opcoes.padrao),
    linhas: historico.pontos.length,
  };
}
