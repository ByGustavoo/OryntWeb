import { describe, expect, it } from 'vitest';
import { interpretarUrlConexao } from './urlConexao';

describe('interpretarUrlConexao', () => {
  it('separa usuário, senha, host, porta e banco', () => {
    expect(interpretarUrlConexao('postgresql://analista:segredo@db.loja.com.br:6543/loja')).toEqual({
      valida: true,
      campos: { host: 'db.loja.com.br', porta: '6543', banco: 'loja', usuario: 'analista', senha: 'segredo' },
    });
  });

  it('aceita o esquema curto e usa a porta padrão quando ela falta', () => {
    const resultado = interpretarUrlConexao('  postgres://analista@localhost/loja  ');
    expect(resultado).toEqual({
      valida: true,
      campos: { host: 'localhost', porta: '5432', banco: 'loja', usuario: 'analista', senha: '' },
    });
  });

  it('decodifica caracteres especiais da senha e ignora os parâmetros', () => {
    const resultado = interpretarUrlConexao('postgresql://app:p%40ss%2Fword@10.0.0.12:5432/vendas?sslmode=require');
    expect(resultado.valida && resultado.campos).toMatchObject({ senha: 'p@ss/word', banco: 'vendas', host: '10.0.0.12' });
  });

  it('explica o que há de errado em vez de preencher pela metade', () => {
    expect(interpretarUrlConexao('')).toMatchObject({ valida: false });
    expect(interpretarUrlConexao('db.loja.com.br/loja')).toMatchObject({ valida: false });
    expect(interpretarUrlConexao('mysql://root@localhost/loja')).toEqual({
      valida: false,
      mensagem: 'A URL precisa começar com postgresql:// ou postgres://.',
    });
  });
});
