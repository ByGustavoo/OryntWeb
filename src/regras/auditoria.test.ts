import { describe, expect, it } from 'vitest';
import type { EventoAuditoriaDTO } from '@/modelos/administracao';
import { descreverEvento, filtrarEventos, filtrosAuditoriaIniciais, lerFiltrosAuditoria, resumirNavegador } from './auditoria';

const agora = new Date('2026-10-20T12:00:00.000Z');

function evento(extra: Partial<EventoAuditoriaDTO>): EventoAuditoriaDTO {
  return {
    id: 'e',
    ocorridoEm: '2026-10-20T11:00:00.000Z',
    tipo: 'LOGIN',
    categoria: 'AUTENTICACAO',
    modulo: 'ACESSO',
    resultado: 'SUCESSO',
    conta: { id: 'ana', nome: 'Ana Souza', email: 'ana@empresa.com' },
    emailInformado: null,
    alvo: null,
    mudancas: [],
    concedidas: [],
    revogadas: [],
    motivo: null,
    requisicao: null,
    origem: { ip: null, navegador: null },
    ...extra,
  };
}

describe('filtrarEventos', () => {
  const eventos = [
    evento({ id: '1' }),
    evento({
      id: '2',
      ocorridoEm: '2026-10-18T11:00:00.000Z',
      tipo: 'ACESSO_NEGADO',
      categoria: 'CONSULTA',
      modulo: 'ADMINISTRACAO',
      resultado: 'NEGADO',
      alvo: { tipo: 'ROTA', id: '/administracao/contas', rotulo: 'listar as contas do Orynt' },
    }),
    evento({
      id: '3',
      ocorridoEm: '2026-10-20T11:30:00.000Z',
      tipo: 'PERMISSOES_ALTERADAS',
      categoria: 'PERMISSOES',
      modulo: 'ADMINISTRACAO',
      conta: { id: 'bia', nome: 'Bia Reis', email: 'bia@empresa.com' },
      alvo: { tipo: 'CONTA', id: 'ana', rotulo: 'Ana Souza (ana@empresa.com)' },
    }),
  ];

  it('ordena do mais recente ao mais antigo', () => {
    expect(filtrarEventos(eventos, filtrosAuditoriaIniciais, agora).map((item) => item.id)).toEqual(['3', '1', '2']);
  });

  it('a conta escolhida traz o que ela fez e o que fizeram com ela', () => {
    expect(filtrarEventos(eventos, { ...filtrosAuditoriaIniciais, conta: 'ana' }, agora).map((item) => item.id)).toEqual(['3', '1', '2']);
    expect(filtrarEventos(eventos, { ...filtrosAuditoriaIniciais, conta: 'bia' }, agora).map((item) => item.id)).toEqual(['3']);
  });

  it('filtra por resultado, módulo, ação, período e texto', () => {
    expect(filtrarEventos(eventos, { ...filtrosAuditoriaIniciais, resultado: 'NEGADO' }, agora).map((item) => item.id)).toEqual(['2']);
    expect(filtrarEventos(eventos, { ...filtrosAuditoriaIniciais, modulo: 'ADMINISTRACAO' }, agora)).toHaveLength(2);
    expect(filtrarEventos(eventos, { ...filtrosAuditoriaIniciais, categoria: 'PERMISSOES' }, agora).map((item) => item.id)).toEqual(['3']);
    expect(filtrarEventos(eventos, { ...filtrosAuditoriaIniciais, periodo: 'ULTIMAS_24_HORAS' }, agora)).toHaveLength(2);
    expect(filtrarEventos(eventos, { ...filtrosAuditoriaIniciais, busca: 'listar contas' }, agora).map((item) => item.id)).toEqual(['2']);
  });

  it('descreve cada evento numa frase', () => {
    expect(descreverEvento(eventos[1] as EventoAuditoriaDTO)).toBe('Tentou listar as contas do Orynt sem permissão');
    expect(descreverEvento(eventos[2] as EventoAuditoriaDTO)).toBe('Mudou as permissões de Ana Souza (ana@empresa.com)');
  });

  it('descarta valores inválidos vindos do histórico', () => {
    expect(lerFiltrosAuditoria({ conta: 'a b', modulo: 'X', pagina: 2 })).toEqual({ ...filtrosAuditoriaIniciais, pagina: 2 });
  });
});

describe('resumirNavegador', () => {
  it('guarda só o navegador e o sistema', () => {
    expect(
      resumirNavegador(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      ),
    ).toBe('Chrome 141 no Windows');
    expect(
      resumirNavegador('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'),
    ).toBe('Safari 18 no iOS');
    expect(resumirNavegador('')).toBeNull();
  });
});
