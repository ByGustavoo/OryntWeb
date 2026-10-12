import { beforeEach, describe, expect, it } from 'vitest';
import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { rotasApi } from '@/api/rotasApi';
import { CREDENCIAIS_DEMONSTRACAO } from '../credenciaisDemonstracao';
import {
  expirarCodigoSimulado,
  expirarRedefinicaoSimulada,
  lerCaixaEntradaSimulada,
  reiniciarRecuperacaoSimulada,
} from '../recuperacaoSimulada';
import { redefinirSenha, solicitarRecuperacao, verificarCodigoRecuperacao } from './recuperacaoSenha';

const INICIO = new Date('2026-10-12T12:00:00.000Z');
const EMAIL_SEM_CONTA = 'ninguem@empresa.com';

function depois(segundos: number): Date {
  return new Date(INICIO.getTime() + segundos * 1000);
}

function requisicao(caminho: string, corpo: unknown): RequisicaoTransporte {
  return { metodo: 'POST', caminho, consulta: {}, corpo, cabecalhos: {}, signal: new AbortController().signal };
}

function pedir(email: string, agora = INICIO): RespostaTransporte {
  return solicitarRecuperacao(requisicao(rotasApi.autenticacao.recuperacao, { email }), agora);
}

function verificar(email: string, codigo: string, agora = INICIO): RespostaTransporte {
  return verificarCodigoRecuperacao(requisicao(rotasApi.autenticacao.verificacaoRecuperacao, { email, codigo }), agora);
}

function redefinir(tokenRedefinicao: string, senha: string, agora = INICIO): RespostaTransporte {
  return redefinirSenha(requisicao(rotasApi.autenticacao.novaSenha, { tokenRedefinicao, senha }), agora);
}

function tipoDoProblema(resposta: RespostaTransporte): string {
  return (resposta.corpo as { type: string }).type;
}

function codigoEnviado(): string {
  const codigo = lerCaixaEntradaSimulada()?.codigo;
  if (!codigo) throw new Error('Nenhum código na caixa de entrada simulada.');
  return codigo;
}

function codigoErrado(): string {
  return codigoEnviado() === '000000' ? '111111' : '000000';
}

function tokenLiberado(): string {
  pedir(CREDENCIAIS_DEMONSTRACAO.email);
  const resposta = verificar(CREDENCIAIS_DEMONSTRACAO.email, codigoEnviado());
  return (resposta.corpo as { tokenRedefinicao: string }).tokenRedefinicao;
}

beforeEach(() => {
  reiniciarRecuperacaoSimulada();
});

describe('solicitarRecuperacao', () => {
  it('responde do mesmo jeito para um e-mail com conta e para um sem conta', () => {
    expect(pedir(CREDENCIAIS_DEMONSTRACAO.email)).toEqual(pedir(EMAIL_SEM_CONTA));
    expect(pedir(EMAIL_SEM_CONTA)).toEqual({ status: 202, corpo: undefined });
  });

  it('só gera código para o e-mail que tem conta', () => {
    pedir(EMAIL_SEM_CONTA);
    expect(lerCaixaEntradaSimulada()).toMatchObject({ destinatario: EMAIL_SEM_CONTA, codigo: null });

    pedir(' Demo@Orynt.local ');
    expect(lerCaixaEntradaSimulada()?.codigo).toMatch(/^\d{6}$/);
  });

  it('recusa o e-mail malformado antes de registrar o pedido', () => {
    const resposta = pedir('demo@');
    expect(resposta.status).toBe(400);
    expect(lerCaixaEntradaSimulada()).toBeNull();
  });

  it('mantém o mesmo código quando o reenvio chega antes de 60 segundos', () => {
    pedir(CREDENCIAIS_DEMONSTRACAO.email);
    const primeiro = codigoEnviado();
    expect(pedir(CREDENCIAIS_DEMONSTRACAO.email, depois(59)).status).toBe(202);
    expect(codigoEnviado()).toBe(primeiro);
  });

  it('zera as tentativas quando um novo código é enviado depois do intervalo', () => {
    pedir(CREDENCIAIS_DEMONSTRACAO.email);
    for (let tentativa = 0; tentativa < 5; tentativa += 1) verificar(CREDENCIAIS_DEMONSTRACAO.email, codigoErrado());
    expect(lerCaixaEntradaSimulada()?.esgotada).toBe(true);

    pedir(CREDENCIAIS_DEMONSTRACAO.email, depois(60));
    expect(lerCaixaEntradaSimulada()?.esgotada).toBe(false);
    expect(verificar(CREDENCIAIS_DEMONSTRACAO.email, codigoEnviado(), depois(61)).status).toBe(200);
  });
});

describe('verificarCodigoRecuperacao', () => {
  it('libera a redefinição com o código certo', () => {
    pedir(CREDENCIAIS_DEMONSTRACAO.email);
    const resposta = verificar(CREDENCIAIS_DEMONSTRACAO.email, codigoEnviado());
    expect(resposta.status).toBe(200);
    expect((resposta.corpo as { tokenRedefinicao: string }).tokenRedefinicao).not.toBe('');
  });

  it('dá a mesma resposta para código errado, e-mail sem conta e e-mail que nunca pediu', () => {
    pedir(CREDENCIAIS_DEMONSTRACAO.email);
    const errado = verificar(CREDENCIAIS_DEMONSTRACAO.email, codigoErrado());
    pedir(EMAIL_SEM_CONTA);
    const semConta = verificar(EMAIL_SEM_CONTA, '123456');
    const semPedido = verificar('outra@empresa.com', '123456');

    expect(errado.status).toBe(422);
    expect(tipoDoProblema(errado)).toBe('/problems/invalid-recovery-code');
    expect(semConta).toEqual(errado);
    expect(semPedido).toEqual(errado);
  });

  it('recusa o código certo depois que ele expira', () => {
    pedir(CREDENCIAIS_DEMONSTRACAO.email);
    const codigo = codigoEnviado();
    expect(verificar(CREDENCIAIS_DEMONSTRACAO.email, codigo, depois(10 * 60)).status).toBe(422);
  });

  it('recusa o código certo depois do controle de expiração', () => {
    pedir(CREDENCIAIS_DEMONSTRACAO.email);
    const codigo = codigoEnviado();
    expirarCodigoSimulado();
    expect(verificar(CREDENCIAIS_DEMONSTRACAO.email, codigo).status).toBe(422);
  });

  it('esgota o código na quinta tentativa errada, inclusive para e-mail sem conta', () => {
    for (const email of [CREDENCIAIS_DEMONSTRACAO.email, EMAIL_SEM_CONTA]) {
      pedir(email);
      const respostas = Array.from({ length: 5 }, () => verificar(email, '999999').status);
      expect(respostas.slice(0, 4)).toEqual([422, 422, 422, 422]);
      expect(respostas[4]).toBe(429);
    }
  });

  it('não aceita nem o código certo depois de esgotado', () => {
    pedir(CREDENCIAIS_DEMONSTRACAO.email);
    const codigo = codigoEnviado();
    for (let tentativa = 0; tentativa < 5; tentativa += 1) verificar(CREDENCIAIS_DEMONSTRACAO.email, codigoErrado());
    const resposta = verificar(CREDENCIAIS_DEMONSTRACAO.email, codigo);
    expect(resposta.status).toBe(429);
    expect(tipoDoProblema(resposta)).toBe('/problems/recovery-attempts-exceeded');
  });

  it('não aceita o mesmo código duas vezes', () => {
    pedir(CREDENCIAIS_DEMONSTRACAO.email);
    const codigo = codigoEnviado();
    expect(verificar(CREDENCIAIS_DEMONSTRACAO.email, codigo).status).toBe(200);
    expect(verificar(CREDENCIAIS_DEMONSTRACAO.email, codigo).status).toBe(422);
  });

  it('não conta como tentativa um código incompleto', () => {
    pedir(CREDENCIAIS_DEMONSTRACAO.email);
    for (let tentativa = 0; tentativa < 8; tentativa += 1) {
      expect(verificar(CREDENCIAIS_DEMONSTRACAO.email, '12').status).toBe(422);
    }
    expect(verificar(CREDENCIAIS_DEMONSTRACAO.email, codigoEnviado()).status).toBe(200);
  });
});

describe('redefinirSenha', () => {
  it('aceita a senha nova com o token da verificação', () => {
    expect(redefinir(tokenLiberado(), 'uma senha nova').status).toBe(204);
  });

  it('recusa um token inventado', () => {
    const resposta = redefinir('token-inventado', 'uma senha nova');
    expect(resposta.status).toBe(422);
    expect(tipoDoProblema(resposta)).toBe('/problems/invalid-reset-token');
  });

  it('não aceita o mesmo token duas vezes', () => {
    const token = tokenLiberado();
    expect(redefinir(token, 'uma senha nova').status).toBe(204);
    expect(redefinir(token, 'outra senha nova').status).toBe(422);
  });

  it('mantém o token quando a senha é recusada pela validação', () => {
    const token = tokenLiberado();
    expect(redefinir(token, 'curta').status).toBe(400);
    expect(redefinir(token, 'uma senha nova').status).toBe(204);
  });

  it('recusa o token expirado', () => {
    const token = tokenLiberado();
    expect(redefinir(token, 'uma senha nova', depois(10 * 60)).status).toBe(422);
  });

  it('recusa o token depois do controle de expiração', () => {
    const token = tokenLiberado();
    expirarRedefinicaoSimulada();
    expect(redefinir(token, 'uma senha nova').status).toBe(422);
  });
});
