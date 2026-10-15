import type {
  ConsultaDetalhadaDTO,
  DirecaoOrdenacao,
  OrdenacaoConsultas,
  PaginaConsultasDTO,
  TipoComando,
} from '@/modelos/consultas';
import type { ConsultaResumoDTO, DesempenhoConsulta, PeriodoDashboard } from '@/modelos/dashboard';
import { correspondeABusca, termosDaBusca } from '@/regras/buscaConsultas';
import { consultasFicticias, consultasSecundarias } from './consultasFicticias';
import { arredondar, classificarDesempenho, gerarConsultas, medidasDaJanela, sorteio } from './series';

export interface ParametrosDaLista {
  busca: string;
  desempenho: DesempenhoConsulta | null;
  tipo: TipoComando | null;
  ordenacao: OrdenacaoConsultas;
  direcao: DirecaoOrdenacao;
  pagina: number;
  tamanhoPagina: number;
}

const SEMENTE_DAS_MEDIDAS = 977;
const MENOR_FATOR_MINIMO = 0.18;
const AMPLITUDE_FATOR_MINIMO = 0.4;
const MENOR_FATOR_MAXIMO = 1.6;
const AMPLITUDE_FATOR_MAXIMO = 6.4;
const MENOR_TEMPO_MS = 0.1;

const comandos: Exclude<TipoComando, 'OUTRO'>[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

const cadastro = [...consultasFicticias, ...consultasSecundarias];
const posicaoNoCadastro = new Map(cadastro.map((consulta, indice) => [consulta.id, indice]));
const linhasPorConsulta = new Map(cadastro.map((consulta) => [consulta.id, consulta.linhasPorExecucao]));

const campoDaOrdenacao: Record<OrdenacaoConsultas, (consulta: ConsultaDetalhadaDTO) => number> = {
  PERCENTUAL_TEMPO_TOTAL: (consulta) => consulta.percentualTempoTotal,
  TEMPO_MEDIO: (consulta) => consulta.tempoMedioMs,
  TEMPO_MAXIMO: (consulta) => consulta.tempoMaximoMs,
  EXECUCOES: (consulta) => consulta.quantidadeExecucoes,
};

export function tipoDoComando(sql: string): TipoComando {
  const primeiraPalavra = sql.trimStart().split(/\s+/, 1)[0]?.toUpperCase() ?? '';
  return comandos.find((comando) => comando === primeiraPalavra) ?? 'OUTRO';
}

export function distribuirExecucoes(total: number, pesos: number[]): number[] {
  const somaDosPesos = pesos.reduce((soma, peso) => soma + peso, 0);
  const exatas = pesos.map((peso) => (total * peso) / somaDosPesos);
  const partes = exatas.map((exata) => Math.max(1, Math.floor(exata)));
  const porMaiorResto = exatas
    .map((exata, indice) => ({ indice, resto: exata - Math.floor(exata) }))
    .sort((a, b) => b.resto - a.resto);

  let sobra = total - partes.reduce((soma, parte) => soma + parte, 0);
  for (let passo = 0; sobra > 0; passo += 1, sobra -= 1) {
    const indice = porMaiorResto[passo % porMaiorResto.length]?.indice ?? 0;
    partes[indice] = (partes[indice] ?? 0) + 1;
  }
  if (sobra < 0) {
    const maior = partes.indexOf(Math.max(...partes));
    partes[maior] = (partes[maior] ?? 0) + sobra;
  }
  return partes;
}

function detalhar(consulta: ConsultaResumoDTO): ConsultaDetalhadaDTO {
  const semente = SEMENTE_DAS_MEDIDAS * ((posicaoNoCadastro.get(consulta.id) ?? 0) + 1);
  const fatorMinimo = MENOR_FATOR_MINIMO + AMPLITUDE_FATOR_MINIMO * sorteio(semente);
  const fatorMaximo = MENOR_FATOR_MAXIMO + AMPLITUDE_FATOR_MAXIMO * sorteio(semente + 1);

  return {
    ...consulta,
    tipo: tipoDoComando(consulta.sql),
    tempoTotalMs: arredondar(consulta.quantidadeExecucoes * consulta.tempoMedioMs),
    tempoMinimoMs: Math.min(consulta.tempoMedioMs, Math.max(MENOR_TEMPO_MS, arredondar(consulta.tempoMedioMs * fatorMinimo))),
    tempoMaximoMs: arredondar(consulta.tempoMedioMs * fatorMaximo),
    linhasPorExecucao: linhasPorConsulta.get(consulta.id) ?? 0,
  };
}

export function gerarConsultasDetalhadas(periodo: PeriodoDashboard, agora: Date): ConsultaDetalhadaDTO[] {
  const principais = gerarConsultas(periodo, agora);
  const janela = medidasDaJanela(periodo, agora);
  const tempoTotalMs = janela.totalConsultas * janela.tempoMedioMs;
  const execucoesDasPrincipais = principais.reduce((soma, consulta) => soma + consulta.quantidadeExecucoes, 0);
  const execucoes = distribuirExecucoes(
    janela.totalConsultas - execucoesDasPrincipais,
    consultasSecundarias.map((consulta) => consulta.participacaoExecucoes),
  );

  const secundarias: ConsultaResumoDTO[] = consultasSecundarias.map((consulta, indice) => {
    const quantidadeExecucoes = execucoes[indice] ?? 1;
    const tempoMedioMs = Math.max(MENOR_TEMPO_MS, arredondar(consulta.tempoMedioMs * janela.fator));
    return {
      id: consulta.id,
      sql: consulta.sql,
      tempoMedioMs,
      quantidadeExecucoes,
      percentualTempoTotal: arredondar(((quantidadeExecucoes * tempoMedioMs) / tempoTotalMs) * 100),
      desempenho: classificarDesempenho(tempoMedioMs),
    };
  });

  return [...principais, ...secundarias].map(detalhar).sort((a, b) => b.percentualTempoTotal - a.percentualTempoTotal);
}

function ordenar(consultas: ConsultaDetalhadaDTO[], ordenacao: OrdenacaoConsultas, direcao: DirecaoOrdenacao): ConsultaDetalhadaDTO[] {
  const ler = campoDaOrdenacao[ordenacao];
  const sentido = direcao === 'ASC' ? 1 : -1;
  return [...consultas].sort((a, b) => (ler(a) - ler(b)) * sentido || a.id.localeCompare(b.id));
}

export function filtrarConsultas(consultas: ConsultaDetalhadaDTO[], parametros: ParametrosDaLista): ConsultaDetalhadaDTO[] {
  const termos = termosDaBusca(parametros.busca);
  const filtradas = consultas.filter(
    (consulta) =>
      (parametros.desempenho === null || consulta.desempenho === parametros.desempenho) &&
      (parametros.tipo === null || consulta.tipo === parametros.tipo) &&
      correspondeABusca(consulta.sql, termos),
  );
  return ordenar(filtradas, parametros.ordenacao, parametros.direcao);
}

export function paginarConsultas(consultas: ConsultaDetalhadaDTO[], parametros: ParametrosDaLista): PaginaConsultasDTO {
  const filtradas = filtrarConsultas(consultas, parametros);
  const inicio = (parametros.pagina - 1) * parametros.tamanhoPagina;

  return {
    itens: filtradas.slice(inicio, inicio + parametros.tamanhoPagina),
    pagina: parametros.pagina,
    tamanhoPagina: parametros.tamanhoPagina,
    totalItens: filtradas.length,
    totalPaginas: Math.ceil(filtradas.length / parametros.tamanhoPagina),
    totalDoPeriodo: consultas.length,
  };
}
