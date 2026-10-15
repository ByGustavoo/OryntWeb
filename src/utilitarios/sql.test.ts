import { describe, expect, it } from 'vitest';
import { destacarSql } from './sql';

describe('destacarSql', () => {
  it('separa as palavras-chave do restante sem perder nenhum caractere', () => {
    const sql = 'SELECT id, email FROM usuarios WHERE lower(email) = lower($1)';
    const trechos = destacarSql(sql);
    expect(trechos.map((trecho) => trecho.texto).join('')).toBe(sql);
    expect(trechos.filter((trecho) => trecho.palavraChave).map((trecho) => trecho.texto)).toEqual(['SELECT', 'FROM', 'WHERE']);
  });

  it('trata palavras-chave compostas como uma só', () => {
    const chaves = destacarSql('SELECT a FROM t LEFT JOIN u ON u.id = t.id GROUP BY a ORDER BY a DESC')
      .filter((trecho) => trecho.palavraChave)
      .map((trecho) => trecho.texto);
    expect(chaves).toEqual(['SELECT', 'FROM', 'LEFT JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'DESC']);
  });

  it('não destaca trechos de identificadores que contêm uma palavra-chave', () => {
    const chaves = destacarSql('UPDATE estoque SET quantidade = 1 WHERE produto_id = $1')
      .filter((trecho) => trecho.palavraChave)
      .map((trecho) => trecho.texto);
    expect(chaves).toEqual(['UPDATE', 'SET', 'WHERE']);
  });

  it('marca os intervalos pedidos sem perder nenhum caractere', () => {
    const sql = 'SELECT * FROM pedidos WHERE cliente_id = $1';
    const inicio = sql.indexOf('pedidos');
    const trechos = destacarSql(sql, [{ inicio, fim: inicio + 'pedidos'.length }]);

    expect(trechos.map((trecho) => trecho.texto).join('')).toBe(sql);
    expect(trechos.filter((trecho) => trecho.marcado).map((trecho) => trecho.texto)).toEqual(['pedidos']);
    expect(trechos.filter((trecho) => trecho.palavraChave).map((trecho) => trecho.texto)).toEqual(['SELECT', 'FROM', 'WHERE']);
  });

  it('marca uma palavra-chave inteira e um trecho que atravessa a fronteira dela', () => {
    const sql = 'SELECT a FROM t';
    const palavra = destacarSql(sql, [{ inicio: 0, fim: 6 }]);
    const atravessado = destacarSql(sql, [{ inicio: 7, fim: 12 }]);

    expect(palavra[0]).toEqual({ texto: 'SELECT', palavraChave: true, marcado: true });
    expect(atravessado.filter((trecho) => trecho.marcado)).toEqual([
      { texto: 'a ', palavraChave: false, marcado: true },
      { texto: 'FRO', palavraChave: true, marcado: true },
    ]);
    expect(atravessado.map((trecho) => trecho.texto).join('')).toBe(sql);
  });

  it('não marca nada sem intervalos', () => {
    expect(destacarSql('SELECT 1').every((trecho) => !trecho.marcado)).toBe(true);
  });
});
