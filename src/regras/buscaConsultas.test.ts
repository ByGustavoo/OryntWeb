import { describe, expect, it } from 'vitest';
import {
  TAMANHO_MAXIMO_BUSCA,
  correspondeABusca,
  intervalosMarcados,
  limparBusca,
  normalizarParaBusca,
  termosDaBusca,
} from './buscaConsultas';

const sql = 'SELECT c.id, count(p.id) AS total_pedidos FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id';

describe('busca nas consultas', () => {
  it('ignora maiúsculas e acentos sem mudar o tamanho do texto', () => {
    expect(normalizarParaBusca('Avaliação DOS Usuários')).toBe('avaliacao dos usuarios');
    expect(normalizarParaBusca(sql)).toHaveLength(sql.length);
  });

  it('junta os espaços, apara as pontas e corta a busca no limite', () => {
    expect(limparBusca('  pedidos \t  join ')).toBe('pedidos join');
    expect(limparBusca('a'.repeat(TAMANHO_MAXIMO_BUSCA + 30))).toHaveLength(TAMANHO_MAXIMO_BUSCA);
  });

  it('separa a busca em termos, sem repetir e sem termo vazio', () => {
    expect(termosDaBusca('  Pedidos  JOIN pedidos ')).toEqual(['pedidos', 'join']);
    expect(termosDaBusca('   ')).toEqual([]);
  });

  it('exige todos os termos, em qualquer ordem', () => {
    expect(correspondeABusca(sql, termosDaBusca('join clientes'))).toBe(true);
    expect(correspondeABusca(sql, termosDaBusca('clientes estoque'))).toBe(false);
    expect(correspondeABusca(sql, [])).toBe(true);
  });

  it('acha o termo digitado com acento num texto sem acento', () => {
    expect(correspondeABusca('SELECT * FROM avaliacoes', termosDaBusca('avaliações'))).toBe(true);
  });

  it('marca cada ocorrência de cada termo, em ordem', () => {
    const marcados = intervalosMarcados(sql, termosDaBusca('pedidos'));

    expect(marcados.map(({ inicio, fim }) => sql.slice(inicio, fim))).toEqual(['pedidos', 'pedidos']);
    expect(marcados[0]?.inicio).toBe(sql.indexOf('pedidos'));
  });

  it('une as marcas que se tocam ou se sobrepõem', () => {
    const marcados = intervalosMarcados('total_pedidos', termosDaBusca('total_ped pedidos'));

    expect(marcados).toEqual([{ inicio: 0, fim: 'total_pedidos'.length }]);
  });

  it('não marca nada sem termos', () => {
    expect(intervalosMarcados(sql, [])).toEqual([]);
  });
});
