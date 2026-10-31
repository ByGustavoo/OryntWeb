import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rotasApi } from '@/api/rotasApi';
import type { MetodoHttp, RespostaTransporte } from '@/api/transporte';
import type {
  AgendamentoBackupDTO,
  ArquivoDoBackupDTO,
  DadosAgendamentoDTO,
  ExecucaoBackupDTO,
  ImpactoNaConexaoDTO,
  ListaAgendamentosDTO,
  ListaAlertasBackupDTO,
  ObjetosDoBancoDTO,
  PaginaExecucoesDTO,
  ResumoBackupDTO,
} from '@/modelos/backup';
import type { ConexaoSalvaDTO } from '@/modelos/conexao';
import { permissoesDoPerfil } from '@/regras/permissoesConta';
import { restaurarAuditoriaSimulada } from './auditoriaSimulada';
import { definirFalhaDosBackups, esquecerExecucoesDaAba, interromperExecucoesDaAba, restaurarBackupSimulado } from './backup';
import { restaurarContasSimuladas } from './contasSimuladas';
import { CREDENCIAIS_DEMONSTRACAO, ID_CONTA_DEMONSTRACAO } from './credenciaisDemonstracao';
import { atenderNoSimulador } from './transporteSimulado';
import { gravarConexoesSalvasSimuladas, lerConexoesSalvasSimuladas } from './conexoesSalvasSimuladas';

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

afterAll(() => vi.unstubAllGlobals());

let relogio = new Date(2026, 9, 29, 10, 0);

function avancar(minutos: number): void {
  relogio = new Date(relogio.getTime() + minutos * 60_000);
}

function pedir(metodo: MetodoHttp, caminho: string, corpo?: unknown, consulta: Record<string, string> = {}): Promise<RespostaTransporte> {
  return atenderNoSimulador({ metodo, caminho, consulta, corpo, cabecalhos: {}, signal: new AbortController().signal }, relogio);
}

async function pedirOk<T>(metodo: MetodoHttp, caminho: string, corpo?: unknown, consulta?: Record<string, string>): Promise<T> {
  const resposta = await pedir(metodo, caminho, corpo, consulta);
  expect(resposta.status).toBeLessThan(300);
  return resposta.corpo as T;
}

const salvas: ConexaoSalvaDTO[] = [
  { id: 'c1', tipoBanco: 'POSTGRESQL', nome: 'Loja local', host: 'localhost', porta: 5432, banco: 'loja', usuario: 'postgres', ultimoUsoEm: '2026-10-29T09:00:00.000Z' },
  { id: 'c2', tipoBanco: 'POSTGRESQL', nome: 'Homologação', host: 'hml', porta: 5432, banco: 'loja_hml', usuario: 'app', ultimoUsoEm: '2026-10-20T09:00:00.000Z' },
];

const agendamentoDiario: DadosAgendamentoDTO = {
  nome: 'Novo diário',
  conexaoId: 'c1',
  tipo: 'COMPLETO',
  selecao: { modo: 'BANCO_INTEIRO' },
  frequencia: { tipo: 'DIARIA', horario: '02:00' },
  ativo: true,
};

beforeEach(async () => {
  armazenamento.clear();
  biscoitos.clear();
  restaurarContasSimuladas();
  restaurarAuditoriaSimulada();
  restaurarBackupSimulado();
  relogio = new Date(2026, 9, 29, 10, 0);
  const entrada = await pedir('POST', rotasApi.autenticacao.sessao, { email: CREDENCIAIS_DEMONSTRACAO.email, senha: CREDENCIAIS_DEMONSTRACAO.senha });
  expect(entrada.status).toBe(200);
  gravarConexoesSalvasSimuladas(ID_CONTA_DEMONSTRACAO, salvas);
});

async function agendamentos(): Promise<AgendamentoBackupDTO[]> {
  return (await pedirOk<ListaAgendamentosDTO>('GET', rotasApi.backup.agendamentos)).agendamentos;
}

describe('dados iniciais', () => {
  it('conta uma só história entre o resumo e o histórico', async () => {
    const resumo = await pedirOk<ResumoBackupDTO>('GET', rotasApi.backup.resumo);
    const primeira = await pedirOk<PaginaExecucoesDTO>('GET', rotasApi.backup.execucoes);
    expect(resumo.totalExecucoes).toBe(primeira.totalRegistradas);
    expect(resumo.totalExecucoes).toBeGreaterThan(30);
    expect(resumo.concluidas + resumo.falhas).toBe(resumo.totalExecucoes);
    expect(resumo.ultimaExecucao?.id).toBe(primeira.itens[0]?.id);
  });

  it('não cria nada enquanto não há conexão', async () => {
    gravarConexoesSalvasSimuladas(ID_CONTA_DEMONSTRACAO, []);
    const resumo = await pedirOk<ResumoBackupDTO>('GET', rotasApi.backup.resumo);
    expect(resumo.totalExecucoes).toBe(0);
    expect(await agendamentos()).toEqual([]);
  });

  it('mostra um agendamento em cada situação da demonstração', async () => {
    const situacoes = (await agendamentos()).map((agendamento) => agendamento.situacao);
    expect(situacoes).toContain('ATIVO');
    expect(situacoes).toContain('ATRASADO');
    expect(situacoes).toContain('INATIVO');
  });

  it('avisa a falha e o atraso que pedem atenção', async () => {
    const { alertas } = await pedirOk<ListaAlertasBackupDTO>('GET', rotasApi.backup.alertas);
    expect(alertas.map((alerta) => alerta.tipo)).toEqual(expect.arrayContaining(['ULTIMO_BACKUP_FALHOU', 'AGENDAMENTO_ATRASADO']));
    expect(alertas[0]?.tipo).toBe('ULTIMO_BACKUP_FALHOU');
  });

  it('não guarda os arquivos: o histórico só tem o registro', async () => {
    const { itens } = await pedirOk<PaginaExecucoesDTO>('GET', rotasApi.backup.execucoes, undefined, { situacao: 'CONCLUIDO' });
    expect(itens[0]?.arquivo).toMatch(/^backup_.*-demonstracao\.dump$/);
    const resposta = await pedir('GET', rotasApi.backup.arquivoDaExecucao(itens[0]?.id ?? ''));
    expect(resposta.status).toBe(410);
  });

  it('usa objetos que existem no banco simulado', async () => {
    const { objetos } = await pedirOk<ObjetosDoBancoDTO>('GET', rotasApi.backup.objetos('c1'));
    const ids = new Set(objetos.map((objeto) => objeto.id));
    for (const agendamento of await agendamentos()) {
      if (agendamento.selecao.modo === 'ESCOLHIDOS') for (const id of agendamento.selecao.objetos) expect(ids).toContain(id);
    }
    expect(new Set(objetos.map((objeto) => objeto.tipo)).size).toBeGreaterThanOrEqual(5);
  });
});

describe('executar agora', () => {
  it('passa de em andamento para concluído, entra no histórico e entrega um arquivo marcado', async () => {
    const execucao = await pedirOk<ExecucaoBackupDTO>('POST', rotasApi.backup.execucoes, {
      nome: 'Antes da migração',
      conexaoId: 'c2',
      tipo: 'COMPLETO',
      selecao: { modo: 'BANCO_INTEIRO' },
    });
    expect(execucao.situacao).toBe('EM_ANDAMENTO');
    expect(execucao.tamanhoBytes).toBeNull();
    expect(execucao.etapa).toBe('CONECTANDO');
    expect((await pedir('GET', rotasApi.backup.arquivoDaExecucao(execucao.id))).status).toBe(410);

    avancar(1);
    const terminada = await pedirOk<ExecucaoBackupDTO>('GET', rotasApi.backup.execucao(execucao.id));
    expect(terminada.situacao).toBe('CONCLUIDO');
    expect(terminada.progresso).toBe(100);
    expect(terminada.objetosProcessados).toBe(terminada.objetosIncluidos);
    expect(terminada.tamanhoBytes).toBeGreaterThan(0);
    expect(terminada.arquivo).toMatch(/^backup_loja_hml_.*_completo-demonstracao\.dump$/);

    const arquivo = await pedirOk<ArquivoDoBackupDTO>('GET', rotasApi.backup.arquivoDaExecucao(execucao.id));
    expect(arquivo.nome).toBe(terminada.arquivo);
    expect(arquivo.conteudo).toContain('não serve para restaurar');
  });

  it('informa etapa e objetos reais, e não inventa percentual quando não dá para medir', async () => {
    const estrutura = await pedirOk<ExecucaoBackupDTO>('POST', rotasApi.backup.execucoes, { conexaoId: 'c1', tipo: 'ESTRUTURA', selecao: { modo: 'BANCO_INTEIRO' } });
    expect(estrutura.progresso).toBeNull();
    const dados = await pedirOk<ExecucaoBackupDTO>('POST', rotasApi.backup.execucoes, { conexaoId: 'c1', tipo: 'DADOS', selecao: { modo: 'BANCO_INTEIRO' } });
    relogio = new Date(relogio.getTime() + 12_000);
    const noMeio = await pedirOk<ExecucaoBackupDTO>('GET', rotasApi.backup.execucao(dados.id));
    expect(noMeio.etapa).toBe('EXPORTANDO');
    expect(noMeio.progresso).toBe(50);
    expect(noMeio.objetosProcessados).toBeGreaterThan(0);
    expect(noMeio.objetosProcessados).toBeLessThan(noMeio.objetosIncluidos);
    expect(noMeio.objetoAtual).not.toBeNull();
    expect(noMeio.bytesTransferidos).toBeGreaterThan(0);
  });

  it('falha no meio com o motivo, sem arquivo', async () => {
    definirFalhaDosBackups(true);
    const execucao = await pedirOk<ExecucaoBackupDTO>('POST', rotasApi.backup.execucoes, { conexaoId: 'c1', tipo: 'COMPLETO', selecao: { modo: 'BANCO_INTEIRO' } });
    definirFalhaDosBackups(false);
    avancar(1);
    const falha = await pedirOk<ExecucaoBackupDTO>('GET', rotasApi.backup.execucao(execucao.id));
    expect(falha.situacao).toBe('FALHOU');
    expect(falha.arquivo).toBeNull();
    expect(falha.motivoDaFalha).toBeTruthy();
    expect(falha.objetosProcessados).toBeLessThan(falha.objetosIncluidos);
    expect((await pedir('GET', rotasApi.backup.arquivoDaExecucao(execucao.id))).status).toBe(410);
  });

  it('cancela só o que está rodando e não deixa arquivo', async () => {
    const execucao = await pedirOk<ExecucaoBackupDTO>('POST', rotasApi.backup.execucoes, { conexaoId: 'c1', tipo: 'COMPLETO', selecao: { modo: 'BANCO_INTEIRO' } });
    relogio = new Date(relogio.getTime() + 5000);
    const cancelada = await pedirOk<ExecucaoBackupDTO>('POST', rotasApi.backup.cancelamentoDaExecucao(execucao.id));
    expect(cancelada.situacao).toBe('CANCELADO');
    expect(cancelada.arquivo).toBeNull();
    expect(cancelada.duracaoMs).toBe(5000);
    avancar(1);
    const depois = await pedirOk<ExecucaoBackupDTO>('POST', rotasApi.backup.cancelamentoDaExecucao(execucao.id));
    expect(depois.situacao).toBe('CANCELADO');
  });

  it('interrompe na hora ao descarregar a página, mesmo a segundos do fim, e não entrega arquivo', async () => {
    const execucao = await pedirOk<ExecucaoBackupDTO>('POST', rotasApi.backup.execucoes, { conexaoId: 'c1', tipo: 'COMPLETO', selecao: { modo: 'BANCO_INTEIRO' } });
    relogio = new Date(relogio.getTime() + 22_000);
    interromperExecucoesDaAba(relogio);
    const interrompida = await pedirOk<ExecucaoBackupDTO>('GET', rotasApi.backup.execucao(execucao.id));
    expect(interrompida.situacao).toBe('FALHOU');
    expect(interrompida.interrompida).toBe(true);
    expect(interrompida.duracaoMs).toBe(22_000);
    avancar(1);
    expect((await pedirOk<ExecucaoBackupDTO>('GET', rotasApi.backup.execucao(execucao.id))).situacao).toBe('FALHOU');
    expect((await pedir('GET', rotasApi.backup.arquivoDaExecucao(execucao.id))).status).toBe(410);
  });

  it('interrompe o backup de uma aba que parou de dar sinal, sem descarregar', async () => {
    const execucao = await pedirOk<ExecucaoBackupDTO>('POST', rotasApi.backup.execucoes, { conexaoId: 'c1', tipo: 'COMPLETO', selecao: { modo: 'BANCO_INTEIRO' } });
    esquecerExecucoesDaAba();
    relogio = new Date(relogio.getTime() + 2000);
    expect((await pedirOk<ExecucaoBackupDTO>('GET', rotasApi.backup.execucao(execucao.id))).situacao).toBe('EM_ANDAMENTO');
    relogio = new Date(relogio.getTime() + 6000);
    const interrompida = await pedirOk<ExecucaoBackupDTO>('GET', rotasApi.backup.execucao(execucao.id));
    expect(interrompida.situacao).toBe('FALHOU');
    expect(interrompida.interrompida).toBe(true);
    expect(interrompida.arquivo).toBeNull();
    expect(interrompida.motivoDaFalha).toContain('recarregada');
  });

  it('não exclui o que está rodando', async () => {
    const execucao = await pedirOk<ExecucaoBackupDTO>('POST', rotasApi.backup.execucoes, { conexaoId: 'c1', tipo: 'ESTRUTURA', selecao: { modo: 'BANCO_INTEIRO' } });
    expect((await pedir('DELETE', rotasApi.backup.execucao(execucao.id))).status).toBe(409);
    avancar(1);
    expect((await pedir('DELETE', rotasApi.backup.execucao(execucao.id))).status).toBe(204);
    expect((await pedir('GET', rotasApi.backup.execucao(execucao.id))).status).toBe(404);
  });

  it('recusa objetos que o tipo não aceita', async () => {
    const semDados = await pedir('POST', rotasApi.backup.execucoes, { conexaoId: 'c1', tipo: 'DADOS', selecao: { modo: 'ESCOLHIDOS', objetos: ['public.produtos_ativos'] } });
    expect(semDados.status).toBe(400);
  });
});

describe('agendamentos', () => {
  it('nunca roda sozinho: lembra na hora, atrasa depois da folga e limpa ao fazer o backup', async () => {
    const criado = await pedirOk<AgendamentoBackupDTO>('POST', rotasApi.backup.agendamentos, { ...agendamentoDiario, frequencia: { tipo: 'DIARIA', horario: '11:00' } });
    const total = (await pedirOk<ResumoBackupDTO>('GET', rotasApi.backup.resumo)).totalExecucoes;
    expect(criado.situacao).toBe('ATIVO');
    expect(criado.ultimaExecucao).toBeNull();
    expect(criado.lembreteEm).toBeNull();
    expect(new Date(criado.proximaExecucaoEm ?? '').getHours()).toBe(11);

    relogio = new Date(2026, 9, 29, 11, 10);
    const naHora = (await agendamentos()).find((item) => item.id === criado.id);
    expect(naHora?.lembreteEm).toBe(new Date(2026, 9, 29, 11, 0).toISOString());
    expect(naHora?.situacao).toBe('ATIVO');

    relogio = new Date(2026, 9, 29, 12, 30);
    const atrasado = (await agendamentos()).find((item) => item.id === criado.id);
    expect(atrasado?.lembreteEm).toBeNull();
    expect(atrasado?.situacao).toBe('ATRASADO');
    expect((await pedirOk<ResumoBackupDTO>('GET', rotasApi.backup.resumo)).totalExecucoes).toBe(total);

    const feito = await pedirOk<ExecucaoBackupDTO>('POST', rotasApi.backup.execucaoDoAgendamento(criado.id));
    expect(feito.origem).toBe('AGENDADA');
    expect(feito.agendamentoId).toBe(criado.id);
    const depois = (await agendamentos()).find((item) => item.id === criado.id);
    expect(depois?.situacao).toBe('ATIVO');
    expect(depois?.ultimaExecucao?.id).toBe(feito.id);
  });

  it('não faz agora o agendamento sem conexão', async () => {
    const criado = await pedirOk<AgendamentoBackupDTO>('POST', rotasApi.backup.agendamentos, agendamentoDiario);
    await pedirOk('DELETE', rotasApi.conexoes.salva('c1'));
    expect((await pedir('POST', rotasApi.backup.execucaoDoAgendamento(criado.id))).status).toBe(409);
  });

  it('ativa, desativa e não reativa sem conexão', async () => {
    const criado = await pedirOk<AgendamentoBackupDTO>('POST', rotasApi.backup.agendamentos, agendamentoDiario);
    const desligado = await pedirOk<AgendamentoBackupDTO>('PATCH', rotasApi.backup.agendamento(criado.id), { ativo: false });
    expect(desligado.situacao).toBe('INATIVO');
    expect(desligado.proximaExecucaoEm).toBeNull();

    await pedirOk('DELETE', rotasApi.conexoes.salva('c1'));
    const semConexao = (await agendamentos()).find((item) => item.id === criado.id);
    expect(semConexao?.situacao).toBe('SEM_CONEXAO');
    expect((await pedir('PATCH', rotasApi.backup.agendamento(criado.id), { ativo: true })).status).toBe(409);
  });

  it('valida a frequência antes de salvar', async () => {
    const invalido = { ...agendamentoDiario, frequencia: { tipo: 'MENSAL', diaDoMes: 40, horario: '02:00' } };
    expect((await pedir('POST', rotasApi.backup.agendamentos, invalido)).status).toBe(400);
    expect((await pedir('POST', rotasApi.backup.agendamentos, { ...agendamentoDiario, nome: ' ' })).status).toBe(400);
  });

  it('edita e recomeça a contagem, tirando o atraso', async () => {
    const atrasado = (await agendamentos()).find((item) => item.situacao === 'ATRASADO');
    expect(atrasado).toBeDefined();
    const editado = await pedirOk<AgendamentoBackupDTO>('PUT', rotasApi.backup.agendamento(atrasado?.id ?? ''), { ...agendamentoDiario, nome: 'Corrigido' });
    expect(editado.situacao).toBe('ATIVO');
    expect(editado.nome).toBe('Corrigido');
  });
});

describe('conexões', () => {
  it('ao excluir, desativa os agendamentos e mantém o histórico', async () => {
    const antes = await pedirOk<ResumoBackupDTO>('GET', rotasApi.backup.resumo);
    const impacto = (await pedirOk<ImpactoNaConexaoDTO[]>('GET', rotasApi.backup.conexoes)).find((item) => item.conexaoId === 'c1');
    expect(impacto?.agendamentos).toBeGreaterThan(0);

    await pedirOk('DELETE', rotasApi.conexoes.salva('c1'));
    const depois = await pedirOk<ResumoBackupDTO>('GET', rotasApi.backup.resumo);
    expect(depois.totalExecucoes).toBe(antes.totalExecucoes);
    const orfaos = (await agendamentos()).filter((item) => item.conexaoId === null);
    expect(orfaos).toHaveLength(impacto?.agendamentos ?? 0);
    expect(orfaos.every((item) => !item.ativo)).toBe(true);
  });

  it('salva sem abrir sessão nem marcar uso, e sem guardar a senha', async () => {
    const salva = await pedirOk<ConexaoSalvaDTO>('POST', rotasApi.conexoes.salvas, {
      nome: 'Nova',
      host: 'db.empresa.com',
      porta: 5432,
      banco: 'erp',
      usuario: 'backup',
      senha: 'segredo-de-teste',
    });
    expect(salva.ultimoUsoEm).toBeNull();
    expect((await pedir('GET', rotasApi.conexoes.atual)).status).toBe(401);
    expect(JSON.stringify([...armazenamento.values()])).not.toContain('segredo-de-teste');
  });

  it('edita mantendo a senha quando ela vem vazia e leva o nome aos agendamentos', async () => {
    await agendamentos();
    const editada = await pedirOk<ConexaoSalvaDTO>('PUT', rotasApi.conexoes.salva('c1'), { nome: 'Loja nova', host: 'novo', porta: 5433, banco: 'loja2', usuario: 'postgres', senha: null });
    expect(editada).toMatchObject({ nome: 'Loja nova', host: 'novo', porta: 5433 });
    expect(lerConexoesSalvasSimuladas(ID_CONTA_DEMONSTRACAO).find((item) => item.id === 'c1')?.banco).toBe('loja2');
    const dela = (await agendamentos()).filter((item) => item.conexaoId === 'c1');
    expect(dela.length).toBeGreaterThan(0);
    expect(dela.every((item) => item.conexaoNome === 'Loja nova' && item.banco === 'loja2')).toBe(true);
  });

  it('não deixa uma edição virar cópia de outra conexão', async () => {
    const resposta = await pedir('PUT', rotasApi.conexoes.salva('c1'), { nome: 'X', host: 'hml', porta: 5432, banco: 'loja_hml', usuario: 'app', senha: null });
    expect(resposta.status).toBe(400);
  });

  it('testa a conexão salva', async () => {
    expect((await pedir('POST', rotasApi.conexoes.testeDaSalva('c1'))).status).toBe(200);
    expect((await pedir('POST', rotasApi.conexoes.testeDaSalva('inexistente'))).status).toBe(404);
  });
});

describe('permissão', () => {
  it('só o administrador tem a permissão', () => {
    expect(permissoesDoPerfil('ADMINISTRADOR')).toContain('BACKUP_GERENCIAR');
    expect(permissoesDoPerfil('ANALISTA')).not.toContain('BACKUP_GERENCIAR');
    expect(permissoesDoPerfil('LEITOR')).not.toContain('BACKUP_GERENCIAR');
  });

  it('a conta inicial recebe a permissão mesmo com a lista antiga gravada', async () => {
    const chave = [...armazenamento.keys()].find((item) => item.endsWith('simulacao:contas')) ?? '';
    const contas = JSON.parse(armazenamento.get(chave) ?? '[]') as { permissoes: string[] }[];
    armazenamento.set(chave, JSON.stringify(contas.map((conta) => ({ ...conta, permissoes: conta.permissoes.filter((item) => item !== 'BACKUP_GERENCIAR') }))));
    expect((await pedir('GET', rotasApi.backup.resumo)).status).toBe(200);
  });
});
