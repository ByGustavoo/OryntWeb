import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rotasApi } from '@/api/rotasApi';
import type { MetodoHttp, RespostaTransporte } from '@/api/transporte';
import type { ContaDTO, ListaContasDTO, PaginaAuditoriaDTO } from '@/modelos/administracao';
import type { UsuarioDTO } from '@/modelos/autenticacao';
import { permissoesDoPerfil } from '@/regras/permissoesConta';
import { restaurarAuditoriaSimulada } from './auditoriaSimulada';
import { restaurarContasSimuladas } from './contasSimuladas';
import { lerConviteSimulado, reiniciarConvitesSimulados } from './convitesSimulados';
import { CREDENCIAIS_DEMONSTRACAO, ID_CONTA_DEMONSTRACAO } from './credenciaisDemonstracao';
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

let relogio = new Date('2026-10-20T12:00:00.000Z');

afterAll(() => vi.unstubAllGlobals());

const SENHA_NOVA = 'uma frase longa de teste';

function avancar(minutos: number): void {
  relogio = new Date(relogio.getTime() + minutos * 60_000);
}

function pedir(metodo: MetodoHttp, caminho: string, corpo?: unknown, consulta: Record<string, string> = {}): Promise<RespostaTransporte> {
  avancar(1);
  return atenderNoSimulador({ metodo, caminho, consulta, corpo, cabecalhos: {}, signal: new AbortController().signal }, relogio);
}

async function entrar(email: string, senha: string): Promise<RespostaTransporte> {
  return pedir('POST', rotasApi.autenticacao.sessao, { email, senha });
}

async function entrarComoDemonstracao(): Promise<void> {
  const resposta = await entrar(CREDENCIAIS_DEMONSTRACAO.email, CREDENCIAIS_DEMONSTRACAO.senha);
  expect(resposta.status).toBe(200);
}

async function contas(): Promise<ContaDTO[]> {
  const resposta = await pedir('GET', rotasApi.administracao.contas);
  expect(resposta.status).toBe(200);
  return (resposta.corpo as ListaContasDTO).contas;
}

async function criarLeitora(): Promise<ContaDTO> {
  const resposta = await pedir('POST', rotasApi.administracao.contas, {
    nome: 'Ana Souza',
    email: 'ana@empresa.com',
    perfil: 'LEITOR',
    permissoes: permissoesDoPerfil('LEITOR'),
    ativa: true,
  });
  expect(resposta.status).toBe(201);
  return resposta.corpo as ContaDTO;
}

async function aceitarConvite(conta: ContaDTO): Promise<void> {
  const convite = lerConviteSimulado(conta.id);
  expect(convite).not.toBeNull();
  const resposta = await pedir('POST', rotasApi.autenticacao.convite, { token: convite?.token, senha: SENHA_NOVA });
  expect(resposta.status).toBe(204);
}

async function auditoria(consulta: Record<string, string> = {}): Promise<PaginaAuditoriaDTO> {
  const resposta = await pedir('GET', rotasApi.auditoria.eventos, undefined, consulta);
  expect(resposta.status).toBe(200);
  return resposta.corpo as PaginaAuditoriaDTO;
}

async function sair(): Promise<void> {
  await pedir('DELETE', rotasApi.autenticacao.sessao);
}

beforeEach(() => {
  armazenamento.clear();
  biscoitos.clear();
  restaurarContasSimuladas();
  restaurarAuditoriaSimulada();
  reiniciarConvitesSimulados();
  relogio = new Date('2026-10-20T12:00:00.000Z');
});

describe('contas do Orynt no simulador', () => {
  it('começa só com a conta de demonstração, administradora', async () => {
    await entrarComoDemonstracao();
    const lista = await contas();
    expect(lista.map((conta) => conta.id)).toEqual([ID_CONTA_DEMONSTRACAO]);
    expect(lista[0]?.permissoes).toEqual(permissoesDoPerfil('ADMINISTRADOR'));
  });

  it('cria a conta com convite, que vira senha só com hash e entra com as permissões do perfil', async () => {
    await entrarComoDemonstracao();
    const criada = await criarLeitora();
    expect(criada.convite).not.toBeNull();
    expect((await contas()).map((conta) => conta.email)).toContain('ana@empresa.com');

    await aceitarConvite(criada);
    expect([...armazenamento.values()].some((valor) => valor.includes(SENHA_NOVA))).toBe(false);
    expect(lerConviteSimulado(criada.id)).toBeNull();

    await sair();
    const login = await entrar('ana@empresa.com', SENHA_NOVA);
    expect(login.status).toBe(200);
    expect((login.corpo as UsuarioDTO).permissoes).toEqual(permissoesDoPerfil('LEITOR'));
  });

  it('recusa e-mail repetido e dados inválidos', async () => {
    await entrarComoDemonstracao();
    await criarLeitora();
    const repetido = await pedir('POST', rotasApi.administracao.contas, {
      nome: 'Outra Ana',
      email: 'ANA@empresa.com',
      perfil: 'LEITOR',
      permissoes: [],
      ativa: true,
    });
    expect(repetido.status).toBe(409);
    const invalido = await pedir('POST', rotasApi.administracao.contas, { nome: '', email: 'x', perfil: 'DONO', permissoes: ['X'], ativa: 1 });
    expect(invalido.status).toBe(400);
  });

  it('a chamada direta sem permissão recebe 403 e fica na auditoria', async () => {
    await entrarComoDemonstracao();
    const ana = await criarLeitora();
    await aceitarConvite(ana);
    await sair();
    await entrar('ana@empresa.com', SENHA_NOVA);

    expect((await pedir('GET', rotasApi.administracao.contas)).status).toBe(403);
    expect((await pedir('GET', rotasApi.consultas.lista)).status).toBe(403);
    expect((await pedir('PUT', rotasApi.administracao.permissoes(ana.id), { perfil: 'ADMINISTRADOR', permissoes: permissoesDoPerfil('ADMINISTRADOR') })).status).toBe(403);
    expect((await pedir('POST', rotasApi.auditoria.acessos, { tela: '/administracao/usuarios' })).status).toBe(403);
    expect((await pedir('POST', rotasApi.auditoria.acessos, { tela: '/relatorios/resumo' })).status).toBe(204);

    await sair();
    await entrarComoDemonstracao();
    const negados = await auditoria({ conta: ana.id, resultado: 'NEGADO' });
    expect(negados.totalItens).toBe(4);
    expect(negados.itens.every((evento) => evento.tipo === 'ACESSO_NEGADO' && evento.conta?.id === ana.id)).toBe(true);
    expect(negados.resumoDaConta?.negados).toBe(4);
  });

  it('concede e revoga, e a mudança vale na próxima requisição da própria conta', async () => {
    await entrarComoDemonstracao();
    const ana = await criarLeitora();
    await aceitarConvite(ana);

    const concedida = await pedir('PUT', rotasApi.administracao.permissoes(ana.id), {
      perfil: 'LEITOR',
      permissoes: [...permissoesDoPerfil('LEITOR'), 'CONSULTAS_VER'],
    });
    expect(concedida.status).toBe(200);
    expect((await contas()).find((conta) => conta.id === ana.id)?.permissoes).toContain('CONSULTAS_VER');

    await sair();
    await entrar('ana@empresa.com', SENHA_NOVA);
    expect((await pedir('GET', rotasApi.consultas.lista)).status).not.toBe(403);
    await sair();

    await entrarComoDemonstracao();
    await pedir('PUT', rotasApi.administracao.permissoes(ana.id), { perfil: 'LEITOR', permissoes: permissoesDoPerfil('LEITOR') });
    const eventos = await auditoria({ categoria: 'PERMISSOES' });
    expect(eventos.itens.map((evento) => [evento.concedidas, evento.revogadas])).toEqual([
      [[], ['CONSULTAS_VER']],
      [['CONSULTAS_VER'], []],
    ]);
  });

  it('desativar encerra a sessão e impede o login; excluir apaga as conexões e mantém a auditoria', async () => {
    await entrarComoDemonstracao();
    const ana = await criarLeitora();
    await aceitarConvite(ana);
    await sair();
    await entrar('ana@empresa.com', SENHA_NOVA);
    const sessaoDaAna = biscoitos.get('orynt_acesso_simulado');
    await sair();

    await entrarComoDemonstracao();
    const sessaoDaDemonstracao = biscoitos.get('orynt_acesso_simulado');
    expect((await pedir('PATCH', rotasApi.administracao.conta(ana.id), { ativa: false })).status).toBe(200);

    biscoitos.set('orynt_acesso_simulado', sessaoDaAna ?? '');
    expect((await pedir('GET', rotasApi.autenticacao.sessao)).status).toBe(401);
    expect((await entrar('ana@empresa.com', SENHA_NOVA)).status).toBe(403);

    biscoitos.set('orynt_acesso_simulado', sessaoDaDemonstracao ?? '');
    expect((await pedir('DELETE', rotasApi.administracao.conta(ana.id))).status).toBe(204);
    expect((await contas()).some((conta) => conta.id === ana.id)).toBe(false);
    const daAna = await auditoria({ conta: ana.id });
    expect(daAna.itens.some((evento) => evento.tipo === 'LOGIN' && evento.conta?.email === 'ana@empresa.com')).toBe(true);
    expect(daAna.itens[0]?.tipo).toBe('CONTA_EXCLUIDA');
  });

  it('protege a própria conta, a conta inicial e o último administrador', async () => {
    await entrarComoDemonstracao();
    expect((await pedir('DELETE', rotasApi.administracao.conta(ID_CONTA_DEMONSTRACAO))).status).toBe(409);
    expect((await pedir('PATCH', rotasApi.administracao.conta(ID_CONTA_DEMONSTRACAO), { ativa: false })).status).toBe(409);
    expect(
      (await pedir('PUT', rotasApi.administracao.permissoes(ID_CONTA_DEMONSTRACAO), { perfil: 'ANALISTA', permissoes: permissoesDoPerfil('ANALISTA') }))
        .status,
    ).toBe(409);
    expect((await contas())[0]?.permissoes).toContain('ADMIN_USUARIOS');
  });

  it('um administrador limitado não concede o que não tem', async () => {
    await entrarComoDemonstracao();
    const criada = await pedir('POST', rotasApi.administracao.contas, {
      nome: 'Bia Reis',
      email: 'bia@empresa.com',
      perfil: 'LEITOR',
      permissoes: ['ADMIN_USUARIOS', 'DASHBOARD_VER'],
      ativa: true,
    });
    const bia = criada.corpo as ContaDTO;
    await aceitarConvite(bia);
    const ana = await criarLeitora();
    await sair();
    await entrar('bia@empresa.com', SENHA_NOVA);

    const elevacao = await pedir('PUT', rotasApi.administracao.permissoes(ana.id), {
      perfil: 'LEITOR',
      permissoes: [...permissoesDoPerfil('LEITOR'), 'ADMIN_AUDITORIA'],
    });
    expect(elevacao.status).toBe(403);
    const propria = await pedir('PUT', rotasApi.administracao.permissoes(bia.id), {
      perfil: 'ADMINISTRADOR',
      permissoes: permissoesDoPerfil('ADMINISTRADOR'),
    });
    expect(propria.status).toBe(403);
  });

  it('bloqueia o login depois de cinco senhas erradas e registra sem guardar a senha digitada', async () => {
    for (let tentativa = 0; tentativa < 4; tentativa += 1) {
      expect((await entrar(CREDENCIAIS_DEMONSTRACAO.email, `errada-${tentativa}`)).status).toBe(401);
    }
    expect((await entrar(CREDENCIAIS_DEMONSTRACAO.email, 'errada-4')).status).toBe(429);
    expect((await entrar(CREDENCIAIS_DEMONSTRACAO.email, CREDENCIAIS_DEMONSTRACAO.senha)).status).toBe(429);
    expect([...armazenamento.values()].some((valor) => valor.includes('errada-'))).toBe(false);

    avancar(16);
    await entrarComoDemonstracao();
    const tentativas = await auditoria({ categoria: 'AUTENTICACAO', resultado: 'FALHA' });
    expect(tentativas.itens.some((evento) => evento.tipo === 'LOGIN_BLOQUEADO')).toBe(true);
    expect(tentativas.itens.filter((evento) => evento.tipo === 'LOGIN_FALHOU')).toHaveLength(6);
  });

  it('registra login, acesso a tela e logout, e não aceita tela inventada', async () => {
    await entrarComoDemonstracao();
    expect((await pedir('POST', rotasApi.auditoria.acessos, { tela: '/administracao/auditoria' })).status).toBe(204);
    expect((await pedir('POST', rotasApi.auditoria.acessos, { tela: '/nao-existe' })).status).toBe(400);
    await sair();
    await entrarComoDemonstracao();
    const eventos = await auditoria();
    expect(eventos.itens.map((evento) => evento.tipo)).toEqual(['LOGIN', 'LOGOUT', 'TELA_ACESSADA', 'LOGIN']);
    expect(eventos.itens[2]?.alvo?.rotulo).toBe('Administração › Auditoria');
  });

  it('sem sessão, as rotas protegidas respondem 401', async () => {
    expect((await pedir('GET', rotasApi.administracao.contas)).status).toBe(401);
    expect((await pedir('GET', rotasApi.auditoria.eventos)).status).toBe(401);
  });
});
