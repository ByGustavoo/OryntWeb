import { describe, expect, it } from 'vitest';
import type { ConsultaDetalhadaDTO, PaginaConsultasDTO } from '@/modelos/consultas';
import {
  alternarOrdenacao,
  aplicarMudanca,
  descreverFiltros,
  filtrosIniciais,
  consultaDaPonta,
  intervaloDaPagina,
  lerFiltros,
  lerNumeroDaPagina,
  passoNaLista,
  posicaoNaLista,
  resumirResultado,
  semFiltros,
  temFiltroAtivo,
} from './filtrosConsultas';

const consulta: ConsultaDetalhadaDTO = {
  id: 'q-teste',
  sql: 'SELECT 1',
  tipo: 'SELECT',
  tempoMedioMs: 1,
  tempoMinimoMs: 0.5,
  tempoMaximoMs: 2,
  tempoTotalMs: 10,
  quantidadeExecucoes: 10,
  linhasPorExecucao: 1,
  percentualTempoTotal: 0.1,
  desempenho: 'RAPIDA',
};

function montarPagina(parcial: Partial<PaginaConsultasDTO>): PaginaConsultasDTO {
  return { itens: [], pagina: 1, tamanhoPagina: 25, totalItens: 0, totalPaginas: 0, totalDoPeriodo: 0, ...parcial };
}

describe('filtros da lista de consultas', () => {
  it('começa em 24 horas, sem filtro, pelo maior peso e na primeira página', () => {
    expect(lerFiltros(undefined)).toEqual(filtrosIniciais);
    expect(lerFiltros('texto')).toEqual(filtrosIniciais);
    expect(filtrosIniciais).toMatchObject({ periodo: 'ULTIMAS_24_HORAS', ordenacao: 'PERCENTUAL_TEMPO_TOTAL', direcao: 'DESC', pagina: 1 });
  });

  it('aceita um estado parcial, como o que vem do Dashboard', () => {
    expect(lerFiltros({ periodo: 'ULTIMOS_7_DIAS', desempenho: 'LENTA' })).toEqual({
      ...filtrosIniciais,
      periodo: 'ULTIMOS_7_DIAS',
      desempenho: 'LENTA',
    });
  });

  it('troca cada campo inválido pelo valor inicial, sem descartar os válidos', () => {
    const lidos = lerFiltros({
      periodo: 'ONTEM',
      busca: 42,
      desempenho: 'PESSIMA',
      tipo: 'UPDATE',
      ordenacao: 'ALFABETICA',
      direcao: 'ASC',
      pagina: -3,
    });

    expect(lidos).toEqual({ ...filtrosIniciais, tipo: 'UPDATE', direcao: 'ASC' });
  });

  it('limpa a busca guardada', () => {
    expect(lerFiltros({ busca: '  pedidos   join ' }).busca).toBe('pedidos join');
  });

  it('lê o número da página como inteiro a partir de 1, também quando chega como texto', () => {
    expect(lerNumeroDaPagina(3)).toBe(3);
    expect(lerNumeroDaPagina('12')).toBe(12);
    expect(lerNumeroDaPagina(0)).toBeNull();
    expect(lerNumeroDaPagina(1.5)).toBeNull();
    expect(lerNumeroDaPagina('2a')).toBeNull();
  });

  it('volta à primeira página quando qualquer outro filtro muda', () => {
    const naTerceira = aplicarMudanca(filtrosIniciais, { pagina: 3 });

    expect(naTerceira.pagina).toBe(3);
    expect(aplicarMudanca(naTerceira, { busca: 'pedidos' }).pagina).toBe(1);
    expect(aplicarMudanca(naTerceira, { periodo: 'ULTIMA_HORA' }).pagina).toBe(1);
    expect(aplicarMudanca(naTerceira, { ordenacao: 'EXECUCOES' }).pagina).toBe(1);
    expect(aplicarMudanca(naTerceira, { pagina: 2 }).pagina).toBe(2);
  });

  it('inverte a direção na coluna já ordenada e começa do maior numa coluna nova', () => {
    expect(alternarOrdenacao(filtrosIniciais, 'PERCENTUAL_TEMPO_TOTAL')).toEqual({ ordenacao: 'PERCENTUAL_TEMPO_TOTAL', direcao: 'ASC' });
    expect(alternarOrdenacao({ ...filtrosIniciais, direcao: 'ASC' }, 'PERCENTUAL_TEMPO_TOTAL').direcao).toBe('DESC');
    expect(alternarOrdenacao({ ...filtrosIniciais, direcao: 'ASC' }, 'TEMPO_MAXIMO')).toEqual({ ordenacao: 'TEMPO_MAXIMO', direcao: 'DESC' });
  });

  it('conta como filtro a busca, o desempenho e o tipo, mas não o período nem a ordenação', () => {
    expect(temFiltroAtivo(filtrosIniciais)).toBe(false);
    expect(temFiltroAtivo({ ...filtrosIniciais, periodo: 'ULTIMOS_30_DIAS', ordenacao: 'EXECUCOES', pagina: 2 })).toBe(false);
    expect(temFiltroAtivo({ ...filtrosIniciais, busca: 'pedidos' })).toBe(true);
    expect(temFiltroAtivo({ ...filtrosIniciais, desempenho: 'LENTA' })).toBe(true);
    expect(temFiltroAtivo({ ...filtrosIniciais, tipo: 'DELETE' })).toBe(true);
  });

  it('limpa os três filtros e mantém o período e a ordenação', () => {
    const filtrados = { ...filtrosIniciais, periodo: 'ULTIMOS_7_DIAS' as const, busca: 'pedidos', desempenho: 'LENTA' as const, tipo: 'SELECT' as const };
    const limpos = aplicarMudanca(filtrados, semFiltros());

    expect(temFiltroAtivo(limpos)).toBe(false);
    expect(limpos.periodo).toBe('ULTIMOS_7_DIAS');
  });

  it('informa a primeira e a última linha da página', () => {
    const itens = Array.from({ length: 17 }, () => consulta);

    expect(intervaloDaPagina(montarPagina({ itens, pagina: 2, totalItens: 42, totalPaginas: 2, totalDoPeriodo: 42 }))).toEqual({
      primeiro: 26,
      ultimo: 42,
    });
    expect(intervaloDaPagina(montarPagina({}))).toEqual({ primeiro: 0, ultimo: 0 });
  });

  it('informa a posição da consulta na lista inteira, não só na página', () => {
    const itens = ['a', 'b', 'c'].map((id) => ({ ...consulta, id }));

    expect(posicaoNaLista(montarPagina({ itens, pagina: 1 }), 'b')).toBe(2);
    expect(posicaoNaLista(montarPagina({ itens, pagina: 2 }), 'c')).toBe(28);
    expect(posicaoNaLista(montarPagina({ itens, pagina: 2 }), 'z')).toBeNull();
  });

  it('anda para a consulta vizinha dentro da página', () => {
    const itens = ['a', 'b', 'c'].map((id) => ({ ...consulta, id }));
    const pagina = montarPagina({ itens, pagina: 2, totalItens: 53, totalPaginas: 3 });

    expect(passoNaLista(pagina, 'b', 1)).toEqual({ tipo: 'CONSULTA', consulta: itens[2] });
    expect(passoNaLista(pagina, 'b', -1)).toEqual({ tipo: 'CONSULTA', consulta: itens[0] });
  });

  it('passa para a página vizinha nas pontas e para nos limites da lista', () => {
    const itens = ['a', 'b', 'c'].map((id) => ({ ...consulta, id }));
    const doMeio = montarPagina({ itens, pagina: 2, totalItens: 53, totalPaginas: 3 });

    expect(passoNaLista(doMeio, 'c', 1)).toEqual({ tipo: 'PAGINA', pagina: 3, ponta: 'PRIMEIRA' });
    expect(passoNaLista(doMeio, 'a', -1)).toEqual({ tipo: 'PAGINA', pagina: 1, ponta: 'ULTIMA' });
    expect(passoNaLista({ ...doMeio, pagina: 1 }, 'a', -1)).toBeNull();
    expect(passoNaLista({ ...doMeio, pagina: 3 }, 'c', 1)).toBeNull();
    expect(passoNaLista(doMeio, 'z', 1)).toBeNull();
  });

  it('escolhe a consulta da ponta pedida ao chegar numa página', () => {
    const itens = ['a', 'b', 'c'].map((id) => ({ ...consulta, id }));

    expect(consultaDaPonta(montarPagina({ itens }), 'PRIMEIRA')?.id).toBe('a');
    expect(consultaDaPonta(montarPagina({ itens }), 'ULTIMA')?.id).toBe('c');
    expect(consultaDaPonta(montarPagina({}), 'PRIMEIRA')).toBeNull();
  });

  it('resume o resultado com e sem filtro', () => {
    const pagina = montarPagina({ itens: [consulta], totalItens: 3, totalPaginas: 1, totalDoPeriodo: 42 });

    expect(resumirResultado(pagina, filtrosIniciais)).toBe('42 consultas');
    expect(resumirResultado(pagina, { ...filtrosIniciais, desempenho: 'LENTA' })).toBe('3 de 42 consultas');
    expect(resumirResultado(montarPagina({ totalDoPeriodo: 1 }), filtrosIniciais)).toBe('1 consulta');
    expect(resumirResultado(montarPagina({}), { ...filtrosIniciais, busca: 'x' })).toBe('Nenhuma consulta no período');
  });

  it('descreve os filtros em uso para a mensagem de lista vazia', () => {
    expect(descreverFiltros(filtrosIniciais)).toEqual([]);
    expect(descreverFiltros({ ...filtrosIniciais, busca: 'pedidos', desempenho: 'LENTA', tipo: 'OUTRO' })).toEqual([
      'busca por “pedidos”',
      'desempenho: lentas',
      'comando: Outros',
    ]);
  });
});
