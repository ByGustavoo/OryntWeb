import { describe, expect, it } from 'vitest';
import type { IndiceDTO, SugestaoDeIndiceDTO } from '@/modelos/objetos';
import {
  comandoDoIndice,
  filtrarIndices,
  filtrosIndicesIniciais,
  gravacoesNoIndice,
  lerFiltrosIndices,
  loteDeComandos,
  ordenarIndices,
  pontosDeAtencaoIndices,
  resumirIndices,
  situacaoDoIndice,
  sobreposicoesDosIndices,
  tabelasDosIndices,
  textoDaColeta,
} from './indices';
import type { ContextoDosIndices } from './indices';

const geradoEm = '2026-10-18T13:47:00.000Z';
const coletaDesde = '2026-09-01T13:12:00.000Z';

function criarIndice(nome: string, campos: Partial<IndiceDTO> = {}): IndiceDTO {
  return {
    id: `public.${nome}`,
    esquema: 'public',
    nome,
    tabela: {
      tipo: 'TABELA',
      esquema: 'public',
      nome: 'pedidos',
      tamanhoBytes: 100,
      linhas: 10,
      insercoes: 120,
      atualizacoes: 80,
      atualizacoesHot: 30,
    },
    metodo: 'BTREE',
    colunas: ['cliente_id'],
    incluidas: [],
    predicado: null,
    unico: false,
    restricao: null,
    valido: true,
    definicao: '',
    tamanhoBytes: 1024 * 1024,
    leituras: 10,
    linhasLidas: 10,
    observadoDesde: coletaDesde,
    usos: [],
    ...campos,
  };
}

function contextoDe(indices: IndiceDTO[], inicio = coletaDesde): ContextoDosIndices {
  return { geradoEm, coletaDesde: inicio, sobreposicoes: sobreposicoesDosIndices(indices) };
}

describe('sobreposicoesDosIndices', () => {
  it('marca como duplicado o índice comum que repete uma restrição única', () => {
    const chave = criarIndice('usuarios_email_key', { colunas: ['email'], restricao: 'UNICA', unico: true, leituras: 0 });
    const copia = criarIndice('usuarios_email_idx', { colunas: ['email'], leituras: 40 });
    const sobreposicoes = sobreposicoesDosIndices([chave, copia]);
    expect(sobreposicoes.get(copia.id)).toEqual({ tipo: 'DUPLICADO', cobertoPor: chave });
    expect(sobreposicoes.has(chave.id)).toBe(false);
  });

  it('entre dois índices comuns iguais, aponta o menos lido', () => {
    const lido = criarIndice('a_idx', { leituras: 90 });
    const pouco = criarIndice('b_idx', { leituras: 3 });
    const sobreposicoes = sobreposicoesDosIndices([lido, pouco]);
    expect(sobreposicoes.get(pouco.id)?.tipo).toBe('DUPLICADO');
    expect(sobreposicoes.has(lido.id)).toBe(false);
  });

  it('marca como redundante o índice cujas colunas começam outro índice B-tree', () => {
    const curto = criarIndice('avaliacoes_produto_id_idx', { colunas: ['produto_id'] });
    const longo = criarIndice('avaliacoes_produto_id_criado_em_idx', { colunas: ['produto_id', 'criado_em DESC'] });
    expect(sobreposicoesDosIndices([curto, longo]).get(curto.id)).toEqual({ tipo: 'REDUNDANTE', cobertoPor: longo });
  });

  it('não compara índices de tabelas, métodos ou condições diferentes, nem um inválido', () => {
    const base = criarIndice('base_idx', { colunas: ['a', 'b'] });
    const outros = [
      criarIndice('outra_tabela_idx', { colunas: ['a'], tabela: { ...base.tabela, nome: 'clientes' } }),
      criarIndice('hash_idx', { colunas: ['a'], metodo: 'HASH' }),
      criarIndice('parcial_idx', { colunas: ['a'], predicado: '(ativo)' }),
      criarIndice('invalido_idx', { colunas: ['a'], valido: false }),
    ];
    const sobreposicoes = sobreposicoesDosIndices([base, ...outros]);
    expect([...sobreposicoes.keys()]).toEqual([]);
  });

  it('nunca aponta um índice único, que garante uma regra que o outro não garante', () => {
    const unico = criarIndice('estoque_produto_id_idx', { colunas: ['produto_id'], unico: true });
    const longo = criarIndice('estoque_produto_id_quantidade_idx', { colunas: ['produto_id', 'quantidade'] });
    expect(sobreposicoesDosIndices([unico, longo]).has(unico.id)).toBe(false);
  });
});

describe('situacaoDoIndice', () => {
  it('separa o sem uso do índice único sem leituras e do índice ainda em observação', () => {
    const semUso = criarIndice('sem_uso_idx', { colunas: ['x'], leituras: 0 });
    const unico = criarIndice('pedidos_pkey', { colunas: ['id'], leituras: 0, restricao: 'CHAVE_PRIMARIA', unico: true });
    const novo = criarIndice('novo_idx', { colunas: ['y'], leituras: 0, observadoDesde: '2026-10-13T17:03:00.000Z' });
    const indices = [semUso, unico, novo];
    const contexto = contextoDe(indices);
    expect(indices.map((indice) => situacaoDoIndice(indice, contexto))).toEqual([
      'SEM_USO',
      'GARANTE_UNICIDADE',
      'EM_OBSERVACAO',
    ]);
  });

  it('não marca nada como sem uso enquanto a coleta tem menos de 30 dias', () => {
    const semUso = criarIndice('sem_uso_idx', { colunas: ['x'], leituras: 0 });
    expect(situacaoDoIndice(semUso, contextoDe([semUso], '2026-10-10T10:00:00.000Z'))).toBe('EM_OBSERVACAO');
  });

  it('põe o inválido acima de qualquer outra situação', () => {
    const invalido = criarIndice('invalido_idx', { valido: false, leituras: 0 });
    expect(situacaoDoIndice(invalido, contextoDe([invalido]))).toBe('INVALIDO');
  });
});

describe('gravacoesNoIndice', () => {
  it('soma as inserções e as atualizações que não são HOT', () => {
    expect(gravacoesNoIndice(criarIndice('a_idx'))).toBe(120 + 50);
  });
});

describe('lerFiltrosIndices', () => {
  it('troca cada campo inválido pelo padrão', () => {
    expect(lerFiltrosIndices({ tabela: 'drop table', esquema: '1x', situacao: 'TODOS', ordenacao: 'TAMANHO' })).toEqual({
      ...filtrosIndicesIniciais,
      ordenacao: 'TAMANHO',
      direcao: 'DESC',
    });
    expect(lerFiltrosIndices({ tabela: 'public.pedidos', situacao: 'SEM_USO' })).toMatchObject({
      tabela: 'public.pedidos',
      situacao: 'SEM_USO',
    });
    expect(lerFiltrosIndices(null)).toEqual(filtrosIndicesIniciais);
  });
});

describe('filtrarIndices e ordenarIndices', () => {
  const pedidos = criarIndice('pedidos_cliente_id_idx', { tamanhoBytes: 300, leituras: 5 });
  const clientes = criarIndice('clientes_pkey', {
    colunas: ['id'],
    restricao: 'CHAVE_PRIMARIA',
    unico: true,
    tamanhoBytes: 900,
    leituras: 0,
    tabela: { ...pedidos.tabela, nome: 'clientes' },
  });
  const auditoria = criarIndice('auditoria_alvo_idx', {
    colunas: ['alvo'],
    tamanhoBytes: 600,
    leituras: 0,
    tabela: { ...pedidos.tabela, nome: 'auditoria' },
  });
  const indices = [pedidos, clientes, auditoria];
  const contexto = contextoDe(indices);

  it('busca pelo nome, pela tabela e pelas colunas', () => {
    const buscar = (busca: string) =>
      filtrarIndices(indices, { ...filtrosIndicesIniciais, busca }, contexto).map((indice) => indice.nome);
    expect(buscar('alvo')).toEqual(['auditoria_alvo_idx']);
    expect(buscar('public.clientes')).toEqual(['clientes_pkey']);
    expect(buscar('cliente')).toEqual(['clientes_pkey', 'pedidos_cliente_id_idx']);
  });

  it('filtra pela tabela e pela situação', () => {
    expect(
      filtrarIndices(indices, { ...filtrosIndicesIniciais, tabela: 'public.auditoria' }, contexto).map((indice) => indice.nome),
    ).toEqual(['auditoria_alvo_idx']);
    expect(
      filtrarIndices(indices, { ...filtrosIndicesIniciais, situacao: 'SEM_USO' }, contexto).map((indice) => indice.nome),
    ).toEqual(['auditoria_alvo_idx']);
  });

  it('ordena por tabela e nome, pelo tamanho e pelas leituras', () => {
    expect(ordenarIndices(indices, 'NOME', 'ASC').map((indice) => indice.nome)).toEqual([
      'auditoria_alvo_idx',
      'clientes_pkey',
      'pedidos_cliente_id_idx',
    ]);
    expect(ordenarIndices(indices, 'TAMANHO', 'DESC').map((indice) => indice.nome)).toEqual([
      'clientes_pkey',
      'auditoria_alvo_idx',
      'pedidos_cliente_id_idx',
    ]);
    expect(ordenarIndices(indices, 'LEITURAS', 'ASC').map((indice) => indice.nome)).toEqual([
      'auditoria_alvo_idx',
      'clientes_pkey',
      'pedidos_cliente_id_idx',
    ]);
  });

  it('lista as tabelas do esquema escolhido', () => {
    expect(tabelasDosIndices(indices, null)).toEqual(['public.auditoria', 'public.clientes', 'public.pedidos']);
    expect(tabelasDosIndices(indices, 'relatorios')).toEqual([]);
  });

  it('conta os índices e as tabelas, e só os encontrados com filtro', () => {
    expect(resumirIndices(indices, 3, filtrosIndicesIniciais)).toBe('3 índices em 3 tabelas');
    expect(resumirIndices(indices, 1, { ...filtrosIndicesIniciais, busca: 'alvo' })).toBe('1 de 3 índices');
    expect(resumirIndices([], 0, filtrosIndicesIniciais)).toBe('Nenhum índice no banco');
  });
});

describe('pontosDeAtencaoIndices', () => {
  const sugestao: SugestaoDeIndiceDTO = {
    tabela: 'public.usuarios',
    colunas: ['lower(email)'],
    comando: 'CREATE INDEX CONCURRENTLY usuarios_lower_email_idx ON usuarios (lower(email));',
    extensao: null,
    consultas: [],
  };

  it('vai do inválido ao sem uso e termina nas sugestões', () => {
    const invalido = criarIndice('invalido_idx', { colunas: ['z'], valido: false, leituras: 0 });
    const semUso = criarIndice('sem_uso_idx', { colunas: ['x'], leituras: 0 });
    const indices = [semUso, invalido];
    const pontos = pontosDeAtencaoIndices(indices, [sugestao], contextoDe(indices));
    expect(pontos.map((ponto) => ponto.tipo)).toEqual(['INVALIDO', 'SEM_USO', 'SUGERIDOS']);
    expect(pontos[0]?.tom).toBe('erro');
    expect(pontos[1]?.texto).toBe(
      'Nenhuma consulta o leu nos últimos 30 dias. Ocupa 1,0 MB e é atualizado a cada gravação em pedidos: 170 gravações nos últimos 30 dias.',
    );
    expect(pontos[2]).toMatchObject({ titulo: 'Um índice sugerido pelos planos', alvo: { tipo: 'SUGESTOES' } });
  });

  it('junta numa frase só, com o custo somado, mais de dois índices sem uso', () => {
    const indices = ['a_idx', 'b_idx', 'c_idx'].map((nome, posicao) =>
      criarIndice(nome, { colunas: [`coluna_${posicao}`], leituras: 0 }),
    );
    const [ponto] = pontosDeAtencaoIndices(indices, [], contextoDe(indices));
    expect(ponto).toMatchObject({
      tipo: 'SEM_USO',
      titulo: '3 índices sem uso',
      alvo: { tipo: 'FILTRO', situacao: 'SEM_USO' },
    });
    expect(ponto?.texto).toBe(
      'Nenhuma consulta leu a_idx, b_idx e c_idx nos últimos 30 dias. Juntos ocupam 3,0 MB e receberam 510 gravações nos últimos 30 dias.',
    );
  });

  it('não diz nada quando nenhum índice pede atenção e nada foi sugerido', () => {
    const usado = criarIndice('usado_idx');
    expect(pontosDeAtencaoIndices([usado], [], contextoDe([usado]))).toEqual([]);
  });
});

describe('comandoDoIndice', () => {
  it('refaz o inválido, remove o sem uso e não sugere nada para um índice em uso', () => {
    const invalido = criarIndice('invalido_idx', { colunas: ['z'], valido: false });
    const semUso = criarIndice('sem_uso_idx', { colunas: ['x'], leituras: 0 });
    const usado = criarIndice('usado_idx');
    const contexto = contextoDe([invalido, semUso, usado]);
    expect(comandoDoIndice(invalido, contexto)?.comando).toBe('REINDEX INDEX CONCURRENTLY public.invalido_idx;');
    expect(comandoDoIndice(semUso, contexto)?.comando).toBe('DROP INDEX CONCURRENTLY public.sem_uso_idx;');
    expect(comandoDoIndice(usado, contexto)).toBeNull();
  });
});

describe('loteDeComandos', () => {
  it('junta um comando por linha e ignora os índices que não pedem nenhum', () => {
    const semUso = criarIndice('sem_uso_idx', { colunas: ['x'], leituras: 0 });
    const outro = criarIndice('outro_idx', { colunas: ['y'], leituras: 0 });
    const usado = criarIndice('usado_idx');
    const indices = [semUso, outro, usado];
    const lote = loteDeComandos(indices, contextoDe(indices));
    expect(lote?.comandos).toEqual(['DROP INDEX CONCURRENTLY public.sem_uso_idx;', 'DROP INDEX CONCURRENTLY public.outro_idx;']);
    expect(lote?.rotulo).toBe('Copiar os 2 comandos');
    expect(loteDeComandos([semUso], contextoDe([semUso]))?.rotulo).toBe('Copiar o comando');
    expect(loteDeComandos([usado], contextoDe([usado]))).toBeNull();
  });
});

describe('textoDaColeta', () => {
  it('avisa quando a coleta ainda não tem 30 dias', () => {
    expect(textoDaColeta({ geradoEm, coletaDesde }).incompleta).toBe(false);
    const recente = textoDaColeta({ geradoEm, coletaDesde: '2026-10-14T10:00:00.000Z' });
    expect(recente.incompleta).toBe(true);
    expect(recente.completo).toContain('há 4 dias');
  });
});
