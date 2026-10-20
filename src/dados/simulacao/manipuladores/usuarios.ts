import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { dadosVazios } from '../controles';
import { gerarPapeis } from '../papeis';
import { gerarPermissoes } from '../permissoes';
import { gerarSessoes } from '../sessoes';
import { naoAutorizado, ok } from '../resposta';
import { lerSessaoSimulada } from '../sessaoSimulada';

export function listarPapeis(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const sessao = lerSessaoSimulada();
  if (!sessao) return naoAutorizado();
  return ok(gerarPapeis(agora, sessao.usuario, dadosVazios()));
}

export function listarSessoes(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const sessao = lerSessaoSimulada();
  if (!sessao) return naoAutorizado();
  return ok(gerarSessoes(agora, sessao, dadosVazios()));
}

export function listarPermissoes(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const sessao = lerSessaoSimulada();
  if (!sessao) return naoAutorizado();
  return ok(gerarPermissoes(agora, sessao, dadosVazios()));
}
