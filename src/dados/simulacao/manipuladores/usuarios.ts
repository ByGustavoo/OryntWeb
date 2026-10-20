import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { papeisComAlteracoes, permissoesComAlteracoes, renomeacoesAplicadas } from '../alteracoesSimuladas';
import { dadosVazios } from '../controles';
import { gerarPapeis } from '../papeis';
import { gerarPermissoes } from '../permissoes';
import { gerarSessoes } from '../sessoes';
import { naoAutorizado, ok } from '../resposta';
import { lerSessaoSimulada } from '../sessaoSimulada';

export function listarPapeis(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const sessao = lerSessaoSimulada();
  if (!sessao) return naoAutorizado();
  return ok(papeisComAlteracoes(gerarPapeis(agora, sessao.usuario, dadosVazios()), sessao.id, agora));
}

export function listarSessoes(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const sessao = lerSessaoSimulada();
  if (!sessao) return naoAutorizado();
  const lista = papeisComAlteracoes(gerarPapeis(agora, sessao.usuario, false, false), sessao.id, agora);
  return ok(gerarSessoes(agora, sessao, dadosVazios(), { lista, renomeacoes: renomeacoesAplicadas(sessao.id) }));
}

export function listarPermissoes(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const sessao = lerSessaoSimulada();
  if (!sessao) return naoAutorizado();
  return ok(permissoesComAlteracoes(gerarPermissoes(agora, sessao, dadosVazios()), sessao.id));
}
