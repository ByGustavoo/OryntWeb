import { describe, expect, it } from 'vitest';
import { lerConexoesRecentes, registrarConexaoRecente, removerConexaoRecente } from './conexoesRecentes';

const loja = { nome: 'Loja', host: 'db.loja.com.br', porta: 5432, banco: 'loja', usuario: 'analista' };
const agora = new Date('2026-10-10T12:00:00.000Z');

describe('registrarConexaoRecente', () => {
  it('coloca a conexão usada por último no topo', () => {
    const lista = registrarConexaoRecente([{ ...loja, banco: 'estoque', usadaEm: '2026-10-01T00:00:00.000Z' }], loja, agora);
    expect(lista.map((item) => item.banco)).toEqual(['loja', 'estoque']);
    expect(lista[0]?.usadaEm).toBe('2026-10-10T12:00:00.000Z');
  });

  it('não repete a mesma conexão, mesmo com o host em outra caixa', () => {
    const lista = registrarConexaoRecente(
      [{ ...loja, usadaEm: '2026-10-01T00:00:00.000Z' }],
      { ...loja, host: 'DB.LOJA.COM.BR' },
      agora,
    );
    expect(lista).toHaveLength(1);
  });

  it('guarda no máximo cinco', () => {
    let lista = registrarConexaoRecente([], loja, agora);
    for (let indice = 0; indice < 7; indice += 1) {
      lista = registrarConexaoRecente(lista, { ...loja, banco: `banco${indice}` }, agora);
    }
    expect(lista).toHaveLength(5);
    expect(lista[0]?.banco).toBe('banco6');
  });

  it('nunca carrega uma senha, mesmo que ela venha junto', () => {
    const comSenha = { ...loja, senha: 'segredo' };
    expect(JSON.stringify(registrarConexaoRecente([], comSenha, agora))).not.toContain('segredo');
  });
});

describe('removerConexaoRecente', () => {
  it('tira só a conexão pedida', () => {
    const lista = registrarConexaoRecente(registrarConexaoRecente([], loja, agora), { ...loja, banco: 'estoque' }, agora);
    expect(removerConexaoRecente(lista, loja).map((item) => item.banco)).toEqual(['estoque']);
  });
});

describe('lerConexoesRecentes', () => {
  it('descarta o que não tem o formato esperado e qualquer campo a mais', () => {
    const lidas = lerConexoesRecentes([
      { ...loja, usadaEm: '2026-10-01T00:00:00.000Z', senha: 'segredo' },
      { host: 'sem-porta' },
      'texto',
      null,
    ]);
    expect(lidas).toEqual([{ ...loja, usadaEm: '2026-10-01T00:00:00.000Z' }]);
  });

  it('devolve lista vazia quando o valor salvo não é uma lista', () => {
    expect(lerConexoesRecentes('{}')).toEqual([]);
    expect(lerConexoesRecentes(null)).toEqual([]);
  });
});
