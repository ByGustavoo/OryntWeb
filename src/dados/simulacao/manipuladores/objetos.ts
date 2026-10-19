import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { dadosVazios, rastreamentoDasFuncoes } from '../controles';
import { gerarFuncoes } from '../funcoes';
import { gerarIndices } from '../indices';
import { naoAutorizado, ok } from '../resposta';
import { lerSessaoSimulada } from '../sessaoSimulada';
import { gerarTabelas } from '../tabelas';
import { gerarVisoes } from '../visoes';

export function listarVisoes(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  if (!lerSessaoSimulada()) return naoAutorizado();
  return ok(gerarVisoes(agora, dadosVazios()));
}

export function listarIndices(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  if (!lerSessaoSimulada()) return naoAutorizado();
  return ok(gerarIndices(agora, dadosVazios()));
}

export function listarTabelas(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  if (!lerSessaoSimulada()) return naoAutorizado();
  return ok(gerarTabelas(agora, dadosVazios()));
}

export function listarFuncoes(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  if (!lerSessaoSimulada()) return naoAutorizado();
  return ok(gerarFuncoes(agora, dadosVazios(), rastreamentoDasFuncoes()));
}
