import { describe, expect, it } from 'vitest';
import { ErroApi } from '@/api/ErroApi';
import { interpretarFalhaRecuperacao } from './falhaRecuperacao';

function erroComProblema(tipo: ConstructorParameters<typeof ErroApi>[0], status: number, problema: string): ErroApi {
  return new ErroApi(tipo, 'x', status, { status, title: 'x', instance: '/api/x', type: `/api${problema}`, detail: 'detalhe interno' });
}

describe('interpretarFalhaRecuperacao', () => {
  it('usa uma única mensagem para código errado, expirado ou de e-mail sem conta', () => {
    const falha = interpretarFalhaRecuperacao(erroComProblema('VALIDACAO', 422, '/problems/invalid-recovery-code'), 'CODIGO');
    expect(falha.motivo).toBe('CODIGO_INVALIDO');
    expect(falha.titulo).toBe('Código incorreto ou expirado');
    expect(falha.descricao).not.toMatch(/cadastr|conta|existe/i);
  });

  it('reconhece as tentativas esgotadas pelo tipo do problema', () => {
    const falha = interpretarFalhaRecuperacao(
      erroComProblema('LIMITE_EXCEDIDO', 429, '/problems/recovery-attempts-exceeded'),
      'CODIGO',
    );
    expect(falha.motivo).toBe('TENTATIVAS_ESGOTADAS');
  });

  it('reconhece a redefinição expirada na etapa da senha', () => {
    const falha = interpretarFalhaRecuperacao(erroComProblema('VALIDACAO', 422, '/problems/invalid-reset-token'), 'SENHA');
    expect(falha.motivo).toBe('REDEFINICAO_EXPIRADA');
  });

  it('trata um 429 sem tipo conhecido como excesso de pedidos', () => {
    expect(interpretarFalhaRecuperacao(new ErroApi('LIMITE_EXCEDIDO', 'x', 429), 'EMAIL').motivo).toBe('MUITOS_PEDIDOS');
  });

  it('separa validação, rede e tempo esgotado', () => {
    expect(interpretarFalhaRecuperacao(new ErroApi('VALIDACAO', 'x', 400), 'EMAIL').motivo).toBe('DADOS_INVALIDOS');
    expect(interpretarFalhaRecuperacao(new ErroApi('REDE', 'x'), 'EMAIL').motivo).toBe('SEM_RESPOSTA');
    expect(interpretarFalhaRecuperacao(new ErroApi('TEMPO_ESGOTADO', 'x'), 'EMAIL').motivo).toBe('TEMPO_ESGOTADO');
  });

  it('nomeia a etapa no erro inesperado, sem expor o detalhe técnico', () => {
    expect(interpretarFalhaRecuperacao(new Error('stack interna'), 'EMAIL').titulo).toBe('Não foi possível enviar o pedido');
    expect(interpretarFalhaRecuperacao(new Error('stack interna'), 'CODIGO').titulo).toBe('Não foi possível validar o código');
    const falha = interpretarFalhaRecuperacao(new ErroApi('SERVIDOR', 'NullPointerException', 500), 'SENHA');
    expect(falha.titulo).toBe('Não foi possível salvar a nova senha');
    expect(falha.descricao).not.toContain('NullPointerException');
  });
});
