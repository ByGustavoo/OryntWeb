import { describe, expect, it } from 'vitest';
import type { NoPlanoDTO, PlanoExecucaoDTO, VersaoPlanoDTO } from '@/modelos/planos';
import {
  alvoDoNo,
  buffersProprios,
  condicaoPrincipal,
  descreverNo,
  descreverVersoes,
  diagnosticarPlano,
  estadoDoPlano,
  etapaMaisLenta,
  fatorDaEstimativa,
  kbEmDisco,
  lerSelecaoDoPlano,
  linhasDoPlano,
  linhasLidas,
  nomeDoNo,
  planoEmJson,
  planoEmTexto,
  rotuloDaVersao,
  selecaoInicialDoPlano,
  tempoProprioMs,
  variacaoEntreVersoes,
} from './planoExecucao';

function no(parcial: Partial<NoPlanoDTO>): NoPlanoDTO {
  return {
    id: 1,
    tipo: 'Result',
    operacao: null,
    juncao: null,
    estrategia: null,
    sentidoInverso: false,
    relacao: null,
    apelido: null,
    indice: null,
    custoInicial: 0,
    custoTotal: 1,
    linhasEstimadas: 1,
    larguraBytes: 4,
    tempoInicialMs: 0,
    tempoTotalMs: 1,
    linhasReais: 1,
    lacos: 1,
    linhasRemovidasPeloFiltro: null,
    condicoes: [],
    buffers: { emCache: 0, lidos: 0, temporariosLidos: 0, temporariosEscritos: 0 },
    ordenacao: null,
    memoria: null,
    filhos: [],
    ...parcial,
  };
}

function plano(raiz: NoPlanoDTO, tempoExecucaoMs: number): PlanoExecucaoDTO {
  return {
    id: 'p-1',
    registradoEm: new Date(2026, 9, 14, 10, 42).toISOString(),
    tempoPlanejamentoMs: 0.214,
    tempoExecucaoMs,
    raiz,
    sugestoes: [],
  };
}

const varredura = no({
  id: 2,
  tipo: 'Seq Scan',
  relacao: 'usuarios',
  custoTotal: 20600,
  linhasEstimadas: 4120,
  larguraBytes: 36,
  tempoInicialMs: 0.031,
  tempoTotalMs: 262.118,
  linhasReais: 1,
  linhasRemovidasPeloFiltro: 823_999,
  condicoes: [{ tipo: 'FILTRO', expressao: '(lower((email)::text) = lower($1))' }],
  buffers: { emCache: 2410, lidos: 11_388, temporariosLidos: 0, temporariosEscritos: 0 },
});

const limite = no({
  id: 1,
  tipo: 'Limit',
  custoTotal: 20600,
  tempoInicialMs: 0.04,
  tempoTotalMs: 262.5,
  buffers: { emCache: 2410, lidos: 11_388, temporariosLidos: 0, temporariosEscritos: 0 },
  filhos: [varredura],
});

describe('lerSelecaoDoPlano', () => {
  it('aceita a consulta e a versão guardadas no histórico do navegador', () => {
    expect(lerSelecaoDoPlano({ consulta: 'q-usuarios-email', versao: 'q-usuarios-email-plano-1' })).toEqual({
      consulta: 'q-usuarios-email',
      versao: 'q-usuarios-email-plano-1',
      comparacao: null,
    });
    expect(lerSelecaoDoPlano({ consulta: 'q-a', versao: 'v2', comparacao: 'v1' })).toEqual({
      consulta: 'q-a',
      versao: 'v2',
      comparacao: 'v1',
    });
    expect(lerSelecaoDoPlano({ consulta: 'q-a', versao: 'v1', comparacao: 'v1' }).comparacao).toBeNull();
  });

  it('descarta a versão sem consulta e identificadores fora do formato', () => {
    expect(lerSelecaoDoPlano({ versao: 'q-usuarios-email-plano-1' })).toEqual(selecaoInicialDoPlano);
    expect(lerSelecaoDoPlano({ consulta: '../x', versao: 'a b' })).toEqual(selecaoInicialDoPlano);
    expect(lerSelecaoDoPlano({ consulta: 'q-a', versao: 'a b' })).toEqual({ consulta: 'q-a', versao: null, comparacao: null });
    expect(lerSelecaoDoPlano(null)).toEqual(selecaoInicialDoPlano);
  });

  it('monta o estado que abre a tela numa consulta, no plano atual', () => {
    expect(estadoDoPlano('q-a')).toEqual({ plano: { consulta: 'q-a', versao: null, comparacao: null } });
    expect(estadoDoPlano('q-a', 'v2', 'v1')).toEqual({ plano: { consulta: 'q-a', versao: 'v2', comparacao: 'v1' } });
  });
});

describe('nomeDoNo', () => {
  it('escreve o nome como o EXPLAIN em texto', () => {
    expect(nomeDoNo(no({ tipo: 'Hash Join', juncao: 'RIGHT' }))).toBe('Hash Right Join');
    expect(nomeDoNo(no({ tipo: 'Hash Join', juncao: 'INNER' }))).toBe('Hash Join');
    expect(nomeDoNo(no({ tipo: 'Nested Loop', juncao: 'LEFT' }))).toBe('Nested Loop Left Join');
    expect(nomeDoNo(no({ tipo: 'Aggregate', estrategia: 'HASH' }))).toBe('HashAggregate');
    expect(nomeDoNo(no({ tipo: 'Aggregate', estrategia: 'SIMPLES' }))).toBe('Aggregate');
    expect(nomeDoNo(no({ tipo: 'ModifyTable', operacao: 'DELETE' }))).toBe('Delete');
    expect(nomeDoNo(no({ tipo: 'Index Scan', sentidoInverso: true }))).toBe('Index Scan Backward');
  });

  it('acrescenta a tabela, ou o índice quando a etapa não lê tabela', () => {
    expect(descreverNo(varredura)).toBe('Seq Scan em usuarios');
    expect(descreverNo(no({ tipo: 'Bitmap Index Scan', indice: 'pedidos_cliente_id_idx' }))).toBe(
      'Bitmap Index Scan em pedidos_cliente_id_idx',
    );
    expect(descreverNo(no({ tipo: 'Sort' }))).toBe('Sort');
  });

  it('mostra a tabela com o apelido, o índice e a condição que resume a etapa', () => {
    const indice = no({
      relacao: 'produtos',
      apelido: 'p',
      indice: 'produtos_pkey',
      condicoes: [
        { tipo: 'FILTRO', expressao: 'ativo' },
        { tipo: 'CONDICAO_INDICE', expressao: '(id = i.produto_id)' },
      ],
    });
    expect(alvoDoNo(indice)).toBe('produtos p · índice produtos_pkey');
    expect(alvoDoNo(varredura)).toBe('usuarios');
    expect(alvoDoNo(no({ tipo: 'Sort' }))).toBeNull();
    expect(condicaoPrincipal(indice)).toEqual({ rotulo: 'Busca no índice', expressao: '(id = i.produto_id)' });
    expect(condicaoPrincipal(no({ condicoes: [{ tipo: 'CHAVE_ORDENACAO', expressao: 'a' }, { tipo: 'CHAVE_ORDENACAO', expressao: 'b DESC' }] }))).toEqual({
      rotulo: 'Ordena por',
      expressao: 'a, b DESC',
    });
  });
});

describe('medidas de uma etapa', () => {
  it('tira do tempo da etapa o tempo das etapas abaixo, contando os laços', () => {
    const interno = no({ id: 3, tempoTotalMs: 0.5, lacos: 8 });
    const laco = no({ id: 2, tipo: 'Nested Loop', tempoTotalMs: 6, filhos: [no({ tempoTotalMs: 1 }), interno] });
    expect(tempoProprioMs(laco)).toBeCloseTo(1);
    expect(tempoProprioMs(interno)).toBeCloseTo(4);
    expect(tempoProprioMs(no({ tempoTotalMs: 1, filhos: [no({ tempoTotalMs: 1.2 })] }))).toBe(0);
  });

  it('conta as linhas lidas como as devolvidas mais as descartadas pelo filtro', () => {
    expect(linhasLidas(varredura)).toBe(824_000);
    expect(linhasLidas(no({ linhasReais: 2, linhasRemovidasPeloFiltro: 3, lacos: 4 }))).toBe(20);
  });

  it('mede o erro da estimativa nos dois sentidos', () => {
    expect(fatorDaEstimativa(varredura)).toBe(4120);
    expect(fatorDaEstimativa(no({ linhasEstimadas: 14, linhasReais: 9770 }))).toBeCloseTo(697.86, 1);
    expect(fatorDaEstimativa(no({ linhasEstimadas: 0, linhasReais: 0 }))).toBe(1);
  });

  it('separa os blocos da própria etapa e o que ela gravou em disco', () => {
    const juncao = no({
      buffers: { emCache: 100, lidos: 50, temporariosLidos: 1470, temporariosEscritos: 1470 },
      filhos: [no({ buffers: { emCache: 80, lidos: 50, temporariosLidos: 0, temporariosEscritos: 0 } })],
    });
    expect(buffersProprios(juncao)).toEqual({ emCache: 20, lidos: 0, temporariosLidos: 1470, temporariosEscritos: 1470 });
    expect(kbEmDisco(juncao)).toBe(11_760);
    expect(kbEmDisco(no({ memoria: { lotes: 5, memoriaKb: 8257, discoKb: 41_040 } }))).toBe(41_040);
    expect(kbEmDisco(no({ ordenacao: { metodo: 'EXTERNAL_MERGE', espacoKb: 900, emDisco: true } }))).toBe(900);
  });
});

describe('linhasDoPlano', () => {
  it('percorre a árvore de cima para baixo com as guias de cada nível', () => {
    const arvore = no({
      id: 1,
      tempoTotalMs: 10,
      filhos: [
        no({ id: 2, tempoTotalMs: 6, filhos: [no({ id: 3, tempoTotalMs: 2 })] }),
        no({ id: 4, tempoTotalMs: 1 }),
      ],
    });
    const linhas = linhasDoPlano(plano(arvore, 10));

    expect(linhas.map((linha) => [linha.no.id, linha.profundidade, linha.idDoPai, linha.guias])).toEqual([
      [1, 0, null, []],
      [2, 1, 1, ['RAMO']],
      [3, 2, 2, ['LINHA', 'ULTIMO']],
      [4, 1, 1, ['ULTIMO']],
    ]);
    expect(linhas.map((linha) => linha.parteDoTempo)).toEqual([30, 40, 20, 10]);
    expect(etapaMaisLenta(linhas)?.no.id).toBe(2);
  });
});

describe('diagnosticarPlano', () => {
  it('aponta a etapa que mais pesa, a varredura com filtro e a estimativa errada', () => {
    const reuniao = { ...limite, tipo: 'Gather' };
    expect(diagnosticarPlano(plano(reuniao, 262.6)).map((achado) => [achado.tipo, achado.tom, achado.no, achado.texto])).toEqual([
      ['ETAPA', 'neutro', 2, 'Seq Scan em usuarios é a etapa que mais pesa: 99,8% do tempo de execução, 262 ms de 263 ms.'],
      ['VARREDURA', 'atencao', 2, 'Seq Scan em usuarios lê a tabela inteira, 824.000 linhas, e o filtro descarta 99,9% delas.'],
      [
        'ESTIMATIVA',
        'atencao',
        2,
        'Em Seq Scan em usuarios, o planejador esperava 4.120 linhas e veio 1, um erro de 4.120 vezes. Estatísticas ' +
          'desatualizadas ou uma condição difícil de estimar levam o banco a escolher mal o plano.',
      ],
    ]);
  });

  it('aponta o filtro de um índice, o uso de disco e a etapa executada em muitos laços', () => {
    const porIndice = no({
      id: 3,
      tipo: 'Index Scan',
      sentidoInverso: true,
      relacao: 'pedidos',
      indice: 'pedidos_criado_em_idx',
      tempoTotalMs: 0.01,
      lacos: 2000,
      linhasReais: 0,
      linhasRemovidasPeloFiltro: 90,
    });
    const agregacao = no({
      id: 1,
      tipo: 'Aggregate',
      estrategia: 'HASH',
      tempoTotalMs: 40,
      memoria: { lotes: 5, memoriaKb: 8257, discoKb: 41_040 },
      filhos: [no({ id: 2, tipo: 'Nested Loop', tempoTotalMs: 30, filhos: [porIndice] })],
    });
    const achados = diagnosticarPlano(plano(agregacao, 40));

    expect(achados.find((achado) => achado.tipo === 'FILTRO')?.texto).toBe(
      'Index Scan Backward em pedidos lê 180.000 linhas pelo índice pedidos_criado_em_idx, e o filtro descarta 100,0% delas.',
    );
    expect(achados.find((achado) => achado.tipo === 'DISCO')?.texto).toBe(
      'HashAggregate gravou 40,1 MB em disco por falta de memória. Aumentar o work_mem desta consulta mantém a operação em memória.',
    );
    expect(achados.find((achado) => achado.tipo === 'LACO')?.texto).toBe(
      'Index Scan Backward em pedidos é executado 2.000 vezes dentro de Nested Loop: cada vez custa pouco, mas juntas somam 20,0 ms.',
    );
    expect(achados.some((achado) => achado.tipo === 'SAUDAVEL')).toBe(false);
  });

  it('não acusa erro de estimativa na etapa que um Limit interrompeu antes do fim', () => {
    const ordenacao = no({ id: 2, tipo: 'Sort', linhasEstimadas: 186_000, linhasReais: 50, tempoTotalMs: 5 });
    const limitado = no({ id: 1, tipo: 'Limit', linhasEstimadas: 50, linhasReais: 50, tempoTotalMs: 5.1, filhos: [ordenacao] });
    const linhas = linhasDoPlano(plano(limitado, 5.2));

    expect(linhas.map((linha) => linha.abaixoDeLimite)).toEqual([false, true]);
    expect(diagnosticarPlano(plano(limitado, 5.2)).some((achado) => achado.tipo === 'ESTIMATIVA')).toBe(false);
    expect(fatorDaEstimativa(ordenacao)).toBe(3720);
  });

  it('diz que o plano está saudável quando nada pede atenção', () => {
    const indice = no({ id: 1, tipo: 'Index Scan', relacao: 'usuarios', indice: 'usuarios_pkey', tempoTotalMs: 0.05 });
    const achados = diagnosticarPlano(plano(indice, 0.06));
    expect(achados.map((achado) => achado.tipo)).toEqual(['ETAPA', 'SAUDAVEL']);
    expect(achados[1]?.tom).toBe('positivo');
  });
});

describe('planoEmTexto', () => {
  it('reproduz o formato de texto do EXPLAIN (ANALYZE, BUFFERS)', () => {
    expect(planoEmTexto(plano(limite, 262.6))).toBe(
      [
        'Limit  (cost=0.00..20600.00 rows=1 width=4) (actual time=0.040..262.500 rows=1 loops=1)',
        '  Buffers: shared hit=2410 read=11388',
        '  ->  Seq Scan on usuarios  (cost=0.00..20600.00 rows=4120 width=36) (actual time=0.031..262.118 rows=1 loops=1)',
        '        Filter: (lower((email)::text) = lower($1))',
        '        Rows Removed by Filter: 823999',
        '        Buffers: shared hit=2410 read=11388',
        'Planning Time: 0.214 ms',
        'Execution Time: 262.600 ms',
      ].join('\n'),
    );
  });

  it('escreve índice, apelido, chaves, ordenação, memória e blocos temporários', () => {
    const indice = no({ id: 3, tipo: 'Index Scan', relacao: 'produtos', apelido: 'p', indice: 'produtos_pkey' });
    const ordenacao = no({
      id: 2,
      tipo: 'Sort',
      condicoes: [
        { tipo: 'CHAVE_ORDENACAO', expressao: 'p.criado_em DESC' },
        { tipo: 'CHAVE_ORDENACAO', expressao: 'p.id' },
      ],
      ordenacao: { metodo: 'EXTERNAL_MERGE', espacoKb: 900, emDisco: true },
      buffers: { emCache: 0, lidos: 0, temporariosLidos: 112, temporariosEscritos: 113 },
      filhos: [indice],
    });
    const agregacao = no({ tipo: 'Aggregate', estrategia: 'HASH', memoria: { lotes: 5, memoriaKb: 8257, discoKb: 41_040 }, filhos: [ordenacao] });
    const linhas = planoEmTexto(plano(agregacao, 1)).split('\n');

    expect(linhas[0]).toMatch(/^HashAggregate {2}\(cost=/);
    expect(linhas[1]).toBe('  Batches: 5  Memory Usage: 8257kB  Disk Usage: 41040kB');
    expect(linhas[2]).toMatch(/^ {2}-> {2}Sort {2}\(cost=/);
    expect(linhas[3]).toBe('        Sort Key: p.criado_em DESC, p.id');
    expect(linhas[4]).toBe('        Sort Method: external merge  Disk: 900kB');
    expect(linhas[5]).toBe('        Buffers: temp read=112 written=113');
    expect(linhas[6]).toMatch(/^ {8}-> {2}Index Scan using produtos_pkey on produtos p {2}\(cost=/);
  });
});

describe('planoEmJson', () => {
  it('usa os nomes de campo do EXPLAIN (FORMAT JSON)', () => {
    const [saida] = JSON.parse(planoEmJson(plano(limite, 262.6))) as [Record<string, unknown>];
    const raiz = saida.Plan as Record<string, unknown>;
    const filho = (raiz.Plans as Record<string, unknown>[])[0];

    expect(saida['Execution Time']).toBe(262.6);
    expect(saida['Planning Time']).toBe(0.214);
    expect(raiz['Node Type']).toBe('Limit');
    expect(filho).toMatchObject({
      'Node Type': 'Seq Scan',
      'Relation Name': 'usuarios',
      Alias: 'usuarios',
      'Plan Rows': 4120,
      'Actual Rows': 1,
      'Actual Loops': 1,
      Filter: '(lower((email)::text) = lower($1))',
      'Rows Removed by Filter': 823_999,
      'Shared Hit Blocks': 2410,
      'Shared Read Blocks': 11_388,
    });
  });

  it('escreve a junção, a estratégia, a direção e as chaves como o PostgreSQL', () => {
    const juncao = no({
      tipo: 'Hash Join',
      juncao: 'RIGHT',
      filhos: [no({ id: 2, tipo: 'Index Scan', sentidoInverso: true, indice: 'i', relacao: 't' })],
    });
    const agregacao = no({
      tipo: 'Aggregate',
      estrategia: 'HASH',
      condicoes: [{ tipo: 'CHAVE_AGRUPAMENTO', expressao: 'c.id' }],
      memoria: { lotes: 5, memoriaKb: 8257, discoKb: 41_040 },
      filhos: [juncao],
    });
    const [saida] = JSON.parse(planoEmJson(plano(agregacao, 1))) as [{ Plan: Record<string, unknown> }];
    const juncaoJson = (saida.Plan.Plans as Record<string, unknown>[])[0] as Record<string, unknown>;

    expect(saida.Plan).toMatchObject({ Strategy: 'Hashed', 'Group Key': ['c.id'], 'HashAgg Batches': 5, 'Disk Usage': 41_040 });
    expect(juncaoJson['Join Type']).toBe('Right');
    expect((juncaoJson.Plans as Record<string, unknown>[])[0]).toMatchObject({ 'Scan Direction': 'Backward', 'Index Name': 'i' });
  });
});

describe('versões do plano', () => {
  const atual: VersaoPlanoDTO = {
    id: 'v2',
    primeiroRegistro: new Date(2026, 9, 11, 9, 0).toISOString(),
    ultimoRegistro: new Date(2026, 9, 14, 10, 42).toISOString(),
    quantidadeExecucoes: 900,
    tempoMedioMs: 217,
  };
  const anterior: VersaoPlanoDTO = {
    id: 'v1',
    primeiroRegistro: new Date(2026, 7, 2, 14, 3).toISOString(),
    ultimoRegistro: new Date(2026, 9, 11, 8, 57).toISOString(),
    quantidadeExecucoes: 4100,
    tempoMedioMs: 169,
  };

  it('nomeia as versões da mais recente para a mais antiga', () => {
    expect(rotuloDaVersao(atual, 0)).toBe('Plano atual');
    expect(rotuloDaVersao(anterior, 1)).toBe('Plano anterior');
    expect(rotuloDaVersao(anterior, 2)).toBe('Plano de 2 de agosto');
  });

  it('compara o tempo médio de uma versão com o da anterior', () => {
    expect(variacaoEntreVersoes(atual, anterior)).toBe(28.4);
    expect(variacaoEntreVersoes(anterior, undefined)).toBeNull();
  });

  it('conta as trocas de plano da janela', () => {
    expect(descreverVersoes([atual])).toBe('O plano não mudou nos últimos 30 dias');
    expect(descreverVersoes([atual, anterior])).toBe('O banco trocou de plano uma vez nos últimos 30 dias');
    expect(descreverVersoes([atual, anterior, anterior])).toBe('O banco trocou de plano 2 vezes nos últimos 30 dias');
  });
});
