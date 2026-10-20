import { describe, expect, it } from 'vitest';
import {
  acessoDe,
  idDoEsquema,
  indexarPermissoes,
  linhasDoPapel,
  pontosDeAtencaoPermissoes,
  PUBLICO,
} from '@/regras/permissoes';
import { gerarFuncoes } from './funcoes';
import { gerarPapeis } from './papeis';
import { gerarPermissoes } from './permissoes';
import { gerarTabelas } from './tabelas';
import { gerarVisoes } from './visoes';

const agora = new Date(2026, 9, 19, 15, 0);
const conexao = { usuario: 'loja_app', banco: 'loja' };
const lista = gerarPermissoes(agora, conexao);
const indice = indexarPermissoes(lista);

function situacoes(sujeito: string, id: string) {
  return linhasDoPapel(sujeito, indice).find((linha) => linha.chave === id)?.situacoes ?? [];
}

describe('gerarPermissoes', () => {
  it('cobre as tabelas, as visões e as funções das outras telas, com os mesmos donos', () => {
    const porId = new Map(lista.objetos.map((objeto) => [objeto.id, objeto]));
    for (const tabela of gerarTabelas(agora).tabelas) expect(porId.get(tabela.id)?.dono).toBe(tabela.dono);
    for (const visao of gerarVisoes(agora).visoes) expect(porId.get(visao.id)?.dono).toBe(visao.dono);
    for (const funcao of gerarFuncoes(agora).funcoes) expect(porId.get(funcao.id)?.dono).toBe(funcao.dono);
  });

  it('tem os papéis de Papéis, com a mesma participação', () => {
    const papeis = gerarPapeis(agora, conexao.usuario, false, false).papeis;
    expect(lista.papeis.map((papel) => papel.nome)).toEqual(papeis.map((papel) => papel.nome));
    expect(lista.papeis.find((papel) => papel.nome === 'suporte_dba')?.membroDe).toEqual([
      { papel: 'loja_admin', herda: false, assume: true, administra: false },
    ]);
  });

  it('só concede a papéis que existem, e cada concedente pode conceder', () => {
    const nomes = new Set([...lista.papeis.map((papel) => papel.nome), PUBLICO]);
    for (const objeto of lista.objetos) {
      for (const concessao of objeto.concessoes) {
        expect(nomes.has(concessao.beneficiario)).toBe(true);
        const concedente = lista.papeis.find((papel) => papel.nome === concessao.concedente);
        expect(concedente && (concedente.superusuario || concedente.nome === objeto.dono)).toBe(true);
      }
    }
  });

  it('aponta os casos desenhados e nenhum outro', () => {
    const pontos = pontosDeAtencaoPermissoes(indice);
    expect(pontos.map((ponto) => ponto.chave)).toEqual([
      'DEFINIDOR_ABERTO-public.arquivar_pedidos_antigos(integer)',
      `TODOS_CRIAM-${idDoEsquema('public')}`,
      'ESCRITA_NA_LEITURA-leitura-public.produtos',
      'REPASSE-integracao_erp',
      'SEM_USAGE-relatorio_bi-auditoria',
      'SEM_PRIVILEGIO_PADRAO-leitura-relatorios',
      `USAGE_SEM_OBJETOS-relatorios_antigos-${idDoEsquema('relatorios')}`,
    ]);
    expect(pontos.find((ponto) => ponto.tipo === 'SEM_PRIVILEGIO_PADRAO')?.texto).toContain(
      'relatorios.estoque_por_categoria, criada depois, já ficou de fora.',
    );
  });

  it('dá a cada papel o acesso que a história dele conta', () => {
    expect(situacoes('loja_analise', 'public.produtos')).toEqual(['ESCRITA_NA_LEITURA']);
    expect(situacoes('relatorio_bi', 'auditoria.acoes_recentes')).toEqual(['SEM_USAGE']);
    const pedidos = lista.objetos.find((objeto) => objeto.id === 'public.pedidos');
    const usuarios = lista.objetos.find((objeto) => objeto.id === 'public.usuarios');
    if (!pedidos || !usuarios) throw new Error('Tabelas ausentes.');
    expect(acessoDe('loja_app', pedidos, indice).nivel).toBe('TOTAL');
    expect(acessoDe('migracao', pedidos, indice).nivel).toBe('TOTAL');
    expect(acessoDe('suporte_dba', pedidos, indice).nivel).toBe('NENHUM');
    expect(acessoDe('suporte_dba', usuarios, indice).privilegios[0]?.colunas).toEqual(['id', 'email', 'criado_em']);
    expect(acessoDe('auditoria_app', lista.objetos.find((objeto) => objeto.id === 'auditoria.acoes_recentes') ?? pedidos, indice).nivel).toBe('TOTAL');
  });

  it('esvazia quando a simulação pede', () => {
    expect(gerarPermissoes(agora, conexao, true)).toMatchObject({ papeis: [], objetos: [], privilegiosPadrao: [] });
  });
});
