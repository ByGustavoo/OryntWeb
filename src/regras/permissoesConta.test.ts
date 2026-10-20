import { describe, expect, it } from 'vitest';
import { navegacaoDaConta } from '@/configuracoes/navegacao';
import type { CodigoPermissao, ContaDTO } from '@/modelos/administracao';
import { caminhos } from '@/rotas/caminhos';
import {
  CATALOGO_DE_PERMISSOES,
  avaliarMudancaDeConta,
  destinoInicialDaConta,
  diferencaDePermissoes,
  marcarPermissao,
  motivoDoBloqueioDaPermissao,
  permissoesAoTrocarDePerfil,
  permissoesDasOperacoes,
  permissoesDoPerfil,
  personalizada,
  podeAbrirTela,
  telaDoCaminho,
} from './permissoesConta';

function conta(id: string, permissoes: CodigoPermissao[], extra: Partial<ContaDTO> = {}): ContaDTO {
  return {
    id,
    nome: id,
    email: `${id}@empresa.com`,
    perfil: 'ADMINISTRADOR',
    permissoes,
    ativa: true,
    inicial: false,
    criadaEm: '2026-10-01T12:00:00.000Z',
    criadaPor: null,
    atualizadaEm: '2026-10-01T12:00:00.000Z',
    ultimoAcessoEm: null,
    convite: null,
    bloqueadaAte: null,
    sessoesAtivas: 0,
    conexoesSalvas: 0,
    ...extra,
  };
}

const tudo = [...CATALOGO_DE_PERMISSOES];

describe('perfis', () => {
  it('o Administrador tem todo o catálogo e os outros perfis não administram contas', () => {
    expect(permissoesDoPerfil('ADMINISTRADOR')).toEqual(tudo);
    expect(permissoesDoPerfil('ANALISTA')).not.toContain('ADMIN_USUARIOS');
    expect(permissoesDoPerfil('LEITOR')).toEqual(['DASHBOARD_VER', 'RELATORIOS_VER', 'CONEXOES_USAR']);
  });

  it('marca como personalizada a conta que foge do perfil', () => {
    expect(personalizada('LEITOR', permissoesDoPerfil('LEITOR'))).toBe(false);
    expect(personalizada('LEITOR', [...permissoesDoPerfil('LEITOR'), 'CONSULTAS_VER'])).toBe(true);
  });
});

describe('marcarPermissao', () => {
  it('concede junto a permissão de que a marcada depende', () => {
    expect(marcarPermissao([], 'BANCO_PAPEIS_ALTERAR', true)).toEqual(['BANCO_ACESSOS_VER', 'BANCO_PAPEIS_ALTERAR']);
  });

  it('revoga junto as permissões que dependem da desmarcada', () => {
    const antes: CodigoPermissao[] = ['BANCO_ACESSOS_VER', 'BANCO_PAPEIS_ALTERAR', 'BANCO_PERMISSOES_ALTERAR', 'DASHBOARD_VER'];
    expect(marcarPermissao(antes, 'BANCO_ACESSOS_VER', false)).toEqual(['DASHBOARD_VER']);
  });

  it('separa o que foi concedido do que foi revogado', () => {
    expect(diferencaDePermissoes(['DASHBOARD_VER', 'RELATORIOS_VER'], ['DASHBOARD_VER', 'CONSULTAS_VER'])).toEqual({
      concedidas: ['CONSULTAS_VER'],
      revogadas: ['RELATORIOS_VER'],
    });
  });
});

describe('avaliarMudancaDeConta', () => {
  const admin = conta('admin', tudo);
  const outra = conta('outra', tudo);
  const leitor = conta('leitor', permissoesDoPerfil('LEITOR'), { perfil: 'LEITOR' });

  it('não deixa desativar nem excluir a própria conta', () => {
    expect(avaliarMudancaDeConta(admin, admin, { tipo: 'DESATIVAR' }, [admin, outra])?.motivo).toBe('PROPRIA_CONTA');
    expect(avaliarMudancaDeConta(admin, admin, { tipo: 'EXCLUIR' }, [admin, outra])?.motivo).toBe('PROPRIA_CONTA');
  });

  it('protege o último administrador ativo', () => {
    const unica = conta('unica', tudo);
    const ator = conta('ator', ['ADMIN_AUDITORIA', 'ADMIN_USUARIOS'], { ativa: true });
    const contas = [unica, { ...ator, permissoes: ['ADMIN_AUDITORIA' as CodigoPermissao] }];
    expect(avaliarMudancaDeConta(ator, unica, { tipo: 'EXCLUIR' }, contas)?.motivo).toBe('ULTIMO_ADMINISTRADOR');
    expect(
      avaliarMudancaDeConta(ator, unica, { tipo: 'PERMISSOES', perfil: 'ANALISTA', permissoes: permissoesDoPerfil('ANALISTA') }, contas)
        ?.motivo,
    ).toBe('ULTIMO_ADMINISTRADOR');
  });

  it('não deixa tirar de si mesmo a gestão de usuários', () => {
    const recusa = avaliarMudancaDeConta(admin, admin, { tipo: 'PERMISSOES', perfil: 'ANALISTA', permissoes: permissoesDoPerfil('ANALISTA') }, [
      admin,
      outra,
    ]);
    expect(recusa?.motivo).toBe('PROPRIA_CONTA');
  });

  it('não exclui nem desativa a conta inicial', () => {
    const inicial = conta('inicial', tudo, { inicial: true });
    expect(avaliarMudancaDeConta(admin, inicial, { tipo: 'EXCLUIR' }, [admin, inicial])?.motivo).toBe('CONTA_INICIAL');
  });

  it('recusa conceder o que o próprio administrador não tem', () => {
    const limitado = conta('limitado', ['ADMIN_USUARIOS', 'DASHBOARD_VER']);
    const recusa = avaliarMudancaDeConta(
      limitado,
      leitor,
      { tipo: 'PERMISSOES', perfil: 'LEITOR', permissoes: [...leitor.permissoes, 'CONSULTAS_VER'] },
      [limitado, leitor, admin],
    );
    expect(recusa?.motivo).toBe('ELEVACAO');
    expect(recusa?.mensagem).toContain('Ver as consultas');
  });

  it('deixa revogar o que o administrador não tem', () => {
    const limitado = conta('limitado', ['ADMIN_USUARIOS']);
    expect(
      avaliarMudancaDeConta(limitado, leitor, { tipo: 'PERMISSOES', perfil: 'LEITOR', permissoes: ['DASHBOARD_VER'] }, [limitado, leitor]),
    ).toBeNull();
  });

  it('recusa permissões sem a de que dependem', () => {
    expect(
      avaliarMudancaDeConta(admin, leitor, { tipo: 'PERMISSOES', perfil: 'LEITOR', permissoes: ['BANCO_PAPEIS_ALTERAR'] }, [admin, leitor])
        ?.motivo,
    ).toBe('REQUISITO');
  });
});

describe('motivoDoBloqueioDaPermissao e permissoesAoTrocarDePerfil', () => {
  it('trava a caixa do que o administrador não pode conceder', () => {
    const limitado = conta('limitado', ['ADMIN_USUARIOS']);
    const alvo = conta('alvo', []);
    expect(motivoDoBloqueioDaPermissao(limitado, alvo, [limitado, alvo], 'CONSULTAS_VER', false)).toContain('não pode concedê-la');
    expect(motivoDoBloqueioDaPermissao(limitado, alvo, [limitado, alvo], 'ADMIN_USUARIOS', false)).toBeNull();
  });

  it('ao trocar de perfil deixa de fora o que o administrador não tem', () => {
    const limitado = conta('limitado', ['ADMIN_USUARIOS', 'DASHBOARD_VER']);
    const { permissoes, foraDoAlcance } = permissoesAoTrocarDePerfil(limitado, null, 'LEITOR');
    expect(permissoes).toEqual(['DASHBOARD_VER']);
    expect(foraDoAlcance).toEqual(['RELATORIOS_VER', 'CONEXOES_USAR']);
  });
});

describe('telas e navegação', () => {
  const leitor = { permissoes: permissoesDoPerfil('LEITOR') };

  it('cada tela pede a sua permissão', () => {
    expect(telaDoCaminho(caminhos.administracaoUsuarios)?.permissao).toBe('ADMIN_USUARIOS');
    expect(podeAbrirTela(leitor, caminhos.consultasTodas)).toBe(false);
    expect(podeAbrirTela(leitor, caminhos.relatoriosResumo)).toBe(true);
    expect(podeAbrirTela(leitor, caminhos.configuracoes)).toBe(true);
  });

  it('o menu do Leitor não mostra Administração, Consultas nem Objetos', () => {
    const titulos = navegacaoDaConta(leitor).map((secao) => secao.titulo ?? 'inicio');
    expect(titulos).toEqual(['inicio', 'Análise']);
    expect(navegacaoDaConta(leitor)[1]?.itens.map((item) => item.rotulo)).toEqual(['Relatórios']);
    expect(navegacaoDaConta({ permissoes: tudo }).map((secao) => secao.titulo)).toContain('Administração');
  });

  it('quem não vê o dashboard começa na primeira tela que pode abrir', () => {
    expect(destinoInicialDaConta({ permissoes: ['CONSULTAS_VER'] })).toBe(caminhos.consultasTodas);
    expect(destinoInicialDaConta({ permissoes: [] })).toBe(caminhos.configuracoes);
  });

  it('cada operação de alteração do banco pede a permissão do seu tipo', () => {
    expect(permissoesDasOperacoes(['CRIAR_PAPEL'])).toEqual(['BANCO_ACESSOS_VER', 'BANCO_PAPEIS_ALTERAR']);
    expect(permissoesDasOperacoes(['CONCEDER', 'CRIAR_PAPEL'])).toEqual([
      'BANCO_ACESSOS_VER',
      'BANCO_PAPEIS_ALTERAR',
      'BANCO_PERMISSOES_ALTERAR',
    ]);
  });
});
