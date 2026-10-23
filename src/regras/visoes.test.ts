import { describe, expect, it } from 'vitest';
import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import type { MaterializacaoDTO, ReferenciaObjetoDTO, VisaoDTO } from '@/modelos/objetos';
import {
  alternarOrdenacaoVisoes,
  aplicarMudancaVisoes,
  avisosDaVisao,
  definicaoLegivel,
  descreverFiltrosVisoes,
  filtrarVisoes,
  filtrosVisoesIniciais,
  lerFiltrosVisoes,
  pontosDeAtencao,
  resumirVisoes,
  situacaoDaMaterializada,
  visoesSemLeitura,
} from './visoes';

const geradoEm = '2026-10-14T13:00:00.000Z';

function consulta(id: string, quantidadeExecucoes: number, tempoTotalMs = 1000): ConsultaDetalhadaDTO {
  return {
    id,
    sql: `SELECT 1 /* ${id} */`,
    tempoMedioMs: tempoTotalMs / Math.max(1, quantidadeExecucoes),
    quantidadeExecucoes,
    percentualTempoTotal: 1,
    desempenho: 'RAPIDA',
    tipo: 'SELECT',
    tempoTotalMs,
    tempoMinimoMs: 1,
    tempoMaximoMs: 2,
    linhasPorExecucao: 1,
  };
}

function materializacao(mudanca: Partial<MaterializacaoDTO> = {}): MaterializacaoDTO {
  return { populada: true, tamanhoBytes: 1024, linhas: 10, ultimaAtualizacao: geradoEm, atualizacao: null, ...mudanca };
}

function visao(id: string, mudanca: Partial<VisaoDTO> = {}): VisaoDTO {
  const [esquema = 'public', nome = id] = id.split('.');
  return {
    id,
    tipo: mudanca.materializacao ? 'MATERIALIZADA' : 'COMUM',
    esquema,
    nome,
    dono: 'loja_app',
    descricao: null,
    definicao: ' SELECT 1;',
    colunas: [],
    dependeDe: [],
    usadaPor: [],
    consultas: [],
    materializacao: null,
    ...mudanca,
  };
}

function ref(id: string, tipo: ReferenciaObjetoDTO['tipo'] = 'VISAO'): ReferenciaObjetoDTO {
  const [esquema = '', nome = ''] = id.split('.');
  return { tipo, esquema, nome };
}

describe('definicaoLegivel', () => {
  it('tira o recuo que o PostgreSQL deixa em todas as linhas e mantém o resto', () => {
    expect(definicaoLegivel(' SELECT a.id,\n    a.nome\n   FROM a\n  WHERE a.ativo;\n')).toBe(
      'SELECT a.id,\n   a.nome\n  FROM a\n WHERE a.ativo;',
    );
    expect(definicaoLegivel('SELECT 1;')).toBe('SELECT 1;');
  });
});

describe('situacaoDaMaterializada', () => {
  it('separa as views comuns, as sem dados, as recentes e as de mais de 24 horas', () => {
    expect(situacaoDaMaterializada(visao('public.a'), geradoEm)).toBeNull();
    expect(situacaoDaMaterializada(visao('r.b', { materializacao: materializacao({ populada: false }) }), geradoEm)).toBe(
      'NAO_POPULADA',
    );
    expect(
      situacaoDaMaterializada(visao('r.c', { materializacao: materializacao({ ultimaAtualizacao: '2026-10-13T13:00:00.000Z' }) }), geradoEm),
    ).toBe('ATUALIZADA');
    expect(
      situacaoDaMaterializada(visao('r.d', { materializacao: materializacao({ ultimaAtualizacao: '2026-10-13T12:59:00.000Z' }) }), geradoEm),
    ).toBe('DESATUALIZADA');
    expect(situacaoDaMaterializada(visao('r.e', { materializacao: materializacao({ ultimaAtualizacao: null }) }), geradoEm)).toBe(
      'DESATUALIZADA',
    );
  });
});

describe('visoesSemLeitura', () => {
  it('conta como lida a view lida por outra view ou pela atualização de uma materializada', () => {
    const visoes = [
      visao('public.base', { usadaPor: [ref('public.meio')] }),
      visao('public.meio', { dependeDe: [ref('public.base')], usadaPor: [ref('public.topo')] }),
      visao('public.topo', { dependeDe: [ref('public.meio')], consultas: [consulta('q-topo', 10)] }),
      visao('public.fonte', { usadaPor: [ref('r.copia', 'VISAO_MATERIALIZADA')] }),
      visao('r.copia', {
        dependeDe: [ref('public.fonte')],
        materializacao: materializacao({ atualizacao: consulta('q-refresh', 3) }),
      }),
      visao('public.esquecida'),
    ];

    expect([...visoesSemLeitura(visoes)].sort()).toEqual(['public.esquecida', 'r.copia']);
  });

  it('não conta a atualização sem execução no período', () => {
    const visoes = [
      visao('public.fonte', { usadaPor: [ref('r.copia', 'VISAO_MATERIALIZADA')] }),
      visao('r.copia', { dependeDe: [ref('public.fonte')], materializacao: materializacao({ atualizacao: consulta('q', 0) }) }),
    ];

    expect([...visoesSemLeitura(visoes)].sort()).toEqual(['public.fonte', 'r.copia']);
  });
});

describe('filtros das views', () => {
  const visoes = [
    visao('public.produtos_ativos', { descricao: 'Os produtos à venda.', consultas: [consulta('q1', 50)] }),
    visao('relatorios.vendas', { materializacao: materializacao({ tamanhoBytes: 4000, ultimaAtualizacao: '2026-10-14T10:00:00.000Z' }) }),
    visao('relatorios.avaliacoes', {
      consultas: [consulta('q2', 900)],
      materializacao: materializacao({ tamanhoBytes: 9000, ultimaAtualizacao: null }),
    }),
    visao('relatorios.estoque', { materializacao: materializacao({ populada: false, tamanhoBytes: 0 }) }),
    visao('auditoria.acoes'),
  ];
  const contexto = { geradoEm, semLeitura: visoesSemLeitura(visoes) };
  const ids = (filtros: Partial<typeof filtrosVisoesIniciais>) =>
    filtrarVisoes(visoes, { ...filtrosVisoesIniciais, ...filtros }, contexto).map((atual) => atual.id);

  it('ordena por esquema e nome e busca no nome e na descrição, sem acento', () => {
    expect(ids({})).toEqual([
      'auditoria.acoes',
      'public.produtos_ativos',
      'relatorios.avaliacoes',
      'relatorios.estoque',
      'relatorios.vendas',
    ]);
    expect(ids({ busca: 'À VENDA produtos' })).toEqual(['public.produtos_ativos']);
    expect(ids({ busca: 'relatorios.est' })).toEqual(['relatorios.estoque']);
  });

  it('filtra por tipo, esquema e situação', () => {
    expect(ids({ tipo: 'COMUM' })).toEqual(['auditoria.acoes', 'public.produtos_ativos']);
    expect(ids({ esquema: 'auditoria' })).toEqual(['auditoria.acoes']);
    expect(ids({ situacao: 'SEM_DADOS' })).toEqual(['relatorios.estoque']);
    expect(ids({ situacao: 'DESATUALIZADAS' })).toEqual(['relatorios.avaliacoes']);
    expect(ids({ situacao: 'SEM_LEITURA' })).toEqual(['auditoria.acoes', 'relatorios.estoque', 'relatorios.vendas']);
  });

  it('deixa as views comuns no fim ao ordenar por tamanho e por atualização, nos dois sentidos', () => {
    expect(ids({ ordenacao: 'TAMANHO', direcao: 'DESC' })).toEqual([
      'relatorios.avaliacoes',
      'relatorios.vendas',
      'relatorios.estoque',
      'auditoria.acoes',
      'public.produtos_ativos',
    ]);
    expect(ids({ ordenacao: 'TAMANHO', direcao: 'ASC' }).slice(-2)).toEqual(['auditoria.acoes', 'public.produtos_ativos']);
    expect(ids({ ordenacao: 'ATUALIZACAO', direcao: 'ASC' })).toEqual([
      'relatorios.avaliacoes',
      'relatorios.estoque',
      'relatorios.vendas',
      'auditoria.acoes',
      'public.produtos_ativos',
    ]);
    expect(ids({ ordenacao: 'LEITURAS', direcao: 'DESC' }).slice(0, 2)).toEqual(['relatorios.avaliacoes', 'public.produtos_ativos']);
  });

  it('começa cada coluna no sentido que mais interessa e inverte no segundo clique', () => {
    expect(alternarOrdenacaoVisoes(filtrosVisoesIniciais, 'ATUALIZACAO')).toEqual({ ordenacao: 'ATUALIZACAO', direcao: 'ASC' });
    expect(alternarOrdenacaoVisoes(filtrosVisoesIniciais, 'LEITURAS')).toEqual({ ordenacao: 'LEITURAS', direcao: 'DESC' });
    expect(alternarOrdenacaoVisoes(filtrosVisoesIniciais, 'NOME')).toEqual({ ordenacao: 'NOME', direcao: 'DESC' });
  });

  it('lê do histórico só os valores válidos', () => {
    expect(lerFiltrosVisoes(null)).toEqual(filtrosVisoesIniciais);
    expect(
      lerFiltrosVisoes({ busca: '  vendas   diarias ', tipo: 'OUTRO', esquema: 'drop table;', situacao: 'SEM_LEITURA', ordenacao: 'TAMANHO' }),
    ).toEqual({
      busca: 'vendas diarias',
      tipo: null,
      esquema: null,
      situacao: 'SEM_LEITURA',
      ordenacao: 'TAMANHO',
      direcao: 'DESC',
      pagina: 1,
    });
    expect(lerFiltrosVisoes({ esquema: 'relatorios', direcao: 'ASC' }).esquema).toBe('relatorios');
    expect(lerFiltrosVisoes({ pagina: 2 }).pagina).toBe(2);
  });

  it('volta à primeira página com qualquer mudança que não seja a página', () => {
    const naSegundaPagina = { ...filtrosVisoesIniciais, pagina: 2 };
    expect(aplicarMudancaVisoes(naSegundaPagina, { pagina: 3 }).pagina).toBe(3);
    expect(aplicarMudancaVisoes(naSegundaPagina, { tipo: 'COMUM' }).pagina).toBe(1);
    expect(aplicarMudancaVisoes(naSegundaPagina, { ordenacao: 'TAMANHO', direcao: 'DESC' }).pagina).toBe(1);
  });

  it('resume a contagem e descreve os filtros em uso', () => {
    expect(resumirVisoes(0, 0, filtrosVisoesIniciais)).toBe('Nenhuma view no banco');
    expect(resumirVisoes(1, 1, filtrosVisoesIniciais)).toBe('1 view');
    expect(resumirVisoes(9, 2, { ...filtrosVisoesIniciais, tipo: 'MATERIALIZADA' })).toBe('2 de 9 views');
    expect(
      descreverFiltrosVisoes({ ...filtrosVisoesIniciais, busca: 'vendas', tipo: 'COMUM', esquema: 'public', situacao: 'SEM_DADOS' }),
    ).toEqual(['busca por “vendas”', 'tipo: comuns', 'esquema: public', 'situação: sem dados']);
  });
});

describe('pontosDeAtencao', () => {
  const visoes = [
    visao('public.esquecida'),
    visao('auditoria.antiga'),
    visao('public.fonte', { usadaPor: [ref('r.sem_dados', 'VISAO_MATERIALIZADA')] }),
    visao('r.sem_dados', { dependeDe: [ref('public.fonte')], materializacao: materializacao({ populada: false }) }),
    visao('r.vendas', { materializacao: materializacao({ atualizacao: consulta('q-refresh', 58, 3900) }) }),
    visao('r.avaliacoes', {
      consultas: [consulta('q-media', 2345)],
      materializacao: materializacao({ ultimaAtualizacao: null }),
    }),
    visao('public.lida', { consultas: [consulta('q-lida', 10)] }),
  ];
  const contexto = { geradoEm, semLeitura: visoesSemLeitura(visoes) };

  it('começa pelo que já entrega dado antigo e junta as views comuns sem leitura numa frase', () => {
    const pontos = pontosDeAtencao(visoes, contexto);

    expect(pontos.map((ponto) => [ponto.tipo, ponto.alvo])).toEqual([
      ['DESATUALIZADA_LIDA', { tipo: 'VISAO', id: 'r.avaliacoes' }],
      ['SEM_DADOS', { tipo: 'VISAO', id: 'r.sem_dados' }],
      ['ATUALIZADA_SEM_LEITURA', { tipo: 'VISAO', id: 'r.vendas' }],
      ['SEM_LEITURA', { tipo: 'FILTRO', situacao: 'SEM_LEITURA' }],
    ]);
    expect(pontos[0]?.texto).toBe(
      'Lida 2.345 vezes nos últimos 30 dias sem nenhuma atualização registrada no período. Quem a lê recebe dados de antes disso.',
    );
    expect(pontos[2]?.texto).toBe(
      'Atualizada 58 vezes nos últimos 30 dias, num total de 3,90 s, mas nenhuma consulta a leu, nem por outra view.',
    );
    expect(pontos[3]).toMatchObject({
      visao: null,
      titulo: '3 views sem leitura',
      texto: 'Nenhuma consulta leu auditoria.antiga, public.esquecida e public.fonte nos últimos 30 dias, nem por outra view.',
    });
  });

  it('cita a view sem leitura sozinha quando é uma só', () => {
    const pontos = pontosDeAtencao([visao('public.esquecida')], { geradoEm, semLeitura: new Set(['public.esquecida']) });

    expect(pontos).toEqual([
      {
        tipo: 'SEM_LEITURA',
        tom: 'aviso',
        visao: { esquema: 'public', nome: 'esquecida' },
        titulo: null,
        texto: 'Nenhuma consulta a leu nos últimos 30 dias, nem diretamente nem por outra view.',
        alvo: { tipo: 'VISAO', id: 'public.esquecida' },
      },
    ]);
  });

  it('agrupa a partir de três materializadas do mesmo caso e encurta a lista de nomes', () => {
    const semDados = ['r.a', 'r.b', 'r.c', 'r.d', 'r.e'].map((id) =>
      visao(id, { materializacao: materializacao({ populada: false }) }),
    );
    const [ponto] = pontosDeAtencao(semDados, { geradoEm, semLeitura: new Set() });

    expect(ponto).toMatchObject({
      tom: 'erro',
      titulo: '5 materializadas sem dados',
      texto: 'r.a, r.b, r.c e mais 2 estão sem dados. Uma consulta que tentar lê-las recebe um erro até o próximo REFRESH.',
      alvo: { tipo: 'FILTRO', situacao: 'SEM_DADOS' },
    });
  });

  it('fica vazio quando nada pede atenção', () => {
    expect(pontosDeAtencao([visao('public.lida', { consultas: [consulta('q', 1)] })], { geradoEm, semLeitura: new Set() })).toEqual(
      [],
    );
  });
});

describe('avisosDaVisao', () => {
  it('avisa da materializada desatualizada que ainda é lida', () => {
    const atual = visao('r.avaliacoes', {
      consultas: [consulta('q', 2345)],
      materializacao: materializacao({ ultimaAtualizacao: '2026-10-11T13:00:00.000Z' }),
    });

    expect(avisosDaVisao(atual, { geradoEm, semLeitura: new Set() })).toEqual([
      {
        tom: 'aviso',
        texto:
          'A última atualização foi há 3 dias, mais de 24 horas atrás. Quem lê a view recebe os dados daquele momento. Ela foi lida 2.345 vezes nos últimos 30 dias.',
      },
    ]);
  });

  it('diz quando o Orynt não viu atualização e quando a view está sem dados', () => {
    const semRegistro = visao('r.a', { materializacao: materializacao({ ultimaAtualizacao: null }) });
    const semDados = visao('r.b', { materializacao: materializacao({ populada: false }) });

    expect(avisosDaVisao(semRegistro, { geradoEm, semLeitura: new Set() })[0]?.texto).toBe(
      'O Orynt não registrou nenhuma atualização nos últimos 30 dias. Quem lê a view recebe dados de antes disso.',
    );
    expect(avisosDaVisao(semDados, { geradoEm, semLeitura: new Set() })).toEqual([
      {
        tom: 'erro',
        texto:
          'A view está sem dados: foi criada ou atualizada com WITH NO DATA. Quem tentar lê-la recebe um erro até o próximo REFRESH.',
      },
    ]);
  });

  it('mostra o custo da atualização de uma materializada que ninguém lê', () => {
    const atual = visao('r.vendas', { materializacao: materializacao({ atualizacao: consulta('q', 58, 3900) }) });
    const comum = visao('public.esquecida');

    expect(avisosDaVisao(atual, { geradoEm, semLeitura: new Set(['r.vendas']) })).toEqual([
      {
        tom: 'aviso',
        texto: 'Nenhuma consulta leu a view nos últimos 30 dias, nem por outra view, mas ela foi atualizada 58 vezes, num total de 3,90 s.',
      },
    ]);
    expect(avisosDaVisao(comum, { geradoEm, semLeitura: new Set(['public.esquecida']) })[0]?.texto).toMatch(
      /^Nenhuma consulta leu a view nos últimos 30 dias, nem diretamente nem por outra view\./,
    );
  });
});
