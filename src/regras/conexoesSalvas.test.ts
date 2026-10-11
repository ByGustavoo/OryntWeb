import { describe, expect, it } from 'vitest';
import type { ConexaoDTO, ConexaoSalvaDTO } from '@/modelos/conexao';
import {
  conexaoMaisRecente,
  enderecoConexao,
  lerConexoesSalvas,
  ordenarPorUso,
  registrarConexaoSalva,
  removerConexaoSalva,
  renomearConexaoSalva,
  salvaDaConexao,
  validarNomeConexaoSalva,
} from './conexoesSalvas';

const loja: ConexaoSalvaDTO = {
  id: 'c-loja',
  tipoBanco: 'POSTGRESQL',
  nome: 'Loja',
  host: 'db.loja.com.br',
  porta: 5432,
  banco: 'loja',
  usuario: 'analista',
  ultimoUsoEm: '2026-10-01T00:00:00.000Z',
};

const estoque: ConexaoSalvaDTO = { ...loja, id: 'c-estoque', nome: 'Estoque', banco: 'estoque', ultimoUsoEm: '2026-10-05T00:00:00.000Z' };

describe('ordenarPorUso', () => {
  it('põe a conexão usada por último no topo, sem alterar a lista recebida', () => {
    const lista = [loja, estoque];
    expect(ordenarPorUso(lista).map((item) => item.id)).toEqual(['c-estoque', 'c-loja']);
    expect(lista.map((item) => item.id)).toEqual(['c-loja', 'c-estoque']);
  });
});

describe('conexaoMaisRecente', () => {
  it('devolve a conexão usada por último', () => {
    expect(conexaoMaisRecente([loja, estoque])?.id).toBe('c-estoque');
  });

  it('devolve nulo quando não há conexão salva', () => {
    expect(conexaoMaisRecente([])).toBeNull();
  });
});

describe('salvaDaConexao', () => {
  it('guarda o instante da conexão como último uso e não leva campos da sessão', () => {
    const conexao: ConexaoDTO = {
      id: 'c-loja',
      tipoBanco: 'POSTGRESQL',
      nome: 'Loja',
      host: 'db.loja.com.br',
      porta: 5432,
      banco: 'loja',
      usuario: 'analista',
      versaoServidor: 'PostgreSQL 16.4',
      conectadaEm: '2026-10-10T12:00:00.000Z',
      simulada: true,
    };
    expect(salvaDaConexao(conexao)).toEqual({ ...loja, ultimoUsoEm: '2026-10-10T12:00:00.000Z' });
  });
});

describe('registrarConexaoSalva', () => {
  it('acrescenta uma conexão nova e mantém a ordem por uso', () => {
    const lista = registrarConexaoSalva([loja], estoque);
    expect(lista.map((item) => item.id)).toEqual(['c-estoque', 'c-loja']);
  });

  it('substitui a conexão de mesmo id em vez de repetir', () => {
    const lista = registrarConexaoSalva([loja, estoque], { ...loja, nome: 'Loja nova', ultimoUsoEm: '2026-10-10T00:00:00.000Z' });
    expect(lista).toHaveLength(2);
    expect(lista[0]).toMatchObject({ id: 'c-loja', nome: 'Loja nova' });
  });

  it('não repete o mesmo banco, mesmo com outro id e o host em outra caixa', () => {
    const lista = registrarConexaoSalva([loja], { ...loja, id: 'c-outra', host: 'DB.LOJA.COM.BR' });
    expect(lista.map((item) => item.id)).toEqual(['c-outra']);
  });
});

describe('renomearConexaoSalva', () => {
  it('troca só o nome da conexão pedida', () => {
    const lista = renomearConexaoSalva([loja, estoque], 'c-loja', 'Loja — produção');
    expect(lista.map((item) => item.nome)).toEqual(['Loja — produção', 'Estoque']);
  });
});

describe('removerConexaoSalva', () => {
  it('tira só a conexão pedida', () => {
    expect(removerConexaoSalva([loja, estoque], 'c-loja').map((item) => item.id)).toEqual(['c-estoque']);
  });
});

describe('validarNomeConexaoSalva', () => {
  it('exige um nome', () => {
    expect(validarNomeConexaoSalva('   ')).toBe('Informe um nome para a conexão.');
  });

  it('limita o nome a 60 caracteres', () => {
    expect(validarNomeConexaoSalva('a'.repeat(61))).toBe('O nome pode ter até 60 caracteres.');
    expect(validarNomeConexaoSalva('a'.repeat(60))).toBeUndefined();
  });
});

describe('enderecoConexao', () => {
  it('monta usuário, servidor, porta e banco', () => {
    expect(enderecoConexao(loja)).toBe('analista@db.loja.com.br:5432/loja');
  });
});

describe('lerConexoesSalvas', () => {
  it('descarta o que não tem o formato esperado e qualquer campo a mais, como uma senha', () => {
    const lidas = lerConexoesSalvas([{ ...loja, senha: 'segredo' }, { host: 'sem-porta' }, 'texto', null]);
    expect(lidas).toEqual([loja]);
    expect(JSON.stringify(lidas)).not.toContain('segredo');
  });

  it('devolve a lista já ordenada por uso', () => {
    expect(lerConexoesSalvas([loja, estoque]).map((item) => item.id)).toEqual(['c-estoque', 'c-loja']);
  });

  it('devolve lista vazia quando o valor salvo não é uma lista', () => {
    expect(lerConexoesSalvas('{}')).toEqual([]);
    expect(lerConexoesSalvas(null)).toEqual([]);
  });
});
