import { describe, expect, it } from 'vitest';
import {
  agruparCodigo,
  codigoCompleto,
  formatarEspera,
  limparCodigo,
  numeroDaEtapa,
  primeiroCampoNovaSenhaComErro,
  segundosAteReenvio,
  validarCamposNovaSenha,
  validarCodigo,
  validarConfirmacao,
  validarEmailRecuperacao,
  validarNovaSenha,
} from './recuperacaoSenha';

describe('validarEmailRecuperacao', () => {
  it('usa as mesmas regras do e-mail do login', () => {
    expect(validarEmailRecuperacao('')).toBe('Informe o seu e-mail.');
    expect(validarEmailRecuperacao('ana@')).toBe('Digite um e-mail completo, como voce@empresa.com.');
    expect(validarEmailRecuperacao(' ana@empresa.com ')).toBeUndefined();
  });
});

describe('limparCodigo', () => {
  it('mantém só os dígitos de um código colado com espaço ou traço', () => {
    expect(limparCodigo('482 913')).toBe('482913');
    expect(limparCodigo('482-913')).toBe('482913');
    expect(limparCodigo(' Código: 482913. ')).toBe('482913');
  });

  it('corta o que passa de seis dígitos', () => {
    expect(limparCodigo('4829137755')).toBe('482913');
  });

  it('descarta texto sem dígitos', () => {
    expect(limparCodigo('abc')).toBe('');
  });
});

describe('codigoCompleto', () => {
  it('só aceita exatamente seis dígitos', () => {
    expect(codigoCompleto('482913')).toBe(true);
    expect(codigoCompleto('48291')).toBe(false);
    expect(codigoCompleto('48291a')).toBe(false);
    expect(codigoCompleto('')).toBe(false);
  });
});

describe('agruparCodigo', () => {
  it('separa o código em dois grupos de três', () => {
    expect(agruparCodigo('482913')).toBe('482 913');
  });
});

describe('validarCodigo', () => {
  it('cobra o código vazio', () => {
    expect(validarCodigo('')).toBe('Informe o código de 6 dígitos que chegou por e-mail.');
  });

  it('diz quantos dígitos faltam', () => {
    expect(validarCodigo('4829')).toBe('O código tem 6 dígitos. Faltam 2.');
    expect(validarCodigo('48291')).toBe('O código tem 6 dígitos. Falta 1.');
  });

  it('aceita o código completo', () => {
    expect(validarCodigo('482913')).toBeUndefined();
  });
});

describe('validarNovaSenha', () => {
  it('cobra a senha vazia', () => {
    expect(validarNovaSenha('')).toBe('Crie uma senha.');
  });

  it('exige oito caracteres', () => {
    expect(validarNovaSenha('1234567')).toBe('Use pelo menos 8 caracteres. Falta 1.');
    expect(validarNovaSenha('12345678')).toBeUndefined();
  });

  it('conta caracteres, não unidades de código', () => {
    expect(validarNovaSenha('🔑🔑🔑🔑')).toBe('Use pelo menos 8 caracteres. Faltam 4.');
    expect(validarNovaSenha('🔑🔑🔑🔑🔑🔑🔑🔑')).toBeUndefined();
  });

  it('não exige mistura de tipos de caractere', () => {
    expect(validarNovaSenha('somente letras minusculas')).toBeUndefined();
  });

  it('limita o tamanho a 128 caracteres', () => {
    expect(validarNovaSenha('a'.repeat(128))).toBeUndefined();
    expect(validarNovaSenha('a'.repeat(129))).toBe('A senha pode ter até 128 caracteres.');
  });

  it('não apara a senha', () => {
    expect(validarNovaSenha('        ')).toBeUndefined();
  });
});

describe('validarConfirmacao', () => {
  it('cobra a confirmação vazia', () => {
    expect(validarConfirmacao('segredo-novo', '')).toBe('Digite a senha de novo para confirmar.');
  });

  it('recusa a confirmação diferente, inclusive por maiúsculas', () => {
    expect(validarConfirmacao('segredo-novo', 'Segredo-novo')).toBe('As duas senhas não são iguais.');
  });

  it('aceita a confirmação igual', () => {
    expect(validarConfirmacao('segredo-novo', 'segredo-novo')).toBeUndefined();
  });
});

describe('validarCamposNovaSenha', () => {
  it('aponta a senha antes da confirmação', () => {
    const erros = validarCamposNovaSenha({ senha: 'curta', confirmacao: '' });
    expect(erros.senha).toBe('Use pelo menos 8 caracteres. Faltam 3.');
    expect(erros.confirmacao).toBe('Digite a senha de novo para confirmar.');
    expect(primeiroCampoNovaSenhaComErro(erros)).toBe('senha');
  });

  it('aponta a confirmação quando só ela está errada', () => {
    const erros = validarCamposNovaSenha({ senha: 'segredo-novo', confirmacao: 'segredo-nova' });
    expect(primeiroCampoNovaSenhaComErro(erros)).toBe('confirmacao');
  });

  it('não aponta nada quando as duas conferem', () => {
    const erros = validarCamposNovaSenha({ senha: 'segredo-novo', confirmacao: 'segredo-novo' });
    expect(erros).toEqual({});
    expect(primeiroCampoNovaSenhaComErro(erros)).toBeNull();
  });
});

describe('segundosAteReenvio', () => {
  it('arredonda para cima e nunca fica negativo', () => {
    expect(segundosAteReenvio(60_000, 0)).toBe(60);
    expect(segundosAteReenvio(60_000, 59_100)).toBe(1);
    expect(segundosAteReenvio(60_000, 60_000)).toBe(0);
    expect(segundosAteReenvio(60_000, 75_000)).toBe(0);
  });

  it('é zero quando nenhum pedido foi feito', () => {
    expect(segundosAteReenvio(null, 1000)).toBe(0);
  });
});

describe('formatarEspera', () => {
  it('escreve minutos e segundos', () => {
    expect(formatarEspera(60)).toBe('1:00');
    expect(formatarEspera(42)).toBe('0:42');
    expect(formatarEspera(5)).toBe('0:05');
    expect(formatarEspera(0)).toBe('0:00');
  });
});

describe('numeroDaEtapa', () => {
  it('numera as três etapas na ordem do fluxo', () => {
    expect(numeroDaEtapa('EMAIL')).toBe(1);
    expect(numeroDaEtapa('CODIGO')).toBe(2);
    expect(numeroDaEtapa('SENHA')).toBe(3);
  });
});
