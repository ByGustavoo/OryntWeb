import { describe, expect, it } from 'vitest';
import {
  CAMPOS_ACESSO_INICIAIS,
  mesmoEmail,
  montarCredenciaisAcesso,
  primeiroCampoAcessoComErro,
  validarAcesso,
  validarCampoAcesso,
} from './validacaoAcesso';

describe('validarAcesso', () => {
  it('aceita e-mail e senha preenchidos', () => {
    expect(validarAcesso({ email: 'ana@empresa.com', senha: 'segredo' })).toEqual({});
  });

  it('exige os dois campos no formulário vazio', () => {
    const erros = validarAcesso(CAMPOS_ACESSO_INICIAIS);
    expect(erros.email).toBe('Informe o seu e-mail.');
    expect(erros.senha).toBe('Informe a sua senha.');
  });

  it('trata um e-mail só com espaços como vazio', () => {
    expect(validarCampoAcesso('email', '   ')).toBe('Informe o seu e-mail.');
  });

  it.each(['ana', 'ana@', 'ana@empresa', '@empresa.com', 'ana maria@empresa.com'])(
    'recusa o e-mail incompleto "%s"',
    (email) => {
      expect(validarCampoAcesso('email', email)).toBe('Digite um e-mail completo, como voce@empresa.com.');
    },
  );

  it('aceita e-mail com espaços nas pontas', () => {
    expect(validarCampoAcesso('email', '  ana@empresa.com ')).toBeUndefined();
  });

  it('não apara a senha ao validar', () => {
    expect(validarCampoAcesso('senha', ' ')).toBeUndefined();
  });
});

describe('primeiroCampoAcessoComErro', () => {
  it('aponta o e-mail antes da senha', () => {
    expect(primeiroCampoAcessoComErro(validarAcesso(CAMPOS_ACESSO_INICIAIS))).toBe('email');
  });

  it('aponta a senha quando só ela falta', () => {
    expect(primeiroCampoAcessoComErro(validarAcesso({ email: 'ana@empresa.com', senha: '' }))).toBe('senha');
  });

  it('não aponta nada quando está tudo certo', () => {
    expect(primeiroCampoAcessoComErro({})).toBeNull();
  });
});

describe('montarCredenciaisAcesso', () => {
  it('apara o e-mail e preserva a senha como foi digitada', () => {
    expect(montarCredenciaisAcesso({ email: ' ana@empresa.com ', senha: ' com espaço ' })).toEqual({
      email: 'ana@empresa.com',
      senha: ' com espaço ',
    });
  });
});

describe('mesmoEmail', () => {
  it('ignora maiúsculas e espaços nas pontas', () => {
    expect(mesmoEmail(' Demo@Orynt.local ', 'demo@orynt.local')).toBe(true);
  });

  it('diferencia endereços distintos', () => {
    expect(mesmoEmail('demo@orynt.local', 'outra@orynt.local')).toBe(false);
  });
});
