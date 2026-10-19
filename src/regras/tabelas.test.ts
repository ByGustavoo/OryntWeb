import { describe, expect, it } from 'vitest';
import type { TabelaDTO } from '@/modelos/objetos';
import {
  aplicarMudancaTabelas,
  comandoDaTabela,
  comandoQueRestauraOsAjustes,
  composicaoDasGravacoes,
  descreverAjuste,
  escalaDoCrescimento,
  filtrarTabelas,
  filtrosTabelasIniciais,
  fraseDoCrescimento,
  lerFiltrosTabelas,
  loteDeComandosDasTabelas,
  ordenarTabelas,
  pontosDeAtencaoTabelas,
  resumirCrescimento,
  resumirTabelas,
  situacoesDaTabela,
  textoDaColetaDasTabelas,
  tipoCurto,
  ultimaManutencao,
} from './tabelas';

const geradoEm = '2026-10-19T18:00:00.000Z';
const contexto = { geradoEm, coletaDesde: '2026-09-02T13:12:00.000Z' };
const MB = 1024 * 1024;

function criarTabela(nome: string, campos: Partial<TabelaDTO> = {}): TabelaDTO {
  return {
    id: `public.${nome}`,
    esquema: 'public',
    nome,
    dono: 'loja_app',
    descricao: null,
    colunas: [{ nome: 'id', tipo: 'bigint', anulavel: false, padrao: null }],
    chavePrimaria: ['id'],
    tamanhoDadosBytes: 100 * MB,
    tamanhoIndicesBytes: 20 * MB,
    tamanhoToastBytes: 0,
    linhas: 100_000,
    linhasMortas: 0,
    alteracoesDesdeAnalyze: 0,
    insercoes: 0,
    atualizacoes: 0,
    atualizacoesHot: 0,
    exclusoes: 0,
    leiturasSequenciais: 0,
    linhasLidasSequencialmente: 0,
    leiturasPorIndice: 10,
    linhasLidasPorIndice: 10,
    ultimoVacuum: null,
    ultimoAutovacuum: '2026-10-18T18:00:00.000Z',
    ultimoAnalyze: null,
    ultimoAutoanalyze: '2026-10-18T18:00:00.000Z',
    idadeTransacoes: 10_000_000,
    limiteCongelamento: 200_000_000,
    autovacuum: [],
    particionamento: null,
    indices: [],
    indicesSugeridos: [],
    usadaPor: [],
    gatilhos: [],
    leituras: [],
    crescimento: [],
    ...campos,
  };
}

describe('lerFiltrosTabelas', () => {
  it('começa pelas maiores tabelas e troca cada campo inválido pelo padrão', () => {
    expect(lerFiltrosTabelas(null)).toEqual(filtrosTabelasIniciais);
    expect(filtrosTabelasIniciais).toMatchObject({ ordenacao: 'TAMANHO', direcao: 'DESC' });
    expect(lerFiltrosTabelas({ situacao: 'QUALQUER', ordenacao: 'LINHAS', pagina: -2, esquema: 'a b' })).toEqual({
      ...filtrosTabelasIniciais,
      ordenacao: 'LINHAS',
      direcao: 'DESC',
    });
  });

  it('volta à primeira página em qualquer mudança que não seja de página', () => {
    const naTerceira = { ...filtrosTabelasIniciais, pagina: 3 };
    expect(aplicarMudancaTabelas(naTerceira, { situacao: 'LIDA_INTEIRA' }).pagina).toBe(1);
    expect(aplicarMudancaTabelas(naTerceira, { pagina: 2 }).pagina).toBe(2);
    expect(aplicarMudancaTabelas(naTerceira, {}).pagina).toBe(3);
  });
});

describe('situacoesDaTabela', () => {
  it('pede VACUUM acima de 20% de linhas mortas, a partir de 10 mil', () => {
    expect(situacoesDaTabela(criarTabela('a', { linhasMortas: 20_001 }))).toEqual(['PRECISA_VACUUM']);
    expect(situacoesDaTabela(criarTabela('a', { linhasMortas: 20_000 }))).toEqual([]);
    expect(situacoesDaTabela(criarTabela('a', { linhas: 1_000, linhasMortas: 9_999 }))).toEqual([]);
  });

  it('marca as estatísticas acima de 10% de linhas alteradas desde o ANALYZE', () => {
    expect(situacoesDaTabela(criarTabela('a', { alteracoesDesdeAnalyze: 10_001 }))).toEqual(['ESTATISTICAS_DESATUALIZADAS']);
    expect(situacoesDaTabela(criarTabela('a', { alteracoesDesdeAnalyze: 10_000 }))).toEqual([]);
  });

  it('mede a leitura inteira pelas linhas lidas, só a partir de 10 MB', () => {
    const lida = { leiturasSequenciais: 10, linhasLidasSequencialmente: 1_000_000, leiturasPorIndice: 900_000, linhasLidasPorIndice: 900_000 };
    expect(situacoesDaTabela(criarTabela('a', lida))).toEqual(['LIDA_INTEIRA']);
    expect(situacoesDaTabela(criarTabela('a', { ...lida, tamanhoDadosBytes: 9 * MB }))).toEqual([]);
    expect(situacoesDaTabela(criarTabela('a', { ...lida, linhasLidasPorIndice: 1_000_000 }))).toEqual([]);
  });

  it('marca a idade acima da metade do limite e a falta de chave primária, do mais urgente ao menos', () => {
    expect(
      situacoesDaTabela(criarTabela('a', { idadeTransacoes: 100_000_001, chavePrimaria: null, linhasMortas: 30_000 })),
    ).toEqual(['IDADE_ALTA', 'PRECISA_VACUUM', 'SEM_CHAVE_PRIMARIA']);
    expect(situacoesDaTabela(criarTabela('a', { idadeTransacoes: 100_000_000 }))).toEqual([]);
  });
});

describe('ultimaManutencao e ordenarTabelas', () => {
  const manual = criarTabela('manual', { ultimoVacuum: '2026-10-19T10:00:00.000Z' });
  const automatica = criarTabela('automatica');
  const semRegistro = criarTabela('sem_registro', { ultimoAutovacuum: null });

  it('fica com o mais recente entre o VACUUM manual e o automático', () => {
    expect(ultimaManutencao(manual)).toEqual({ instante: '2026-10-19T10:00:00.000Z', automatica: false });
    expect(ultimaManutencao(automatica)?.automatica).toBe(true);
    expect(ultimaManutencao(semRegistro)).toBeNull();
  });

  it('põe a tabela sem registro primeiro quando ordena pela manutenção mais antiga', () => {
    expect(ordenarTabelas([manual, automatica, semRegistro], 'MANUTENCAO', 'ASC').map((tabela) => tabela.nome)).toEqual([
      'sem_registro',
      'automatica',
      'manual',
    ]);
  });
});

describe('filtrarTabelas e resumirTabelas', () => {
  const pedidos = criarTabela('pedidos', { colunas: [{ nome: 'cliente_id', tipo: 'bigint', anulavel: false, padrao: null }] });
  const legado = criarTabela('importacoes_legado', { chavePrimaria: null, tamanhoDadosBytes: 31 * MB });
  const tabelas = [legado, pedidos];

  it('busca pelo nome, pela descrição e pelas colunas e filtra pela situação', () => {
    expect(filtrarTabelas(tabelas, { ...filtrosTabelasIniciais, busca: 'cliente' }).map((tabela) => tabela.nome)).toEqual(['pedidos']);
    expect(
      filtrarTabelas(tabelas, { ...filtrosTabelasIniciais, situacao: 'SEM_CHAVE_PRIMARIA' }).map((tabela) => tabela.nome),
    ).toEqual(['importacoes_legado']);
  });

  it('diz quantas tabelas e quanto ocupam, ou quantas sobraram dos filtros', () => {
    expect(resumirTabelas(tabelas, 2, filtrosTabelasIniciais)).toBe('2 tabelas ocupando 171,0 MB');
    expect(resumirTabelas(tabelas, 1, { ...filtrosTabelasIniciais, busca: 'x' })).toBe('1 de 2 tabelas');
    expect(resumirTabelas([], 0, filtrosTabelasIniciais)).toBe('Nenhuma tabela no banco');
  });
});

describe('pontosDeAtencaoTabelas', () => {
  it('junta três tabelas do mesmo caso numa frase que filtra a lista', () => {
    const lidas = ['a', 'b', 'c'].map((nome) =>
      criarTabela(nome, { leiturasSequenciais: 5, linhasLidasSequencialmente: 1_000_000 }),
    );
    const pontos = pontosDeAtencaoTabelas([...lidas, criarTabela('d', { chavePrimaria: null })], contexto);
    expect(pontos.map((ponto) => [ponto.tipo, ponto.alvo.tipo, ponto.titulo])).toEqual([
      ['LIDA_INTEIRA', 'FILTRO', '3 tabelas lidas inteiras'],
      ['SEM_CHAVE_PRIMARIA', 'TABELA', null],
    ]);
    expect(pontos[0]?.texto).toBe(
      'A maior parte das linhas lidas em a, b e c vem de leituras da tabela inteira. Os planos não sugerem índice para nenhuma delas.',
    );
  });

  it('descreve a leitura inteira de uma tabela com o tamanho de cada leitura', () => {
    const [ponto] = pontosDeAtencaoTabelas(
      [
        criarTabela('pedidos', {
          leiturasSequenciais: 125_373,
          linhasLidasSequencialmente: 125_373 * 1_953_500,
          indicesSugeridos: [{ colunas: ['cliente_id'], comando: 'CREATE INDEX', extensao: null }],
        }),
      ],
      contexto,
    );
    expect(ponto?.texto).toBe(
      '100% das linhas lidas nos últimos 30 dias vieram de leituras da tabela inteira: 125.373 leituras de 1.953.500 linhas cada. Os planos sugerem um índice.',
    );
  });
});

describe('comandos', () => {
  const auditoria = criarTabela('auditoria', {
    idadeTransacoes: 128_600_000,
    particionamento: {
      estrategia: 'RANGE',
      chave: 'criado_em',
      particoes: [
        { id: 'public.auditoria_2020', esquema: 'public', nome: 'auditoria_2020', limites: '', tamanhoBytes: 1, linhas: 1, linhasMortas: 0, idadeTransacoes: 128_600_000, ultimoVacuum: null, ultimoAutovacuum: null },
        { id: 'public.auditoria_2021', esquema: 'public', nome: 'auditoria_2021', limites: '', tamanhoBytes: 1, linhas: 1, linhasMortas: 0, idadeTransacoes: 96_300_000, ultimoVacuum: null, ultimoAutovacuum: null },
      ],
    },
  });
  const notificacoes = criarTabela('notificacoes', {
    linhasMortas: 40_000,
    alteracoesDesdeAnalyze: 40_000,
    autovacuum: [{ parametro: 'autovacuum_enabled', valor: 'false', padrao: 'true' }],
  });
  const sessoes = criarTabela('sessoes', { alteracoesDesdeAnalyze: 14_000 });

  it('congela só a partição que passou da metade do limite', () => {
    expect(comandoDaTabela(auditoria)?.comando).toBe('VACUUM (FREEZE) public.auditoria_2020;');
  });

  it('prefere o VACUUM com ANALYZE quando a tabela precisa dos dois', () => {
    expect(comandoDaTabela(notificacoes)?.comando).toBe('VACUUM (ANALYZE) public.notificacoes;');
    expect(comandoDaTabela(sessoes)?.comando).toBe('ANALYZE public.sessoes;');
    expect(comandoDaTabela(criarTabela('em_dia'))).toBeNull();
  });

  it('copia em lote o comando de cada tabela da situação filtrada', () => {
    expect(loteDeComandosDasTabelas([notificacoes, sessoes], 'ESTATISTICAS_DESATUALIZADAS')).toEqual({
      comandos: ['VACUUM (ANALYZE) public.notificacoes;', 'ANALYZE public.sessoes;'],
      rotulo: 'Copiar os 2 comandos',
      descricao: 'Copiar os 2 comandos das tabelas da lista, um por linha',
    });
    expect(loteDeComandosDasTabelas([criarTabela('sem_chave', { chavePrimaria: null })], 'SEM_CHAVE_PRIMARIA')).toBeNull();
  });

  it('descreve os ajustes de autovacuum e o comando que os desfaz', () => {
    expect(descreverAjuste({ parametro: 'autovacuum_vacuum_scale_factor', valor: '0.02', padrao: '0.2' })).toEqual({
      rotulo: 'VACUUM automático a partir de',
      efeito: '2% de linhas mortas. O padrão do servidor é 20%.',
    });
    expect(comandoQueRestauraOsAjustes(notificacoes)).toBe('ALTER TABLE public.notificacoes RESET (autovacuum_enabled);');
    expect(comandoQueRestauraOsAjustes(sessoes)).toBeNull();
  });
});

describe('crescimento', () => {
  it('resume o período e explica o espaço que cresce sem novas linhas', () => {
    const inchada = criarTabela('notificacoes', {
      crescimento: [
        { dia: '2026-09-19', tamanhoBytes: 686 * MB, linhas: 3_600_000 },
        { dia: '2026-10-19', tamanhoBytes: 694 * MB, linhas: 3_600_000 },
      ],
    });
    expect(resumirCrescimento(inchada)).toMatchObject({ dias: 1, variacaoBytes: 8 * MB, variacaoLinhas: 0 });
    expect(fraseDoCrescimento(inchada)).toBe(
      'A tabela cresceu 8,0 MB nos últimos 1 dias, com o mesmo número de linhas. O espaço cresceu sem novas linhas: são linhas mortas que nenhum VACUUM limpou.',
    );
    expect(resumirCrescimento(criarTabela('vazia'))).toBeNull();
  });

  it('escolhe marcas redondas na unidade do maior valor, cobrindo os dados', () => {
    const escala = escalaDoCrescimento([599 * MB, 609.6 * MB]);
    expect(escala.unidade).toBe('MB');
    expect(escala.marcas.map((marca) => marca / MB)).toEqual([595, 600, 605, 610]);
    expect(escala.casas).toBe(0);
    const pequena = escalaDoCrescimento([5 * MB, 5.6 * MB]);
    expect(pequena.marcas.map((marca) => Number((marca / MB).toFixed(2)))).toEqual([5, 5.2, 5.4, 5.6]);
    expect(pequena.casas).toBe(1);
    const plana = escalaDoCrescimento([31 * MB, 31 * MB]);
    expect(plana.marcas.length).toBeGreaterThan(1);
    expect(plana.marcas[0]).toBeLessThanOrEqual(31 * MB);
  });

  it('avisa quando a coleta ainda não cobre os 30 dias', () => {
    expect(textoDaColetaDasTabelas(contexto).incompleta).toBe(false);
    expect(textoDaColetaDasTabelas({ geradoEm, coletaDesde: '2026-10-10T13:00:00.000Z' }).completo).toBe(
      'O Orynt começou a coletar o uso das tabelas deste banco há 9 dias. As leituras, as gravações e o crescimento cobrem só os dias desde então.',
    );
  });
});

describe('pontos de uma tabela que precisa de VACUUM e de ANALYZE', () => {
  it('juntam as duas coisas numa frase só, porque o mesmo comando resolve as duas', () => {
    const notificacoes = criarTabela('notificacoes', { linhasMortas: 40_000, alteracoesDesdeAnalyze: 40_000 });
    const pontos = pontosDeAtencaoTabelas([notificacoes], contexto);
    expect(pontos.map((ponto) => ponto.tipo)).toEqual(['PRECISA_VACUUM']);
    expect(pontos[0]?.texto).toMatch(/As estatísticas também estão desatualizadas, e um VACUUM \(ANALYZE\) resolve as duas coisas\.$/);
  });
});

describe('tipoCurto', () => {
  it('usa o nome curto que o PostgreSQL aceita para os tipos longos', () => {
    expect(tipoCurto('timestamp with time zone')).toBe('timestamptz');
    expect(tipoCurto('character varying(120)')).toBe('varchar(120)');
    expect(tipoCurto('numeric(12,2)')).toBe('numeric(12,2)');
    expect(tipoCurto('jsonb')).toBe('jsonb');
  });
});

describe('composicaoDasGravacoes', () => {
  it('cita só os tipos de gravação que aconteceram', () => {
    expect(composicaoDasGravacoes(criarTabela('a', { insercoes: 1_333_938 }))).toBe('1.333.938 inserções');
    expect(composicaoDasGravacoes(criarTabela('a', { insercoes: 2, atualizacoes: 5, atualizacoesHot: 1, exclusoes: 1 }))).toBe(
      '2 inserções, 5 atualizações (1 HOT) e 1 exclusão',
    );
    expect(composicaoDasGravacoes(criarTabela('a'))).toBeNull();
  });
});
