import { describe, expect, it } from 'vitest';
import {
  CAMPOS_CONEXAO_INICIAIS,
  montarCredenciais,
  primeiroCampoComErro,
  validarCampo,
  validarConexao,
} from './validacaoConexao';
import type { CamposConexao } from './validacaoConexao';

const validos: CamposConexao = {
  nome: 'Loja — produção',
  host: 'db.loja.com.br',
  porta: '5432',
  banco: 'loja',
  usuario: 'analista',
  senha: 'segredo',
};

describe('validarConexao', () => {
  it('aceita uma conexão completa', () => {
    expect(validarConexao(validos)).toEqual({});
  });

  it('aceita a conexão sem nome, que é opcional', () => {
    expect(validarConexao({ ...validos, nome: '' })).toEqual({});
  });

  it('exige host, banco, usuário e senha no formulário inicial', () => {
    const erros = validarConexao(CAMPOS_CONEXAO_INICIAIS);
    expect(Object.keys(erros)).toEqual(['host', 'banco', 'usuario', 'senha']);
    expect(primeiroCampoComErro(erros)).toBe('host');
  });

  it('começa com a porta padrão do PostgreSQL', () => {
    expect(CAMPOS_CONEXAO_INICIAIS.porta).toBe('5432');
    expect(validarCampo('porta', CAMPOS_CONEXAO_INICIAIS.porta)).toBeUndefined();
  });
});

describe('validarCampo', () => {
  it('recusa host com protocolo, espaço ou caminho', () => {
    expect(validarCampo('host', 'postgresql://db.loja.com')).toContain('sem "postgresql://"');
    expect(validarCampo('host', 'db loja')).toContain('espaços');
    expect(validarCampo('host', 'db.loja.com/loja')).toContain('campo próprio');
  });

  it('aceita domínio, localhost, IPv4 e IPv6', () => {
    for (const host of ['db.loja.com.br', 'localhost', '10.0.0.12', '[::1]', 'pg_interno-01']) {
      expect(validarCampo('host', host)).toBeUndefined();
    }
  });

  it('recusa porta vazia, com letras ou fora da faixa', () => {
    expect(validarCampo('porta', '')).toBe('Informe a porta.');
    expect(validarCampo('porta', '54a2')).toBe('A porta tem só números.');
    expect(validarCampo('porta', '0')).toContain('entre 1 e 65535');
    expect(validarCampo('porta', '70000')).toContain('entre 1 e 65535');
  });

  it('limita banco e usuário aos 63 caracteres de um identificador do PostgreSQL', () => {
    expect(validarCampo('banco', 'a'.repeat(63))).toBeUndefined();
    expect(validarCampo('banco', 'a'.repeat(64))).toContain('até 63');
    expect(validarCampo('usuario', 'a'.repeat(64))).toContain('até 63');
  });

  it('não corta espaços da senha, que podem fazer parte dela', () => {
    expect(validarCampo('senha', '  ')).toBeUndefined();
    expect(validarCampo('senha', '')).toBe('Informe a senha.');
  });
});

describe('montarCredenciais', () => {
  it('limpa os espaços, converte a porta e mantém a senha intacta', () => {
    expect(montarCredenciais({ ...validos, host: ' db.loja.com.br ', porta: ' 6543 ', senha: ' se gredo ' })).toEqual({
      tipoBanco: 'POSTGRESQL',
      nome: 'Loja — produção',
      host: 'db.loja.com.br',
      porta: 6543,
      banco: 'loja',
      usuario: 'analista',
      senha: ' se gredo ',
    });
  });

  it('envia nome nulo quando ele fica em branco', () => {
    expect(montarCredenciais({ ...validos, nome: '   ' }).nome).toBeNull();
  });
});
