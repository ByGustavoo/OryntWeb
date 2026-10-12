import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { PROBLEMAS_AUTENTICACAO } from '@/modelos/autenticacao';
import { codigoCompleto, validarEmailRecuperacao, validarNovaSenha } from '@/regras/recuperacaoSenha';
import { mesmoEmail } from '@/regras/validacaoAcesso';
import { CREDENCIAIS_DEMONSTRACAO } from '../credenciaisDemonstracao';
import {
  abrirRedefinicaoSimulada,
  conferirCodigoSimulado,
  encerrarRedefinicaoSimulada,
  redefinicaoSimuladaValida,
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

export function solicitarRecuperacao(requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const email = campoDoCorpo(requisicao.corpo, 'email');
  const erro = validarEmailRecuperacao(email);
  if (erro) return dadosInvalidos([{ campo: 'email', mensagem: erro }]);

  registrarPedidoSimulado(email, mesmoEmail(email, CREDENCIAIS_DEMONSTRACAO.email), agora.getTime());
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

  return ok({ tokenRedefinicao: abrirRedefinicaoSimulada(agora.getTime()) });
}

export function redefinirSenha(requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  const token = campoDoCorpo(requisicao.corpo, 'tokenRedefinicao');
  if (!redefinicaoSimuladaValida(token, agora.getTime())) {
    return problema(
      422,
      'Redefinição expirada!',
      PROBLEMAS_AUTENTICACAO.redefinicaoExpirada,
      'A validação do código não vale mais para trocar a senha.',
    );
  }

  const erro = validarNovaSenha(campoDoCorpo(requisicao.corpo, 'senha'));
  if (erro) return dadosInvalidos([{ campo: 'senha', mensagem: erro }]);

  encerrarRedefinicaoSimulada(token);
  return semConteudo();
}
