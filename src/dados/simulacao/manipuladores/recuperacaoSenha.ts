import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { PROBLEMAS_AUTENTICACAO } from '@/modelos/autenticacao';
import { codigoCompleto, validarEmailRecuperacao, validarNovaSenha } from '@/regras/recuperacaoSenha';
import { registrarEvento } from '../auditoriaSimulada';
import { SENHA_DA_DEMONSTRACAO, atualizarContaSimulada, autorDaConta, contaPorEmail, limparTentativasDeLogin } from '../contasSimuladas';
import { gerarHashDeSenha } from '../hashSenhaSimulada';
import {
  abrirRedefinicaoSimulada,
  conferirCodigoSimulado,
  emailDaRedefinicaoSimulada,
  encerrarRedefinicaoSimulada,
  registrarPedidoSimulado,
} from '../recuperacaoSimulada';
import { aceito, dadosInvalidos, ok, problema, semConteudo } from '../resposta';

function campoDoCorpo(corpo: unknown, campo: string): string {
  const bruto = corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>)[campo] : undefined;
  return typeof bruto === 'string' ? bruto : '';
}

function codigoRecusado(): RespostaTransporte {
  return problema(
    422,
    'Código inválido!',
    PROBLEMAS_AUTENTICACAO.codigoInvalido,
    'O código não confere com o pedido de recuperação ou já expirou.',
  );
}

function redefinicaoExpirada(): RespostaTransporte {
  return problema(
    422,
    'Redefinição expirada!',
    PROBLEMAS_AUTENTICACAO.redefinicaoExpirada,
    'A validação do código não vale mais para trocar a senha.',
  );
}

function contaQueRecupera(email: string) {
  const conta = contaPorEmail(email);
  return conta && conta.ativa && conta.senha !== null ? conta : null;
}

export function solicitarRecuperacao(requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const email = campoDoCorpo(requisicao.corpo, 'email');
  const erro = validarEmailRecuperacao(email);
  if (erro) return dadosInvalidos([{ campo: 'email', mensagem: erro }]);

  const conta = contaQueRecupera(email);
  registrarPedidoSimulado(email, conta !== null, agora.getTime());
  if (conta) registrarEvento({ tipo: 'RECUPERACAO_PEDIDA', resultado: 'SUCESSO', conta: autorDaConta(conta) }, agora);
  return aceito();
}

export function verificarCodigoRecuperacao(requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const email = campoDoCorpo(requisicao.corpo, 'email');
  const codigo = campoDoCorpo(requisicao.corpo, 'codigo');
  const erroEmail = validarEmailRecuperacao(email);
  if (erroEmail) return dadosInvalidos([{ campo: 'email', mensagem: erroEmail }]);
  if (!codigoCompleto(codigo)) return codigoRecusado();

  const resultado = conferirCodigoSimulado(email, codigo, agora.getTime());
  if (resultado === 'ESGOTADO') {
    return problema(
      429,
      'Tentativas esgotadas!',
      PROBLEMAS_AUTENTICACAO.tentativasEsgotadas,
      'O limite de tentativas deste código foi atingido.',
    );
  }
  if (resultado === 'RECUSADO') return codigoRecusado();

  return ok({ tokenRedefinicao: abrirRedefinicaoSimulada(email, agora.getTime()) });
}

export async function redefinirSenha(requisicao: RequisicaoTransporte, agora: Date): Promise<RespostaTransporte> {
  const token = campoDoCorpo(requisicao.corpo, 'tokenRedefinicao');
  const email = emailDaRedefinicaoSimulada(token, agora.getTime());
  if (email === null) return redefinicaoExpirada();

  const senha = campoDoCorpo(requisicao.corpo, 'senha');
  const erro = validarNovaSenha(senha);
  if (erro) return dadosInvalidos([{ campo: 'senha', mensagem: erro }]);

  encerrarRedefinicaoSimulada(token);
  const conta = contaQueRecupera(email);
  if (!conta) return semConteudo();

  const hash = conta.senha === SENHA_DA_DEMONSTRACAO ? SENHA_DA_DEMONSTRACAO : await gerarHashDeSenha(senha);
  atualizarContaSimulada(conta.id, (atual) => ({ ...atual, senha: hash, sessoes: [], atualizadaEm: agora.toISOString() }));
  limparTentativasDeLogin(email);
  registrarEvento({ tipo: 'SENHA_REDEFINIDA', resultado: 'SUCESSO', conta: autorDaConta(conta) }, agora);
  return semConteudo();
}
