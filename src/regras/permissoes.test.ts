import { describe, expect, it } from 'vitest';
import type {
  ConcessaoDTO,
  ListaPermissoesDTO,
  ObjetoComPermissoesDTO,
  PapelDasPermissoesDTO,
  Privilegio,
} from '@/modelos/permissoes';
import {
  acessoDe,
  aplicarMudancaPermissoes,
  compararPapeis,
  comandosDoAcesso,
  comandosParaConceder,
  filtrarLinhas,
  filtrosPermissoesIniciais,
  formasDeTirar,
  idDoEsquema,
  indexarPermissoes,
  lerFiltrosPermissoes,
  lerIdDoObjetoPermissao,
  linhasDoObjeto,
  linhasDoPapel,
  loteDeComandosDasPermissoes,
  papelMaisParecido,
  pontosDeAtencaoPermissoes,
  PUBLICO,
  referenciaSql,
  resumoDasOrigens,
  rotuloDoNivel,
} from './permissoes';
import type { IndiceDasPermissoes } from './permissoes';

function papel(nome: string, extra: Partial<PapelDasPermissoesDTO> = {}): PapelDasPermissoesDTO {
  return { nome, descricao: null, login: true, superusuario: false, membroDe: [], ...extra };
}

function grupo(nome: string): PapelDasPermissoesDTO {
  return papel(nome, { login: false });
}

function membro(papelDoGrupo: string, herda = true) {
  return { papel: papelDoGrupo, herda, assume: true, administra: false };
}

function concessao(beneficiario: string, privilegio: Privilegio, extra: Partial<ConcessaoDTO> = {}): ConcessaoDTO {
  return { beneficiario, privilegio, concedente: 'dono', repassavel: false, colunas: null, ...extra };
}

function objeto(
  id: string,
  tipo: ObjetoComPermissoesDTO['tipo'],
  concessoes: ConcessaoDTO[] = [],
  extra: Partial<ObjetoComPermissoesDTO> = {},
): ObjetoComPermissoesDTO {
  const ponto = id.indexOf('.');
  const esquema = tipo === 'ESQUEMA' || tipo === 'BANCO' ? null : id.slice(0, ponto);
  const nome = tipo === 'ESQUEMA' ? id.slice('esquema:'.length) : tipo === 'BANCO' ? id.slice('banco:'.length) : id.slice(ponto + 1);
  return { id, tipo, esquema, nome, dono: 'dono', segurancaDefinidor: false, concessoes, ...extra };
}

function leitura(...ids: string[]): ObjetoComPermissoesDTO[] {
  return ids.map((id) => objeto(id, 'TABELA', [concessao('leitores', 'SELECT')]));
}

function indice(dados: Partial<ListaPermissoesDTO>): IndiceDasPermissoes {
  return indexarPermissoes({
    geradoEm: '2026-10-19T18:00:00.000Z',
    banco: 'loja',
    papelDaConexao: 'app',
    papeis: [],
    objetos: [],
    privilegiosPadrao: [],
    ...dados,
  });
}

function obter(alvo: IndiceDasPermissoes, id: string): ObjetoComPermissoesDTO {
  const encontrado = alvo.objetos.get(id);
  if (!encontrado) throw new Error(`Objeto ${id} ausente.`);
  return encontrado;
}

const papeis = [
  papel('dono'),
  papel('raiz', { superusuario: true }),
  grupo('leitores'),
  papel('ana', { membroDe: [membro('leitores')] }),
  papel('bia', { membroDe: [membro('leitores', false)] }),
  papel('caio'),
];

describe('acessoDe', () => {
  const base = indice({
    papeis,
    objetos: [
      objeto(idDoEsquema('public'), 'ESQUEMA', [concessao(PUBLICO, 'USAGE')]),
      objeto('public.pedidos', 'TABELA', [
        concessao('leitores', 'SELECT'),
        concessao('caio', 'INSERT', { repassavel: true }),
        concessao('caio', 'SELECT', { colunas: ['id'] }),
        concessao(PUBLICO, 'SELECT', { colunas: ['criado_em'] }),
      ]),
    ],
  });
  const pedidos = obter(base, 'public.pedidos');

  it('dá tudo ao superusuário e ao dono, sem olhar as concessões', () => {
    expect(acessoDe('raiz', pedidos, base)).toMatchObject({ nivel: 'TOTAL' });
    expect(acessoDe('raiz', pedidos, base).privilegios[0]?.origens).toEqual([{ tipo: 'SUPERUSUARIO' }]);
    expect(acessoDe('dono', pedidos, base).privilegios).toHaveLength(8);
    expect(resumoDasOrigens(acessoDe('dono', pedidos, base))).toBe('Dono');
  });

  it('herda pelo grupo só quando a participação herda', () => {
    const ana = acessoDe('ana', pedidos, base);
    expect(ana.nivel).toBe('LEITURA');
    expect(resumoDasOrigens(ana)).toBe('Pelo grupo leitores e PUBLIC');
    expect(acessoDe('bia', pedidos, base).privilegios.map((item) => item.privilegio)).toEqual(['SELECT']);
    expect(resumoDasOrigens(acessoDe('bia', pedidos, base))).toBe('PUBLIC');
  });

  it('junta as colunas de concessões parciais e marca o repasse', () => {
    const caio = acessoDe('caio', pedidos, base);
    expect(caio.nivel).toBe('ESCRITA');
    expect(rotuloDoNivel(caio)).toBe('Leitura e escrita');
    expect(caio.privilegios.find((item) => item.privilegio === 'SELECT')?.colunas).toEqual(['id', 'criado_em']);
    expect(caio.privilegios.find((item) => item.privilegio === 'INSERT')?.repassavel).toBe(true);
  });

  it('lista em Por objeto PUBLIC e quem tem acesso próprio, e deixa de fora quem só recebe de PUBLIC', () => {
    const linhas = linhasDoObjeto('public.pedidos', base).map((item) => item.chave);
    expect(linhas[0]).toBe(PUBLICO);
    expect(linhas).toEqual(expect.arrayContaining(['raiz', 'dono', 'ana', 'caio', 'leitores']));
    expect(linhas).not.toContain('bia');
  });
});

describe('situações', () => {
  const dados = indice({
    papeis: [...papeis, grupo('antigos'), papel('bi')],
    objetos: [
      objeto(idDoEsquema('public'), 'ESQUEMA', [concessao(PUBLICO, 'USAGE'), concessao(PUBLICO, 'CREATE')]),
      objeto(idDoEsquema('rel'), 'ESQUEMA', [concessao('leitores', 'USAGE'), concessao('antigos', 'USAGE')]),
      objeto(idDoEsquema('aud'), 'ESQUEMA'),
      ...leitura('public.a', 'public.b', 'public.c', 'public.d', 'rel.x', 'rel.y'),
      objeto('rel.z', 'TABELA'),
      objeto('public.e', 'TABELA', [concessao('leitores', 'SELECT'), concessao('leitores', 'UPDATE')]),
      objeto('public.f', 'TABELA', [concessao('caio', 'SELECT', { repassavel: true })]),
      objeto('aud.log', 'TABELA', [concessao('bi', 'SELECT')]),
      objeto('public.arquivar()', 'PROCEDIMENTO', [concessao(PUBLICO, 'EXECUTE')], {
        segurancaDefinidor: true,
        dono: 'raiz',
      }),
    ],
    privilegiosPadrao: [
      { criador: 'dono', esquema: 'public', tipoDeObjeto: 'TABELAS', beneficiario: 'leitores', privilegios: ['SELECT'] },
    ],
  });

  it('aponta cada caso na linha certa', () => {
    const doPapel = (sujeito: string, id: string) =>
      linhasDoPapel(sujeito, dados).find((item) => item.chave === id)?.situacoes ?? [];
    expect(doPapel(PUBLICO, 'public.arquivar()')).toEqual(['DEFINIDOR_ABERTO']);
    expect(doPapel('caio', idDoEsquema('public'))).toEqual(['TODOS_CRIAM']);
    expect(doPapel('ana', 'public.e')).toEqual(['ESCRITA_NA_LEITURA']);
    expect(doPapel('leitores', 'public.e')).toEqual(['ESCRITA_NA_LEITURA']);
    expect(doPapel('caio', 'public.f')).toEqual(['REPASSE']);
    expect(doPapel('bi', 'aud.log')).toEqual(['SEM_USAGE']);
    expect(doPapel('leitores', idDoEsquema('rel'))).toEqual(['SEM_PRIVILEGIO_PADRAO']);
    expect(doPapel('leitores', idDoEsquema('public'))).toEqual(['TODOS_CRIAM']);
    expect(doPapel('antigos', idDoEsquema('rel'))).toEqual(['USAGE_SEM_OBJETOS']);
    expect(doPapel('raiz', 'aud.log')).toEqual([]);
  });

  it('escreve um ponto por caso, do mais urgente ao menos urgente', () => {
    const pontos = pontosDeAtencaoPermissoes(dados);
    expect(pontos.map((ponto) => ponto.tipo)).toEqual([
      'DEFINIDOR_ABERTO',
      'TODOS_CRIAM',
      'ESCRITA_NA_LEITURA',
      'REPASSE',
      'SEM_USAGE',
      'SEM_PRIVILEGIO_PADRAO',
      'USAGE_SEM_OBJETOS',
    ]);
    expect(pontos[0]?.texto).toBe(
      'PUBLIC executa public.arquivar(), um procedimento SECURITY DEFINER de raiz, que é superusuário: qualquer papel que conecta ao banco roda esse código com os privilégios de raiz.',
    );
    expect(pontos[5]?.texto).toContain('rel.z, criada depois, já ficou de fora.');
    expect(pontos[0]?.alvo).toEqual({ tipo: 'LINHA', modo: 'OBJETO', selecao: 'public.arquivar()', abrir: PUBLICO });
  });

  it('monta os comandos de cada caso, sem repetir no lote', () => {
    const linhas = linhasDoPapel('leitores', dados);
    const esquema = linhas.find((item) => item.chave === idDoEsquema('rel'));
    if (!esquema) throw new Error('Esquema ausente.');
    expect(comandosDoAcesso(esquema, dados)[0]?.comando).toBe(
      'ALTER DEFAULT PRIVILEGES FOR ROLE dono IN SCHEMA rel GRANT SELECT ON TABLES TO leitores;\nGRANT SELECT ON TABLE rel.z TO leitores;',
    );
    const escrita = linhasDoObjeto('public.e', dados);
    expect(loteDeComandosDasPermissoes(escrita, 'ESCRITA_NA_LEITURA', dados)?.comandos).toEqual([
      'REVOKE UPDATE ON TABLE public.e FROM leitores;',
    ]);
  });

  it('explica como tirar e como dar o acesso', () => {
    const ana = acessoDe('ana', obter(dados, 'public.a'), dados);
    expect(formasDeTirar(ana).map((forma) => forma.comando)).toEqual(['REVOKE leitores FROM ana;']);
    const bi = acessoDe('bi', obter(dados, 'rel.z'), dados);
    expect(comandosParaConceder(bi, dados)).toEqual(['GRANT USAGE ON SCHEMA rel TO bi;', 'GRANT SELECT ON TABLE rel.z TO bi;']);
  });
});

describe('filtros e comparação', () => {
  const dados = indice({
    papeis,
    objetos: [
      objeto('public.a', 'TABELA', [concessao('ana', 'SELECT'), concessao('caio', 'SELECT'), concessao('caio', 'INSERT')]),
      objeto('public.b', 'TABELA', [concessao('ana', 'SELECT')]),
      objeto('public.c', 'TABELA'),
    ],
  });

  it('mostra por padrão só o que tem acesso e separa o sem acesso', () => {
    const linhas = linhasDoPapel('ana', dados);
    expect(filtrarLinhas(linhas, filtrosPermissoesIniciais, dados).map((item) => item.chave)).toEqual(['public.a', 'public.b']);
    expect(
      filtrarLinhas(linhas, { ...filtrosPermissoesIniciais, acesso: 'SEM_ACESSO' }, dados).map((item) => item.chave),
    ).toEqual(['public.c']);
  });

  it('compara dois papéis e acha o mais parecido', () => {
    const comparacao = compararPapeis('ana', 'caio', dados);
    expect(comparacao.map((item) => [item.chave, item.soEmA, item.soEmB])).toEqual([
      ['public.a', [], ['INSERT']],
      ['public.b', ['SELECT'], []],
    ]);
    expect(papelMaisParecido('ana', dados)).toBe('caio');
  });

  it('lê do histórico só valores válidos e volta à primeira página ao mudar', () => {
    expect(lerFiltrosPermissoes({ modo: 'OBJETO', objeto: 'public.a', papel: 'DROP ROLE;', pagina: 3 })).toMatchObject({
      modo: 'OBJETO',
      objeto: 'public.a',
      papel: null,
      pagina: 3,
    });
    expect(lerIdDoObjetoPermissao('esquema:public')).toBe('esquema:public');
    expect(lerIdDoObjetoPermissao('banco:loja')).toBe('banco:loja');
    expect(lerIdDoObjetoPermissao('public.f(integer)')).toBe('public.f(integer)');
    expect(lerIdDoObjetoPermissao('<script>')).toBeNull();
    const filtros = { ...filtrosPermissoesIniciais, busca: 'x', pagina: 2 };
    expect(aplicarMudancaPermissoes(filtros, { papel: 'ana' })).toMatchObject({ papel: 'ana', busca: 'x', pagina: 1 });
    expect(aplicarMudancaPermissoes(filtros, { modo: 'OBJETO' })).toMatchObject({ modo: 'OBJETO', busca: '', pagina: 1 });
  });

  it('escreve a referência SQL de cada tipo', () => {
    expect(referenciaSql({ tipo: 'PROCEDIMENTO', esquema: 'public', nome: 'arquivar(integer)' })).toBe(
      'PROCEDURE public.arquivar(integer)',
    );
    expect(referenciaSql({ tipo: 'VISAO_MATERIALIZADA', esquema: 'rel', nome: 'Vendas' })).toBe('TABLE rel."Vendas"');
    expect(referenciaSql({ tipo: 'BANCO', esquema: null, nome: 'loja' })).toBe('DATABASE loja');
  });
});
