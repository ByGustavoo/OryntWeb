import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import { periodosDashboard } from '@/modelos/rotulos';
import { dadosVazios } from '../controles';
import { dadosInvalidos, naoAutorizado, ok } from '../resposta';
import { lerSessaoSimulada } from '../sessaoSimulada';
import { gerarAtividade, gerarConsultas, gerarIndicadores, indicadoresVazios } from '../series';

type Gerador = (periodo: PeriodoDashboard, agora: Date) => unknown;

function lerPeriodo(requisicao: RequisicaoTransporte): PeriodoDashboard | null {
  const valor = requisicao.consulta.periodo;
  if (valor === undefined || valor === null || valor === '') return 'ULTIMAS_24_HORAS';
  return periodosDashboard.find((periodo) => periodo === valor) ?? null;
}

function atender(requisicao: RequisicaoTransporte, agora: Date, gerar: Gerador, vazio: Gerador): RespostaTransporte {
  if (!lerSessaoSimulada()) return naoAutorizado();
  const periodo = lerPeriodo(requisicao);
  if (!periodo) {
    return dadosInvalidos([{ campo: 'periodo', mensagem: `Use um destes períodos: ${periodosDashboard.join(', ')}.` }]);
  }
  return ok((dadosVazios() ? vazio : gerar)(periodo, agora));
}

export function buscarIndicadores(requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  return atender(requisicao, agora, gerarIndicadores, indicadoresVazios);
}

export function buscarAtividade(requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  return atender(requisicao, agora, gerarAtividade, () => []);
}

export function buscarConsultas(requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  return atender(requisicao, agora, gerarConsultas, () => []);
}
