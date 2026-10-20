import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { PROBLEMAS_ADMINISTRACAO } from '@/modelos/administracao';
import type { ConviteValidoDTO } from '@/modelos/autenticacao';
import { validarNovaSenha } from '@/regras/recuperacaoSenha';
import { registrarEvento } from '../auditoriaSimulada';
import type { ContaSimulada } from '../contasSimuladas';
import { atualizarContaSimulada, autorDaConta, lerContasSimuladas } from '../contasSimuladas';
import { descartarConviteSimulado } from '../convitesSimulados';
import { gerarHashDeSenha, resumoDoToken } from '../hashSenhaSimulada';
import { dadosInvalidos, ok, problema, semConteudo } from '../resposta';

function campoDoCorpo(corpo: unknown, campo: string): string {
  const bruto = corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>)[campo] : undefined;
  return typeof bruto === 'string' ? bruto : '';
}

function conviteInvalido(): RespostaTransporte {
  return problema(
    422,
    'Convite inválido!',
    PROBLEMAS_ADMINISTRACAO.conviteInvalido,
    'O convite não vale mais: ele expirou, já foi usado ou foi substituído por outro.',
  );
}

async function contaDoConvite(token: string, agora: Date): Promise<ContaSimulada | null> {
  if (!token) return null;
  const resumo = await resumoDoToken(token);
  const conta = lerContasSimuladas(agora).find((item) => item.convite?.resumoDoToken === resumo);
  if (!conta?.convite || !conta.ativa) return null;
  return new Date(conta.convite.expiraEm).getTime() > agora.getTime() ? conta : null;
}

export async function verificarConvite(requisicao: RequisicaoTransporte, agora: Date): Promise<RespostaTransporte> {
  const conta = await contaDoConvite(campoDoCorpo(requisicao.corpo, 'token'), agora);
  if (!conta?.convite) return conviteInvalido();
  const valido: ConviteValidoDTO = { nome: conta.nome, email: conta.email, expiraEm: conta.convite.expiraEm };
  return ok(valido);
}

export async function aceitarConvite(requisicao: RequisicaoTransporte, agora: Date): Promise<RespostaTransporte> {
  const conta = await contaDoConvite(campoDoCorpo(requisicao.corpo, 'token'), agora);
  if (!conta) return conviteInvalido();

  const senha = campoDoCorpo(requisicao.corpo, 'senha');
  const erro = validarNovaSenha(senha);
  if (erro) return dadosInvalidos([{ campo: 'senha', mensagem: erro }]);

  const hash = await gerarHashDeSenha(senha);
  atualizarContaSimulada(conta.id, (atual) => ({ ...atual, senha: hash, convite: null, atualizadaEm: agora.toISOString() }));
  descartarConviteSimulado(conta.id);
  registrarEvento({ tipo: 'CONVITE_ACEITO', resultado: 'SUCESSO', conta: autorDaConta(conta) }, agora);
  return semConteudo();
}
