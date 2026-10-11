import { describe, expect, it } from 'vitest';
import { ErroApi } from '@/api/ErroApi';
import { PROBLEMAS_CONEXAO } from '@/modelos/conexao';
import { interpretarFalhaConexao } from './falhaConexao';

const alvo = { host: 'db.loja.com.br', porta: 5432, banco: 'loja', usuario: 'analista' };

function problema(status: number, tipo: string): ErroApi {
  return new ErroApi(status === 422 ? 'VALIDACAO' : 'SERVIDOR', 'falha', status, {
    status,
    title: 'Falha',
    instance: '/api/conexoes',
    type: `/api${tipo}`,
    detail: 'detalhe técnico',
  });
}

describe('interpretarFalhaConexao', () => {
  it('aponta usuário e senha quando o banco recusa a autenticação', () => {
    const falha = interpretarFalhaConexao(problema(422, PROBLEMAS_CONEXAO.autenticacao), alvo);
    expect(falha.motivo).toBe('AUTENTICACAO');
    expect(falha.campos).toEqual(['usuario', 'senha']);
    expect(falha.descricao).toContain('analista');
  });

  it('aponta host e porta quando o servidor não responde', () => {
    const falha = interpretarFalhaConexao(problema(502, PROBLEMAS_CONEXAO.servidorInacessivel), alvo);
    expect(falha.motivo).toBe('SERVIDOR_INACESSIVEL');
    expect(falha.campos).toEqual(['host', 'porta']);
    expect(falha.descricao).toContain('db.loja.com.br:5432');
  });

  it('aponta o banco quando ele não existe', () => {
    const falha = interpretarFalhaConexao(problema(422, PROBLEMAS_CONEXAO.bancoInexistente), alvo);
    expect(falha.motivo).toBe('BANCO_INEXISTENTE');
    expect(falha.campos).toEqual(['banco']);
  });

  it('trata o tempo esgotado do banco e o do navegador do mesmo jeito', () => {
    expect(interpretarFalhaConexao(problema(504, PROBLEMAS_CONEXAO.tempoEsgotado), alvo).motivo).toBe('TEMPO_ESGOTADO');
    expect(interpretarFalhaConexao(new ErroApi('TEMPO_ESGOTADO', 'demorou'), alvo).motivo).toBe('TEMPO_ESGOTADO');
  });

  it('distingue a falta de resposta do próprio Orynt', () => {
    expect(interpretarFalhaConexao(new ErroApi('REDE', 'sem rede'), alvo).motivo).toBe('SEM_RESPOSTA');
  });

  it('nunca mostra o detalhe técnico e sempre diz o que fazer', () => {
    for (const erro of [problema(500, '/problems/outro'), new Error('qualquer'), null]) {
      const falha = interpretarFalhaConexao(erro, alvo);
      expect(falha.motivo).toBe('DESCONHECIDO');
      expect(falha.descricao).not.toContain('detalhe técnico');
      expect(falha.orientacao.length).toBeGreaterThan(0);
    }
  });
});
