import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rotasApi } from '@/api/rotasApi';
import type { MetodoHttp, RespostaTransporte } from '@/api/transporte';
import type { ContaDTO, PaginaAuditoriaDTO } from '@/modelos/administracao';
import type { TelasOcultasDTO } from '@/modelos/telas';
import { permissoesDoPerfil } from '@/regras/permissoesConta';
import { restaurarAuditoriaSimulada } from './auditoriaSimulada';
import { restaurarContasSimuladas } from './contasSimuladas';
import { lerConviteSimulado, reiniciarConvitesSimulados } from './convitesSimulados';
import { CREDENCIAIS_DEMONSTRACAO } from './credenciaisDemonstracao';
import { lerTelasOcultasSimuladas } from './telasOcultasSimuladas';
import { atenderNoSimulador } from './transporteSimulado';

const { armazenamento, biscoitos } = vi.hoisted(() => {
  const armazenamento = new Map<string, string>();
  const biscoitos = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (chave: string) => armazenamento.get(chave) ?? null,
      setItem: (chave: string, valor: string) => armazenamento.set(chave, valor),
      removeItem: (chave: string) => armazenamento.delete(chave),
    },
    location: { reload: () => undefined },
  });
  vi.stubGlobal('document', {
    get cookie() {
      return [...biscoitos.entries()].map(([nome, valor]) => `${nome}=${valor}`).join('; ');
    },
    set cookie(texto: string) {
      const [par = ''] = texto.split(';');
      const separador = par.indexOf('=');
      const nome = par.slice(0, separador).trim();
      const valor = par.slice(separador + 1);
      if (texto.includes('max-age=0') || valor === '') biscoitos.delete(nome);
      else biscoitos.set(nome, valor);
    },
  });
  return { armazenamento, biscoitos };
});

let relogio = new Date('2026-11-10T12:00:00.000Z');

afterAll(() => vi.unstubAllGlobals());

function pedir(metodo: MetodoHttp, caminho: string, corpo?: unknown, consulta: Record<string, string> = {}): Promise<RespostaTransporte> {
  relogio = new Date(relogio.getTime() + 60_000);
  return atenderNoSimulador({ metodo, caminho, consulta, corpo, cabecalhos: {}, signal: new AbortController().signal }, relogio);
}

async function entrar(email: string, senha: string): Promise<void> {
  const resposta = await pedir('POST', rotasApi.autenticacao.sessao, { email, senha });
  expect(resposta.status).toBe(200);
}

async function ocultas(): Promise<TelasOcultasDTO> {
  const resposta = await pedir('GET', rotasApi.conta.telasOcultas);
  expect(resposta.status).toBe(200);
  return resposta.corpo as TelasOcultasDTO;
}

beforeEach(() => {
  armazenamento.clear();
  biscoitos.clear();
  restaurarContasSimuladas();
  restaurarAuditoriaSimulada();
  reiniciarConvitesSimulados();
});

describe('telas ocultas no simulador', () => {
  it('exige um acesso autenticado', async () => {
    expect((await pedir('GET', rotasApi.conta.telasOcultas)).status).toBe(401);
    expect((await pedir('PUT', rotasApi.conta.telasOcultas, { telas: [] })).status).toBe(401);
  });

  it('começa sem telas ocultas e grava a lista sem repetições, na ordem do menu', async () => {
    await entrar(CREDENCIAIS_DEMONSTRACAO.email, CREDENCIAIS_DEMONSTRACAO.senha);
    expect(await ocultas()).toEqual({ telas: [] });

    const resposta = await pedir('PUT', rotasApi.conta.telasOcultas, {
      telas: ['ADMINISTRACAO_AUDITORIA', 'CONSULTAS_PLANOS', 'CONSULTAS_PLANOS'],
    });
    expect(resposta.status).toBe(200);
    expect(resposta.corpo).toEqual({ telas: ['CONSULTAS_PLANOS', 'ADMINISTRACAO_AUDITORIA'] });
    expect(await ocultas()).toEqual({ telas: ['CONSULTAS_PLANOS', 'ADMINISTRACAO_AUDITORIA'] });
  });

  it('recusa uma tela que não pode sair do menu sem mudar nada', async () => {
    await entrar(CREDENCIAIS_DEMONSTRACAO.email, CREDENCIAIS_DEMONSTRACAO.senha);
    await pedir('PUT', rotasApi.conta.telasOcultas, { telas: ['BACKUP_RESUMO'] });

    for (const corpo of [{ telas: ['DASHBOARD'] }, { telas: 'BACKUP_RESUMO' }, {}]) {
      expect((await pedir('PUT', rotasApi.conta.telasOcultas, corpo)).status).toBe(400);
    }
    expect(await ocultas()).toEqual({ telas: ['BACKUP_RESUMO'] });
  });

  it('registra na auditoria o que saiu e o que voltou, e nada quando a lista não muda', async () => {
    await entrar(CREDENCIAIS_DEMONSTRACAO.email, CREDENCIAIS_DEMONSTRACAO.senha);
    await pedir('PUT', rotasApi.conta.telasOcultas, { telas: ['RELATORIOS_RESUMO'] });
    await pedir('PUT', rotasApi.conta.telasOcultas, { telas: ['OBJETOS_FUNCOES'] });
    await pedir('PUT', rotasApi.conta.telasOcultas, { telas: ['OBJETOS_FUNCOES'] });

    const resposta = await pedir('GET', rotasApi.auditoria.eventos, undefined, { modulo: 'CONFIGURACOES' });
    const eventos = (resposta.corpo as PaginaAuditoriaDTO).itens.filter((evento) => evento.tipo === 'TELAS_ALTERADAS');
    expect(eventos).toHaveLength(2);
    expect(eventos[0]?.categoria).toBe('ATUALIZACAO');
    expect(eventos[0]?.mudancas).toEqual([
      { campo: 'Objetos do banco › Funções', antes: 'No menu', depois: 'Oculta' },
      { campo: 'Relatórios › Resumo', antes: 'Oculta', depois: 'No menu' },
    ]);
  });

  it('guarda uma lista por conta e a apaga junto com a conta', async () => {
    await entrar(CREDENCIAIS_DEMONSTRACAO.email, CREDENCIAIS_DEMONSTRACAO.senha);
    const criada = await pedir('POST', rotasApi.administracao.contas, {
      nome: 'Ana Souza',
      email: 'ana@empresa.com',
      perfil: 'LEITOR',
      permissoes: permissoesDoPerfil('LEITOR'),
      ativa: true,
    });
    const ana = criada.corpo as ContaDTO;
    await pedir('PUT', rotasApi.conta.telasOcultas, { telas: ['BACKUP_HISTORICO'] });
    await pedir('DELETE', rotasApi.autenticacao.sessao);

    const convite = lerConviteSimulado(ana.id);
    await pedir('POST', rotasApi.autenticacao.convite, { token: convite?.token, senha: 'uma frase longa de teste' });
    await entrar('ana@empresa.com', 'uma frase longa de teste');
    expect(await ocultas()).toEqual({ telas: [] });
    await pedir('PUT', rotasApi.conta.telasOcultas, { telas: ['CONSULTAS_TODAS'] });
    await pedir('DELETE', rotasApi.autenticacao.sessao);

    await entrar(CREDENCIAIS_DEMONSTRACAO.email, CREDENCIAIS_DEMONSTRACAO.senha);
    expect(await ocultas()).toEqual({ telas: ['BACKUP_HISTORICO'] });
    expect(lerTelasOcultasSimuladas(ana.id)).toEqual(['CONSULTAS_TODAS']);
    expect((await pedir('DELETE', rotasApi.administracao.conta(ana.id))).status).toBe(204);
    expect(lerTelasOcultasSimuladas(ana.id)).toEqual([]);
  });
});
