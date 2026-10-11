import { describe, expect, it } from 'vitest';
import { inicialDoUsuario } from './inicialUsuario';

describe('inicialDoUsuario', () => {
  it('usa a primeira letra do nome, em maiúscula', () => {
    expect(inicialDoUsuario({ nome: 'gustavo', email: 'conta@orynt.local' })).toBe('G');
    expect(inicialDoUsuario({ nome: 'Conta de demonstração', email: 'demo@orynt.local' })).toBe('C');
  });

  it('mantém o acento da primeira letra', () => {
    expect(inicialDoUsuario({ nome: 'érica', email: 'erica@orynt.local' })).toBe('É');
  });

  it('ignora espaços e símbolos antes da primeira letra', () => {
    expect(inicialDoUsuario({ nome: '  (maria)', email: 'conta@orynt.local' })).toBe('M');
  });

  it('recorre ao e-mail quando o nome não tem letra nem número', () => {
    expect(inicialDoUsuario({ nome: '   ', email: 'demo@orynt.local' })).toBe('D');
  });

  it('devolve um marcador quando não há nada para usar', () => {
    expect(inicialDoUsuario({ nome: '', email: '' })).toBe('?');
  });
});
