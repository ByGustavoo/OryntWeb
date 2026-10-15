import type { ConsultaDetalhadaDTO, HistoricoConsultaDTO, PontoHistoricoDTO } from '@/modelos/consultas';
import type { PeriodoDashboard, PontoAtividadeDTO } from '@/modelos/dashboard';
import { filtrosIniciais } from '@/regras/filtrosConsultas';
import { consultasFicticias, consultasSecundarias } from './consultasFicticias';
import { filtrarConsultas, gerarConsultasDetalhadas, tipoDoComando } from './consultas';
import { arredondar, gerarAtividade, janelasPeriodo, sementeDoInstante, sorteio, variacaoPercentual } from './series';
import { marcoDoDegrau, trocasDePlano } from './trocasDePlano';

type Perfil = 'CARGA' | 'DEGRAU' | 'MADRUGADA' | 'ESTAVEL' | 'SEGUNDA';

interface Momento {
  meio: Date;
  cargaRelativa: number;
  marcoDoDegrau: number;
}

const perfis: Perfil[] = ['CARGA', 'DEGRAU', 'MADRUGADA', 'ESTAVEL', 'SEGUNDA'];

const MS_POR_MINUTO = 60_000;
const SEMENTE_DO_HISTORICO = 613;
const SEGUNDA_FEIRA = 1;
const INICIO_DA_MADRUGADA = 1;
const FIM_DA_MADRUGADA = 5;
const MENOR_RUIDO_DO_TEMPO = 0.95;
const AMPLITUDE_RUIDO_DO_TEMPO = 0.1;
const MENOR_RUIDO_DO_VOLUME = 0.7;
const AMPLITUDE_RUIDO_DO_VOLUME = 0.6;
const MENOR_PARTE_DA_FOLGA = 0.25;
const AMPLITUDE_PARTE_DA_FOLGA = 0.6;

const cadastro = [...consultasFicticias, ...consultasSecundarias];
const posicaoNoCadastro = new Map(cadastro.map((consulta, indice) => [consulta.id, indice]));

const fatorDoPerfil: Record<Perfil, (momento: Momento) => number> = {
  CARGA: ({ cargaRelativa }) => 0.8 + 0.5 * cargaRelativa,
  DEGRAU: ({ meio, marcoDoDegrau }) => (meio.getTime() >= marcoDoDegrau ? 1.18 : 0.92),
  MADRUGADA: ({ meio }) => (meio.getHours() >= INICIO_DA_MADRUGADA && meio.getHours() < FIM_DA_MADRUGADA ? 1.45 : 1),
  ESTAVEL: () => 1,
  SEGUNDA: ({ meio }) => (meio.getDay() === SEGUNDA_FEIRA ? 1.3 : 1),
};

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

export function repartirExecucoes(total: number, pesos: number[]): number[] {
  const somaDosPesos = pesos.reduce((soma, peso) => soma + peso, 0);
  if (total <= 0 || somaDosPesos <= 0) return pesos.map(() => 0);

  const exatas = pesos.map((peso) => (total * peso) / somaDosPesos);
  const partes = exatas.map((exata) => Math.floor(exata));
  const porMaiorResto = exatas
    .map((exata, indice) => ({ indice, resto: exata - Math.floor(exata) }))
    .sort((a, b) => b.resto - a.resto || a.indice - b.indice);

  let sobra = total - partes.reduce((soma, parte) => soma + parte, 0);
  for (const { indice } of porMaiorResto) {
    if (sobra <= 0) break;
    partes[indice] = (partes[indice] ?? 0) + 1;
    sobra -= 1;
  }
  return partes;
}

function inicioDaJanelaAnterior(periodo: PeriodoDashboard, agora: Date): Date {
  const { pontos, minutosPorPonto } = janelasPeriodo[periodo];
  return new Date(agora.getTime() - pontos * minutosPorPonto * MS_POR_MINUTO);
}

function montarPontos(
  consulta: ConsultaDetalhadaDTO,
  atividade: PontoAtividadeDTO[],
  periodo: PeriodoDashboard,
  agora: Date,
): PontoHistoricoDTO[] {
  const indice = posicaoNoCadastro.get(consulta.id) ?? 0;
  const perfil = perfis[indice % perfis.length] ?? 'ESTAVEL';
  const meiaJanelaMs = (janelasPeriodo[periodo].minutosPorPonto * MS_POR_MINUTO) / 2;
  const maiorVolume = Math.max(1, ...atividade.map((ponto) => ponto.consultas));
  const marco = marcoDoDegrau(agora);
  const sementes = atividade.map(
    (ponto) => sementeDoInstante(new Date(ponto.instante)) * 31 + (indice + 1) * SEMENTE_DO_HISTORICO,
  );

  const execucoes = repartirExecucoes(
    consulta.quantidadeExecucoes,
    atividade.map(
      (ponto, posicao) =>
        ponto.consultas * (MENOR_RUIDO_DO_VOLUME + AMPLITUDE_RUIDO_DO_VOLUME * sorteio((sementes[posicao] ?? 0) + 2)),
    ),
  );

  const fatores = atividade.map((ponto, posicao) => {
    const momento: Momento = {
      meio: new Date(new Date(ponto.instante).getTime() + meiaJanelaMs),
      cargaRelativa: ponto.consultas / maiorVolume,
      marcoDoDegrau: marco,
    };
    return fatorDoPerfil[perfil](momento) * (MENOR_RUIDO_DO_TEMPO + AMPLITUDE_RUIDO_DO_TEMPO * sorteio(sementes[posicao] ?? 0));
  });

  const fatorMedio =
    execucoes.reduce((soma, quantidade, posicao) => soma + quantidade * (fatores[posicao] ?? 1), 0) /
    Math.max(1, consulta.quantidadeExecucoes);
  const folgaDoMaximo = consulta.tempoMedioMs > 0 ? consulta.tempoMaximoMs / consulta.tempoMedioMs - 1 : 0;

  const pontos: PontoHistoricoDTO[] = atividade.map((ponto, posicao) => {
    const quantidadeExecucoes = execucoes[posicao] ?? 0;
    if (quantidadeExecucoes === 0) {
      return { instante: ponto.instante, quantidadeExecucoes, tempoMedioMs: null, tempoMaximoMs: null };
    }
    const tempoMedioMs = limitar(
      arredondar((consulta.tempoMedioMs * (fatores[posicao] ?? 1)) / fatorMedio),
      consulta.tempoMinimoMs,
      consulta.tempoMaximoMs,
    );
    const parteDaFolga = MENOR_PARTE_DA_FOLGA + AMPLITUDE_PARTE_DA_FOLGA * sorteio((sementes[posicao] ?? 0) + 3);
    const tempoMaximoMs = limitar(arredondar(tempoMedioMs * (1 + folgaDoMaximo * parteDaFolga)), tempoMedioMs, consulta.tempoMaximoMs);
    return { instante: ponto.instante, quantidadeExecucoes, tempoMedioMs, tempoMaximoMs };
  });

  const maisLento = pontos.reduce<PontoHistoricoDTO | null>(
    (maior, ponto) => ((ponto.tempoMaximoMs ?? -1) > (maior?.tempoMaximoMs ?? -1) ? ponto : maior),
    null,
  );
  if (maisLento) maisLento.tempoMaximoMs = consulta.tempoMaximoMs;

  return pontos;
}

function historicoSemExecucoes(id: string, periodo: PeriodoDashboard, agora: Date): HistoricoConsultaDTO | null {
  const cadastrada = cadastro.find((consulta) => consulta.id === id);
  if (!cadastrada) return null;

  return {
    periodo,
    consulta: {
      id: cadastrada.id,
      sql: cadastrada.sql,
      tipo: tipoDoComando(cadastrada.sql),
      tempoMedioMs: 0,
      tempoMinimoMs: 0,
      tempoMaximoMs: 0,
      tempoTotalMs: 0,
      quantidadeExecucoes: 0,
      linhasPorExecucao: 0,
      percentualTempoTotal: 0,
      desempenho: 'RAPIDA',
    },
    variacaoExecucoes: null,
    variacaoTempoMedio: null,
    posicao: null,
    totalDoPeriodo: 0,
    idAnterior: null,
    idSeguinte: null,
    pontos: gerarAtividade(periodo, agora).map((ponto) => ({
      instante: ponto.instante,
      quantidadeExecucoes: 0,
      tempoMedioMs: null,
      tempoMaximoMs: null,
    })),
    trocasDePlano: [],
  };
}

export function gerarHistoricoDaConsulta(
  id: string,
  periodo: PeriodoDashboard,
  agora: Date,
  semExecucoes = false,
): HistoricoConsultaDTO | null {
  if (semExecucoes) return historicoSemExecucoes(id, periodo, agora);

  const porPeso = filtrarConsultas(gerarConsultasDetalhadas(periodo, agora), { ...filtrosIniciais, tamanhoPagina: 1 });
  const indice = porPeso.findIndex((consulta) => consulta.id === id);
  const consulta = porPeso[indice];
  if (!consulta) return null;

  const pontos = montarPontos(consulta, gerarAtividade(periodo, agora), periodo, agora);
  const inicioDaJanela = new Date(pontos[0]?.instante ?? agora).getTime();
  const anterior = gerarConsultasDetalhadas(periodo, inicioDaJanelaAnterior(periodo, agora)).find(
    (candidata) => candidata.id === id,
  );

  return {
    periodo,
    consulta,
    variacaoExecucoes: anterior ? variacaoPercentual(consulta.quantidadeExecucoes, anterior.quantidadeExecucoes) : null,
    variacaoTempoMedio: anterior ? variacaoPercentual(consulta.tempoMedioMs, anterior.tempoMedioMs) : null,
    posicao: indice + 1,
    totalDoPeriodo: porPeso.length,
    idAnterior: porPeso[indice - 1]?.id ?? null,
    idSeguinte: porPeso[indice + 1]?.id ?? null,
    pontos,
    trocasDePlano: trocasDePlano(id, agora).filter((troca) => {
      const instante = new Date(troca.instante).getTime();
      return instante >= inicioDaJanela && instante <= agora.getTime();
    }),
  };
}
