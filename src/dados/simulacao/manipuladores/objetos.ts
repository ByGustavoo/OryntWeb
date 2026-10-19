import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { dadosVazios } from '../controles';
import { gerarIndices } from '../indices';
import { naoAutorizado, ok } from '../resposta';
import { lerSessaoSimulada } from '../sessaoSimulada';
import { gerarVisoes } from '../visoes';

export function listarVisoes(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  if (!lerSessaoSimulada()) return naoAutorizado();
  return ok(gerarVisoes(agora, dadosVazios()));
}

export function listarIndices(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  if (!lerSessaoSimulada()) return naoAutorizado();
  return ok(gerarIndices(agora, dadosVazios()));
}
