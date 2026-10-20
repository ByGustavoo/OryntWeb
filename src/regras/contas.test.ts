import { describe, expect, it } from 'vitest';
import type { ContaDTO } from '@/modelos/administracao';
import {
  contarAtencao,
  filtrarContas,
  filtrosContasIniciais,
  lerFiltrosContas,
  montarNovaConta,
  semAcessoRecente,
  situacaoDaConta,
  validarConta,
} from './contas';

const agora = new Date('2026-10-20T12:00:00.000Z');

function conta(extra: Partial<ContaDTO>): ContaDTO {
  return {
    id: 'c',
    nome: 'Ana Souza',
    email: 'ana@empresa.com',
    perfil: 'LEITOR',
    permissoes: ['DASHBOARD_VER'],
    ativa: true,
    inicial: false,
    criadaEm: '2026-10-19T12:00:00.000Z',
    criadaPor: null,
    atualizadaEm: '2026-10-19T12:00:00.000Z',
    ultimoAcessoEm: '2026-10-20T11:00:00.000Z',
    convite: null,
    bloqueadaAte: null,
    sessoesAtivas: 0,
    conexoesSalvas: 0,
    ...extra,
  };
}

describe('situacaoDaConta', () => {
  it('lê a situação do que a conta guarda, na ordem de urgência', () => {
    expect(situacaoDaConta(conta({}), agora)).toBe('ATIVA');
    expect(situacaoDaConta(conta({ ativa: false, bloqueadaAte: '2026-10-20T12:10:00.000Z' }), agora)).toBe('DESATIVADA');
    expect(situacaoDaConta(conta({ bloqueadaAte: '2026-10-20T12:10:00.000Z' }), agora)).toBe('BLOQUEADA');
    expect(situacaoDaConta(conta({ bloqueadaAte: '2026-10-20T11:50:00.000Z' }), agora)).toBe('ATIVA');
    expect(
      situacaoDaConta(conta({ convite: { enviadoEm: '2026-10-19T12:00:00.000Z', expiraEm: '2026-10-26T12:00:00.000Z' } }), agora),
    ).toBe('CONVITE_PENDENTE');
    expect(
      situacaoDaConta(conta({ convite: { enviadoEm: '2026-10-01T12:00:00.000Z', expiraEm: '2026-10-08T12:00:00.000Z' } }), agora),
    ).toBe('CONVITE_EXPIRADO');
  });

  it('aponta a conta ativa sem acesso há 30 dias, contando da criação quando nunca entrou', () => {
    expect(semAcessoRecente(conta({ ultimoAcessoEm: '2026-09-19T12:00:00.000Z' }), agora)).toBe(true);
    expect(semAcessoRecente(conta({ ultimoAcessoEm: null, criadaEm: '2026-10-01T12:00:00.000Z' }), agora)).toBe(false);
    expect(semAcessoRecente(conta({ ultimoAcessoEm: null, criadaEm: '2026-09-01T12:00:00.000Z' }), agora)).toBe(true);
  });
});

describe('filtros da lista', () => {
  const contas = [
    conta({ id: 'a', nome: 'Bruno Lima', email: 'bruno@empresa.com', perfil: 'ANALISTA' }),
    conta({ id: 'b', nome: 'Ana Souza', email: 'ana@empresa.com', ativa: false }),
    conta({ id: 'c', nome: 'Carla Dias', email: 'carla@empresa.com', ultimoAcessoEm: '2026-08-01T12:00:00.000Z' }),
  ];

  it('busca sem acento no nome e no e-mail e põe as desativadas por último', () => {
    expect(filtrarContas(contas, { ...filtrosContasIniciais, busca: 'BRUNO' }, agora).map((item) => item.id)).toEqual(['a']);
    expect(filtrarContas(contas, filtrosContasIniciais, agora).map((item) => item.id)).toEqual(['a', 'c', 'b']);
  });

  it('filtra por perfil e situação e conta os atalhos de atenção', () => {
    expect(filtrarContas(contas, { ...filtrosContasIniciais, perfil: 'ANALISTA' }, agora).map((item) => item.id)).toEqual(['a']);
    expect(filtrarContas(contas, { ...filtrosContasIniciais, situacao: 'SEM_ACESSO_RECENTE' }, agora).map((item) => item.id)).toEqual(['c']);
    expect(contarAtencao(contas, agora)).toEqual({ semAcesso: 1, convitesExpirados: 0, bloqueadas: 0 });
  });

  it('troca cada valor inválido do histórico pelo padrão', () => {
    expect(lerFiltrosContas({ perfil: 'DONO', situacao: 'ATIVA', pagina: -2, busca: 7 })).toEqual({
      ...filtrosContasIniciais,
      situacao: 'ATIVA',
    });
  });
});

describe('formulário', () => {
  it('cobra nome e e-mail válidos', () => {
    expect(validarConta({ nome: ' ', email: 'ana' })).toEqual({
      nome: 'Informe o nome da pessoa.',
      email: 'Digite um e-mail completo, como pessoa@empresa.com.',
    });
  });

  it('normaliza o que vai para a API', () => {
    expect(
      montarNovaConta({ nome: '  Ana   Souza ', email: ' Ana@Empresa.com ', perfil: 'LEITOR', permissoes: ['RELATORIOS_VER', 'DASHBOARD_VER'], ativa: true }),
    ).toEqual({ nome: 'Ana Souza', email: 'ana@empresa.com', perfil: 'LEITOR', permissoes: ['DASHBOARD_VER', 'RELATORIOS_VER'], ativa: true });
  });
});
