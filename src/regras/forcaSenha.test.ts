import { describe, expect, it } from 'vitest';
import { avaliarForcaSenha, termosDoEmail } from './forcaSenha';

const nivel = (senha: string, termos?: string[]) => avaliarForcaSenha(senha, termos)?.nivel;

describe('avaliarForcaSenha', () => {
  it('não avalia a senha vazia', () => {
    expect(avaliarForcaSenha('')).toBeNull();
  });

  it('diz quantos caracteres faltam para o mínimo', () => {
    expect(avaliarForcaSenha('abc')).toMatchObject({ nivel: 'FRACA', pontos: 1, orientacao: 'Faltam 5 caracteres para o mínimo de 8.' });
    expect(avaliarForcaSenha('kT9#mQ2')?.orientacao).toBe('Falta 1 caractere para o mínimo de 8.');
  });

  it.each(['12345678', 'aaaaaaaa', 'abcdefgh', 'password123', 'orynt-demo', 'senha2026'])('trata "%s" como fraca', (senha) => {
    expect(nivel(senha)).toBe('FRACA');
  });

  it('considera razoável a senha curta e variada', () => {
    expect(avaliarForcaSenha('kT9#mQ2x')).toMatchObject({
      nivel: 'RAZOAVEL',
      pontos: 2,
      rotulo: 'Razoável',
      orientacao: 'Uma frase com algumas palavras fica mais forte.',
    });
  });

  it('considera boa a senha média com três tipos de caractere', () => {
    expect(nivel('Tr0ub4dor&3')).toBe('BOA');
  });

  it('considera forte uma frase longa, mesmo só com letras e espaços', () => {
    expect(avaliarForcaSenha('correto cavalo bateria grampo')).toMatchObject({ nivel: 'FORTE', pontos: 4, orientacao: 'Difícil de adivinhar.' });
  });

  it('desconta a palavra comum do comprimento', () => {
    expect(avaliarForcaSenha('minhasenhasecreta')).toMatchObject({
      nivel: 'RAZOAVEL',
      orientacao: 'Evite palavras comuns, sequências e repetições.',
    });
  });

  it('pede variedade para a senha longa de um tipo só', () => {
    expect(avaliarForcaSenha('xkqpwmzrtbvn')).toMatchObject({
      nivel: 'RAZOAVEL',
      orientacao: 'Misture letras, números e símbolos para reforçar.',
    });
  });

  it('desconta partes do e-mail', () => {
    const termos = termosDoEmail('ana.souza@empresa.com');
    expect(avaliarForcaSenha('ana.souza2026!', termos)).toMatchObject({
      nivel: 'FRACA',
      orientacao: 'Evite usar partes do seu e-mail.',
    });
    expect(nivel('Souza!Mesa7Nuvem', termos)).toBe('BOA');
  });

  it('nunca passa de quatro pontos', () => {
    expect(avaliarForcaSenha('Azul!Cadeira7Nuvem#Janela')?.pontos).toBe(4);
  });
});

describe('termosDoEmail', () => {
  it('devolve o usuário inteiro e os seus pedaços', () => {
    expect(termosDoEmail(' Ana.Souza@empresa.com ')).toEqual(['ana.souza', 'ana', 'souza']);
  });

  it('ignora pedaços curtos demais para contar', () => {
    expect(termosDoEmail('jo@empresa.com')).toEqual([]);
  });

  it('não repete o usuário quando ele não tem separador', () => {
    expect(termosDoEmail('demo@orynt.local')).toEqual(['demo']);
  });
});
