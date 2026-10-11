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
});
