import type { DesempenhoConsulta } from '@/modelos/dashboard';
import type { FaixaDesempenhoDTO, PeriodoRelatorio, ResumoRelatorioDTO } from '@/modelos/relatorios';
import { formatarDecimal, formatarDuracaoMs, formatarNumero, formatarPercentual, pluralizar } from '@/utilitarios/formatacao';
import { dataPorExtenso, diaNaFrase, periodoAnteriorNaFrase, periodoNaFrase } from './periodoRelatorio';

export type TipoDestaque = 'VOLUME' | 'CALENDARIO' | 'TEMPO' | 'PICO' | 'LENTAS' | 'CONSULTA' | 'PIORA' | 'MELHORA';
export type TomDestaque = 'neutro' | 'positivo' | 'atencao';

export interface Destaque {
  tipo: TipoDestaque;
  tom: TomDestaque;
  texto: string;
  sql?: string;
}

const MILHAO = 1_000_000;
const BILHAO = 1_000_000_000;
const VARIACAO_DESPREZIVEL = 0.05;

const faixaNaFrase: Record<DesempenhoConsulta, string> = {
  RAPIDA: 'rápidas',
  MODERADA: 'moderadas',
  LENTA: 'lentas',
};

function grandeza(valor: number, unidade: number, singular: string, plural: string): string {
  const reduzido = Math.round((valor / unidade) * 10) / 10;
  return `${formatarDecimal(reduzido, 1)} ${reduzido < 2 ? singular : plural}`;
}

export function quantidadePorExtenso(quantidade: number): string {
  if (quantidade >= BILHAO) return grandeza(quantidade, BILHAO, 'bilhão', 'bilhões');
  if (quantidade >= MILHAO) return grandeza(quantidade, MILHAO, 'milhão', 'milhões');
  return formatarNumero(quantidade);
}

export function consultasPorExtenso(quantidade: number): string {
  if (quantidade >= MILHAO) return `${quantidadePorExtenso(quantidade)} de consultas`;
  return `${formatarNumero(quantidade)} ${pluralizar(quantidade, 'consulta', 'consultas')}`;
}

function percentual(variacao: number): string {
  return formatarPercentual(Math.abs(variacao));
}

function destacarVolume(resumo: ResumoRelatorioDTO): Destaque {
  const { totalConsultas, variacaoTotalConsultas: variacao } = resumo.indicadores;
  const anterior = periodoAnteriorNaFrase[resumo.granularidade];
  const executou = `O banco executou ${consultasPorExtenso(totalConsultas)}`;

  if (variacao === null) return { tipo: 'VOLUME', tom: 'neutro', texto: `${executou}.` };
  if (Math.abs(variacao) < VARIACAO_DESPREZIVEL) {
    return { tipo: 'VOLUME', tom: 'neutro', texto: `${executou}, o mesmo volume ${anterior.de}.` };
  }
  const sentido = variacao > 0 ? 'a mais' : 'a menos';
  return { tipo: 'VOLUME', tom: 'neutro', texto: `${executou}, ${percentual(variacao)} ${sentido} que ${anterior.em}.` };
}

function destacarTempo(resumo: ResumoRelatorioDTO): Destaque {
  const { tempoMedioMs, variacaoTempoMedio: variacao } = resumo.indicadores;
  const anterior = periodoAnteriorNaFrase[resumo.granularidade];
  const ficou = `O tempo médio de execução ficou em ${formatarDuracaoMs(tempoMedioMs)}`;

  if (variacao === null) return { tipo: 'TEMPO', tom: 'neutro', texto: `${ficou}.` };
  if (Math.abs(variacao) < VARIACAO_DESPREZIVEL) {
    return { tipo: 'TEMPO', tom: 'neutro', texto: `${ficou}, igual ao ${anterior.de}.` };
  }
  return variacao < 0
    ? { tipo: 'TEMPO', tom: 'positivo', texto: `${ficou}, ${percentual(variacao)} menor que ${anterior.em}.` }
    : { tipo: 'TEMPO', tom: 'atencao', texto: `${ficou}, ${percentual(variacao)} maior que ${anterior.em}.` };
}

function destacarPico(resumo: ResumoRelatorioDTO): Destaque | null {
  const [primeiro, ...demais] = resumo.evolucao;
  if (!primeiro) return null;
  const pico = demais.reduce((maior, ponto) => (ponto.consultas > maior.consultas ? ponto : maior), primeiro);
  const instante = new Date(pico.instante);
  const quando =
    resumo.granularidade === 'DIA'
      ? `às ${instante.getHours()}h`
      : `${diaNaFrase(instante)}, ${dataPorExtenso(instante, false)}`;

  return {
    tipo: 'PICO',
    tom: 'neutro',
    texto: `O pico de volume foi ${quando}, com ${consultasPorExtenso(pico.consultas)}.`,
  };
}

function destacarConsulta(resumo: ResumoRelatorioDTO): Destaque | null {
  const [primeira, ...demais] = resumo.consultas;
  if (!primeira) return null;
  const consulta = demais.reduce(
    (maior, candidata) => (candidata.percentualTempoTotal > maior.percentualTempoTotal ? candidata : maior),
    primeira,
  );

  return {
    tipo: 'CONSULTA',
    tom: consulta.desempenho === 'LENTA' ? 'atencao' : 'neutro',
    texto: `A consulta que mais pesou respondeu por ${formatarPercentual(consulta.percentualTempoTotal)} do tempo do banco, com tempo médio de ${formatarDuracaoMs(consulta.tempoMedioMs)}.`,
    sql: consulta.sql,
  };
}

export function montarDestaques(resumo: ResumoRelatorioDTO): Destaque[] {
  if (resumo.indicadores.totalConsultas <= 0) return [];
  return [destacarVolume(resumo), destacarTempo(resumo), destacarPico(resumo), destacarConsulta(resumo)].filter(
    (destaque): destaque is Destaque => destaque !== null,
  );
}

export function resumirDesempenho(faixas: FaixaDesempenhoDTO[]): string | null {
  const [primeira, ...demais] = faixas;
  if (!primeira) return null;
  const maior = demais.reduce(
    (atual, faixa) => (faixa.percentualTempoTotal > atual.percentualTempoTotal ? faixa : atual),
    primeira,
  );

  return `As consultas ${faixaNaFrase[maior.desempenho]} fizeram ${formatarPercentual(maior.percentualExecucoes)} das execuções e consumiram ${formatarPercentual(maior.percentualTempoTotal)} do tempo do banco.`;
}

export function cabecalhoDoResumo(nomeConexao: string, periodo: PeriodoRelatorio, simulada: boolean): string {
  const aviso = simulada ? ' (dados demonstrativos)' : '';
  return `Resumo de ${nomeConexao}, ${periodoNaFrase(periodo)}${aviso}`;
}

export function textoDosDestaques(cabecalho: string, destaques: Destaque[]): string {
  const linhas = destaques.flatMap((destaque) =>
    destaque.sql ? [`- ${destaque.texto}`, `  ${destaque.sql}`] : [`- ${destaque.texto}`],
  );
  return [cabecalho, ...linhas].join('\n');
}
