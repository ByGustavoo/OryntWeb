import type { RequisicaoTransporte, RespostaTransporte, ValorConsulta } from '@/api/transporte';
import type { PaginaConsultasDTO } from '@/modelos/consultas';
import type { ErroCampoDTO } from '@/modelos/comum';
import {
  desempenhosConsulta,
  direcoesOrdenacao,
  ordenacoesConsultas,
  periodosDashboard,
  tiposComando,
} from '@/modelos/rotulos';
import { TAMANHO_MAXIMO_BUSCA } from '@/regras/buscaConsultas';
import {
  TAMANHO_DA_PAGINA,
  TAMANHO_MAXIMO_DA_PAGINA,
  filtrosIniciais,
  lerDesempenho,
  lerDirecao,
  lerNumeroDaPagina,
  lerOrdenacao,
  lerPeriodoDaLista,
  lerTipoComando,
} from '@/regras/filtrosConsultas';
import { lerIdDaConsulta } from '@/regras/historicoConsulta';
import { gerarConsultasDetalhadas, paginarConsultas } from '../consultas';
import { dadosVazios } from '../controles';
import { gerarHistoricoDaConsulta } from '../historicoConsulta';
import { gerarPlanosDaConsulta } from '../planosExecucao';
import { dadosInvalidos, naoAutorizado, ok, rotaInexistente } from '../resposta';
import { lerSessaoSimulada } from '../sessaoSimulada';

function ausente(valor: ValorConsulta): boolean {
  return valor === undefined || valor === null || valor === '';
}

function umDe(valores: string[]): string {
  return `um destes valores: ${valores.join(', ')}`;
}

function paginaVazia(pagina: number, tamanhoPagina: number): PaginaConsultasDTO {
  return { itens: [], pagina, tamanhoPagina, totalItens: 0, totalPaginas: 0, totalDoPeriodo: 0 };
}

export function listarConsultas(requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  if (!lerSessaoSimulada()) return naoAutorizado();

  const { consulta } = requisicao;
  const erros: ErroCampoDTO[] = [];
  const escolher = <T>(campo: string, valor: ValorConsulta, ler: (valor: unknown) => T | null, padrao: T, opcoes: string): T => {
    if (ausente(valor)) return padrao;
    const lido = ler(valor);
    if (lido === null) erros.push({ campo, mensagem: `Use ${opcoes}.` });
    return lido ?? padrao;
  };

  const periodo = escolher('periodo', consulta.periodo, lerPeriodoDaLista, filtrosIniciais.periodo, umDe(periodosDashboard));
  const desempenho = escolher('desempenho', consulta.desempenho, lerDesempenho, null, umDe(desempenhosConsulta));
  const tipo = escolher('tipo', consulta.tipo, lerTipoComando, null, umDe(tiposComando));
  const ordenacao = escolher('ordenacao', consulta.ordenacao, lerOrdenacao, filtrosIniciais.ordenacao, umDe(ordenacoesConsultas));
  const direcao = escolher('direcao', consulta.direcao, lerDirecao, filtrosIniciais.direcao, umDe(direcoesOrdenacao));
  const pagina = escolher('pagina', consulta.pagina, lerNumeroDaPagina, 1, 'um número inteiro a partir de 1');
  const tamanhoPagina = escolher(
    'tamanhoPagina',
    consulta.tamanhoPagina,
    (valor) => {
      const numero = lerNumeroDaPagina(valor);
      return numero !== null && numero <= TAMANHO_MAXIMO_DA_PAGINA ? numero : null;
    },
    TAMANHO_DA_PAGINA,
    `um número inteiro de 1 a ${TAMANHO_MAXIMO_DA_PAGINA}`,
  );

  const busca = typeof consulta.busca === 'string' ? consulta.busca : '';
  if (busca.length > TAMANHO_MAXIMO_BUSCA) {
    erros.push({ campo: 'busca', mensagem: `Use até ${TAMANHO_MAXIMO_BUSCA} caracteres.` });
  }

  if (erros.length > 0) return dadosInvalidos(erros);
  if (dadosVazios()) return ok(paginaVazia(pagina, tamanhoPagina));

  return ok(
    paginarConsultas(gerarConsultasDetalhadas(periodo, agora), { busca, desempenho, tipo, ordenacao, direcao, pagina, tamanhoPagina }),
  );
}

export function buscarHistoricoDaConsulta(
  requisicao: RequisicaoTransporte,
  agora: Date,
  parametros: Record<string, string>,
): RespostaTransporte {
  if (!lerSessaoSimulada()) return naoAutorizado();

  const pedido = requisicao.consulta.periodo;
  const periodo = ausente(pedido) ? filtrosIniciais.periodo : lerPeriodoDaLista(pedido);
  if (periodo === null) return dadosInvalidos([{ campo: 'periodo', mensagem: `Use ${umDe(periodosDashboard)}.` }]);

  const historico = gerarHistoricoDaConsulta(parametros.id ?? '', periodo, agora, dadosVazios());
  return historico ? ok(historico) : rotaInexistente('A consulta não aparece mais nas estatísticas do banco.');
}

export function buscarPlanoDaConsulta(
  requisicao: RequisicaoTransporte,
  agora: Date,
  parametros: Record<string, string>,
): RespostaTransporte {
  if (!lerSessaoSimulada()) return naoAutorizado();

  const pedida = requisicao.consulta.versao;
  const versao = ausente(pedida) ? null : lerIdDaConsulta(pedida);
  if (!ausente(pedida) && versao === null) {
    return dadosInvalidos([{ campo: 'versao', mensagem: 'Use o identificador de uma das versões do plano.' }]);
  }

  const planos = gerarPlanosDaConsulta(parametros.id ?? '', versao, agora, dadosVazios());
  return planos ? ok(planos) : rotaInexistente('A consulta não aparece mais nas estatísticas do banco.');
}
