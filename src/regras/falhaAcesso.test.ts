import { describe, expect, it } from 'vitest';
import { ErroApi } from '@/api/ErroApi';
import { interpretarFalhaAcesso } from './falhaAcesso';

describe('interpretarFalhaAcesso', () => {
  it('reconhece credenciais recusadas sem dizer qual campo está errado', () => {
    const falha = interpretarFalhaAcesso(new ErroApi('NAO_AUTORIZADO', 'Credenciais inválidas!', 401));
    expect(falha.motivo).toBe('CREDENCIAIS_INCORRETAS');
    expect(falha.titulo).toBe('E-mail ou senha incorretos');
  });

  it('separa a falta de resposta das credenciais incorretas', () => {
    expect(interpretarFalhaAcesso(new ErroApi('REDE', 'Sem rede.')).motivo).toBe('SEM_RESPOSTA');
    expect(interpretarFalhaAcesso(new ErroApi('TEMPO_ESGOTADO', 'Demorou.')).motivo).toBe('TEMPO_ESGOTADO');
  });

  it('trata dados recusados pela validação do servidor', () => {
    expect(interpretarFalhaAcesso(new ErroApi('VALIDACAO', 'Erro de Validação!', 400)).motivo).toBe('DADOS_INVALIDOS');
  });

  it('não expõe o detalhe técnico de um erro inesperado', () => {
    const falha = interpretarFalhaAcesso(new Error('stack interna'));
    expect(falha.motivo).toBe('DESCONHECIDO');
    expect(falha.descricao).not.toContain('stack interna');
  });
});
