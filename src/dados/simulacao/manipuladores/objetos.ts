import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { donoComAlteracoes } from '../alteracoesSimuladas';
import { dadosVazios, rastreamentoDasFuncoes } from '../controles';
import { gerarFuncoes } from '../funcoes';
import { gerarIndices } from '../indices';
import { naoAutorizado, ok } from '../resposta';
import { lerSessaoSimulada } from '../sessaoSimulada';
import { gerarTabelas } from '../tabelas';
import { gerarVisoes } from '../visoes';

function comDonos<T extends { dono: string }>(itens: T[], conexao: string): T[] {
  const dono = donoComAlteracoes(conexao);
  return itens.map((item) => ({ ...item, dono: dono(item.dono) }));
}

export function listarVisoes(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const sessao = lerSessaoSimulada();
  if (!sessao) return naoAutorizado();
  const lista = gerarVisoes(agora, dadosVazios());
  return ok({ ...lista, visoes: comDonos(lista.visoes, sessao.id) });
}

export function listarIndices(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  if (!lerSessaoSimulada()) return naoAutorizado();
  return ok(gerarIndices(agora, dadosVazios()));
}

export function listarTabelas(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const sessao = lerSessaoSimulada();
  if (!sessao) return naoAutorizado();
  const lista = gerarTabelas(agora, dadosVazios());
  return ok({ ...lista, tabelas: comDonos(lista.tabelas, sessao.id) });
}

export function listarFuncoes(_requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const sessao = lerSessaoSimulada();
  if (!sessao) return naoAutorizado();
  const lista = gerarFuncoes(agora, dadosVazios(), rastreamentoDasFuncoes());
  return ok({ ...lista, funcoes: comDonos(lista.funcoes, sessao.id) });
}
