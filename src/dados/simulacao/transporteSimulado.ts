import { rotasApi } from '@/api/rotasApi';
import type { MetodoHttp, RequisicaoTransporte, RespostaTransporte, Transporte } from '@/api/transporte';
import { ambiente } from '@/configuracoes/ambiente';
import type { CodigoPermissao } from '@/modelos/administracao';
import { permissoesDasOperacoes } from '@/regras/permissoesConta';
import {
  definirCenarioConexao,
  definirDadosVazios,
  definirFalhas,
  definirLatencia,
  definirRastreamentoDasFuncoes,
  deveFalhar,
  latenciaConfigurada,
} from './controles';
import { encerrarAcessoSimulado } from './acessoSimulado';
import { restaurarAuditoriaSimulada } from './auditoriaSimulada';
import type { ContextoSimulado, ExigenciaDaRota } from './autorizacaoSimulada';
import { autorizar } from './autorizacaoSimulada';
import { definirFalhaDosBackups, restaurarBackupSimulado } from './backup';
import { restaurarContasSimuladas } from './contasSimuladas';
import { reiniciarConvitesSimulados } from './convitesSimulados';
import {
  criarConta,
  desbloquearConta,
  editarConta,
  encerrarSessoes,
  excluirConta,
  listarContas,
  mudarPermissoes,
  reenviarConvite,
} from './manipuladores/administracao';
import { listarAuditoria } from './manipuladores/auditoria';
import {
  alternarAgendamentoBackup,
  buscarArquivoBackup,
  buscarExecucaoBackup,
  buscarResumoBackup,
  cancelarExecucaoBackup,
  criarAgendamentoBackup,
  editarAgendamentoBackup,
  excluirAgendamentoBackup,
  excluirExecucaoBackup,
  iniciarExecucaoBackup,
  iniciarExecucaoDoAgendamento,
  listarAgendamentosBackup,
  listarAlertasBackup,
  listarExecucoesBackup,
  listarImpactosBackup,
  listarObjetosBackup,
} from './manipuladores/backup';
import { buscarUsuarioAtual, entrar, esperaDoAcesso, registrarAcessoATela, sair, sairDoAcessoSimulado } from './manipuladores/autenticacao';
import {
  ativarConexao,
  buscarConexaoAtual,
  criarConexao,
  editarConexao,
  encerrarConexao,
  esperaDaTentativa,
  excluirConexao,
  listarConexoes,
  renomearConexao,
  salvarConexao,
  testarConexao,
  testarConexaoSalva,
} from './manipuladores/conexoes';
import { buscarHistoricoDaConsulta, buscarPlanoDaConsulta, listarConsultas } from './manipuladores/consultas';
import { aceitarConvite, verificarConvite } from './manipuladores/convite';
import { buscarAtividade, buscarConsultas, buscarIndicadores } from './manipuladores/dashboard';
import { listarFuncoes, listarIndices, listarTabelas, listarVisoes } from './manipuladores/objetos';
import { redefinirSenha, solicitarRecuperacao, verificarCodigoRecuperacao } from './manipuladores/recuperacaoSenha';
import { buscarResumoRelatorio } from './manipuladores/relatorios';
import { buscarVersao } from './manipuladores/sistema';
import { aplicarAlteracao, listarAlteracoes } from './manipuladores/alteracoes';
import { listarPapeis, listarPermissoes, listarSessoes } from './manipuladores/usuarios';
import { definirRecusaDeAlteracoes, restaurarPapeisSimulados } from './alteracoesSimuladas';
import { expirarCodigoSimulado, expirarRedefinicaoSimulada } from './recuperacaoSimulada';
import { rotaInexistente, servicoIndisponivel } from './resposta';
import { encerrarSessaoSimulada } from './sessaoSimulada';

type Manipulador = (
  requisicao: RequisicaoTransporte,
  agora: Date,
  parametros: Record<string, string>,
  contexto: ContextoSimulado,
) => RespostaTransporte | Promise<RespostaTransporte>;

interface Rota {
  metodo: MetodoHttp;
  caminho: string;
  manipulador: Manipulador;
  acesso: ExigenciaDaRota;
  descricao?: string;
  espera?: () => number;
}

interface RotaEncontrada {
  rota: Rota;
  parametros: Record<string, string>;
}

const MARCA_PARAMETRO = ':';
const ID = `${MARCA_PARAMETRO}id`;

const LATENCIA_MINIMA_MS = 200;
const LATENCIA_MAXIMA_MS = 500;

function esperaDaAlteracao(): number {
  return 600 + Math.random() * 500;
}

function esperaDaAdministracao(): number {
  return 450 + Math.random() * 350;
}

export function permissoesDaAlteracao(requisicao: RequisicaoTransporte): CodigoPermissao[] {
  const corpo = requisicao.corpo && typeof requisicao.corpo === 'object' ? (requisicao.corpo as Record<string, unknown>) : {};
  const operacoes: unknown[] = Array.isArray(corpo.operacoes) ? corpo.operacoes : [];
  return permissoesDasOperacoes(
    operacoes.map((operacao) => (operacao && typeof operacao === 'object' ? (operacao as Record<string, unknown>).tipo : undefined)),
  );
}

const rotas: Rota[] = [
  { metodo: 'POST', caminho: rotasApi.autenticacao.sessao, manipulador: entrar, acesso: 'PUBLICA', espera: esperaDoAcesso },
  { metodo: 'GET', caminho: rotasApi.autenticacao.sessao, manipulador: buscarUsuarioAtual, acesso: 'PUBLICA' },
  { metodo: 'DELETE', caminho: rotasApi.autenticacao.sessao, manipulador: sair, acesso: 'PUBLICA' },
  {
    metodo: 'POST',
    caminho: rotasApi.autenticacao.recuperacao,
    manipulador: solicitarRecuperacao,
    acesso: 'PUBLICA',
    espera: esperaDoAcesso,
  },
  {
    metodo: 'POST',
    caminho: rotasApi.autenticacao.verificacaoRecuperacao,
    manipulador: verificarCodigoRecuperacao,
    acesso: 'PUBLICA',
    espera: esperaDoAcesso,
  },
  { metodo: 'POST', caminho: rotasApi.autenticacao.novaSenha, manipulador: redefinirSenha, acesso: 'PUBLICA', espera: esperaDoAcesso },
  {
    metodo: 'POST',
    caminho: rotasApi.autenticacao.verificacaoConvite,
    manipulador: verificarConvite,
    acesso: 'PUBLICA',
    espera: esperaDoAcesso,
  },
  { metodo: 'POST', caminho: rotasApi.autenticacao.convite, manipulador: aceitarConvite, acesso: 'PUBLICA', espera: esperaDoAcesso },
  {
    metodo: 'POST',
    caminho: rotasApi.conexoes.teste,
    manipulador: testarConexao,
    acesso: ['CONEXOES_USAR'],
    descricao: 'testar uma conexão',
    espera: esperaDaTentativa,
  },
  {
    metodo: 'POST',
    caminho: rotasApi.conexoes.lista,
    manipulador: criarConexao,
    acesso: ['CONEXOES_USAR'],
    descricao: 'conectar a um banco novo',
    espera: esperaDaTentativa,
  },
  { metodo: 'GET', caminho: rotasApi.conexoes.lista, manipulador: listarConexoes, acesso: 'AUTENTICADA' },
  { metodo: 'GET', caminho: rotasApi.conexoes.atual, manipulador: buscarConexaoAtual, acesso: 'AUTENTICADA' },
  { metodo: 'DELETE', caminho: rotasApi.conexoes.atual, manipulador: encerrarConexao, acesso: 'AUTENTICADA' },
  {
    metodo: 'POST',
    caminho: rotasApi.conexoes.ativacao(ID),
    manipulador: ativarConexao,
    acesso: ['CONEXOES_USAR'],
    descricao: 'conectar a uma conexão salva',
    espera: esperaDaTentativa,
  },
  {
    metodo: 'PATCH',
    caminho: rotasApi.conexoes.salva(ID),
    manipulador: renomearConexao,
    acesso: ['CONEXOES_USAR'],
    descricao: 'renomear uma conexão salva',
  },
  {
    metodo: 'DELETE',
    caminho: rotasApi.conexoes.salva(ID),
    manipulador: excluirConexao,
    acesso: ['CONEXOES_USAR'],
    descricao: 'excluir uma conexão salva',
  },
  {
    metodo: 'POST',
    caminho: rotasApi.conexoes.salvas,
    manipulador: salvarConexao,
    acesso: ['CONEXOES_USAR'],
    descricao: 'salvar uma conexão sem conectar',
    espera: esperaDaTentativa,
  },
  {
    metodo: 'PUT',
    caminho: rotasApi.conexoes.salva(ID),
    manipulador: editarConexao,
    acesso: ['CONEXOES_USAR'],
    descricao: 'editar uma conexão salva',
    espera: esperaDaTentativa,
  },
  {
    metodo: 'POST',
    caminho: rotasApi.conexoes.testeDaSalva(ID),
    manipulador: testarConexaoSalva,
    acesso: ['CONEXOES_USAR'],
    descricao: 'testar uma conexão salva',
    espera: esperaDaTentativa,
  },
  { metodo: 'GET', caminho: rotasApi.backup.resumo, manipulador: buscarResumoBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'ler o resumo dos backups' },
  { metodo: 'GET', caminho: rotasApi.backup.alertas, manipulador: listarAlertasBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'ler os alertas dos backups' },
  { metodo: 'GET', caminho: rotasApi.backup.conexoes, manipulador: listarImpactosBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'ler os backups de cada conexão' },
  { metodo: 'GET', caminho: rotasApi.backup.objetos(ID), manipulador: listarObjetosBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'listar os objetos de um banco para o backup' },
  { metodo: 'GET', caminho: rotasApi.backup.execucoes, manipulador: listarExecucoesBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'consultar o histórico de backups' },
  { metodo: 'POST', caminho: rotasApi.backup.execucoes, manipulador: iniciarExecucaoBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'iniciar um backup', espera: esperaDaAlteracao },
  { metodo: 'GET', caminho: rotasApi.backup.execucao(ID), manipulador: buscarExecucaoBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'ler um backup', espera: () => 80 },
  { metodo: 'POST', caminho: rotasApi.backup.cancelamentoDaExecucao(ID), manipulador: cancelarExecucaoBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'cancelar um backup', espera: esperaDaAlteracao },
  { metodo: 'GET', caminho: rotasApi.backup.arquivoDaExecucao(ID), manipulador: buscarArquivoBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'receber o arquivo de um backup', espera: () => 80 },
  { metodo: 'DELETE', caminho: rotasApi.backup.execucao(ID), manipulador: excluirExecucaoBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'excluir um backup', espera: esperaDaAdministracao },
  { metodo: 'GET', caminho: rotasApi.backup.agendamentos, manipulador: listarAgendamentosBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'listar os agendamentos de backup' },
  { metodo: 'POST', caminho: rotasApi.backup.agendamentos, manipulador: criarAgendamentoBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'criar um agendamento de backup', espera: esperaDaAdministracao },
  { metodo: 'PUT', caminho: rotasApi.backup.agendamento(ID), manipulador: editarAgendamentoBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'editar um agendamento de backup', espera: esperaDaAdministracao },
  { metodo: 'PATCH', caminho: rotasApi.backup.agendamento(ID), manipulador: alternarAgendamentoBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'ativar ou desativar um agendamento de backup' },
  { metodo: 'DELETE', caminho: rotasApi.backup.agendamento(ID), manipulador: excluirAgendamentoBackup, acesso: ['BACKUP_GERENCIAR'], descricao: 'excluir um agendamento de backup', espera: esperaDaAdministracao },
  { metodo: 'POST', caminho: rotasApi.backup.execucaoDoAgendamento(ID), manipulador: iniciarExecucaoDoAgendamento, acesso: ['BACKUP_GERENCIAR'], descricao: 'fazer agora o backup de um agendamento', espera: esperaDaAlteracao },
  {
    metodo: 'GET',
    caminho: rotasApi.dashboard.indicadores,
    manipulador: buscarIndicadores,
    acesso: ['DASHBOARD_VER'],
    descricao: 'ler os indicadores do dashboard',
  },
  {
    metodo: 'GET',
    caminho: rotasApi.dashboard.atividade,
    manipulador: buscarAtividade,
    acesso: ['DASHBOARD_VER'],
    descricao: 'ler a atividade do dashboard',
  },
  {
    metodo: 'GET',
    caminho: rotasApi.dashboard.consultas,
    manipulador: buscarConsultas,
    acesso: ['DASHBOARD_VER'],
    descricao: 'ler as consultas do dashboard',
  },
  {
    metodo: 'GET',
    caminho: rotasApi.consultas.lista,
    manipulador: listarConsultas,
    acesso: ['CONSULTAS_VER'],
    descricao: 'listar as consultas SQL',
  },
  {
    metodo: 'GET',
    caminho: rotasApi.consultas.historico(ID),
    manipulador: buscarHistoricoDaConsulta,
    acesso: ['CONSULTAS_VER'],
    descricao: 'ler o histórico de uma consulta',
  },
  {
    metodo: 'GET',
    caminho: rotasApi.consultas.plano(ID),
    manipulador: buscarPlanoDaConsulta,
    acesso: ['CONSULTAS_VER'],
    descricao: 'ler o plano de execução de uma consulta',
  },
  { metodo: 'GET', caminho: rotasApi.objetos.visoes, manipulador: listarVisoes, acesso: ['OBJETOS_VER'], descricao: 'listar as views' },
  { metodo: 'GET', caminho: rotasApi.objetos.indices, manipulador: listarIndices, acesso: ['OBJETOS_VER'], descricao: 'listar os índices' },
  { metodo: 'GET', caminho: rotasApi.objetos.tabelas, manipulador: listarTabelas, acesso: ['OBJETOS_VER'], descricao: 'listar as tabelas' },
  { metodo: 'GET', caminho: rotasApi.objetos.funcoes, manipulador: listarFuncoes, acesso: ['OBJETOS_VER'], descricao: 'listar as funções' },
  {
    metodo: 'GET',
    caminho: rotasApi.usuarios.papeis,
    manipulador: listarPapeis,
    acesso: ['BANCO_ACESSOS_VER'],
    descricao: 'listar os papéis do banco',
  },
  {
    metodo: 'GET',
    caminho: rotasApi.usuarios.sessoes,
    manipulador: listarSessoes,
    acesso: ['BANCO_ACESSOS_VER'],
    descricao: 'listar as sessões do banco',
  },
  {
    metodo: 'GET',
    caminho: rotasApi.usuarios.permissoes,
    manipulador: listarPermissoes,
    acesso: ['BANCO_ACESSOS_VER'],
    descricao: 'ler as permissões do banco',
  },
  {
    metodo: 'GET',
    caminho: rotasApi.usuarios.alteracoes,
    manipulador: listarAlteracoes,
    acesso: ['BANCO_ACESSOS_VER'],
    descricao: 'listar as alterações do banco',
  },
  {
    metodo: 'POST',
    caminho: rotasApi.usuarios.alteracoes,
    manipulador: aplicarAlteracao,
    acesso: permissoesDaAlteracao,
    descricao: 'alterar papéis ou permissões do banco',
    espera: esperaDaAlteracao,
  },
  {
    metodo: 'GET',
    caminho: rotasApi.relatorios.resumo,
    manipulador: buscarResumoRelatorio,
    acesso: ['RELATORIOS_VER'],
    descricao: 'ler um relatório',
  },
  { metodo: 'GET', caminho: rotasApi.sistema.versao, manipulador: buscarVersao, acesso: 'AUTENTICADA' },
  {
    metodo: 'GET',
    caminho: rotasApi.administracao.contas,
    manipulador: listarContas,
    acesso: ['ADMIN_USUARIOS'],
    descricao: 'listar as contas do Orynt',
  },
  {
    metodo: 'POST',
    caminho: rotasApi.administracao.contas,
    manipulador: criarConta,
    acesso: ['ADMIN_USUARIOS'],
    descricao: 'criar uma conta',
    espera: esperaDaAdministracao,
  },
  {
    metodo: 'PATCH',
    caminho: rotasApi.administracao.conta(ID),
    manipulador: editarConta,
    acesso: ['ADMIN_USUARIOS'],
    descricao: 'editar uma conta',
    espera: esperaDaAdministracao,
  },
  {
    metodo: 'DELETE',
    caminho: rotasApi.administracao.conta(ID),
    manipulador: excluirConta,
    acesso: ['ADMIN_USUARIOS'],
    descricao: 'excluir uma conta',
    espera: esperaDaAdministracao,
  },
  {
    metodo: 'PUT',
    caminho: rotasApi.administracao.permissoes(ID),
    manipulador: mudarPermissoes,
    acesso: ['ADMIN_USUARIOS'],
    descricao: 'mudar as permissões de uma conta',
    espera: esperaDaAdministracao,
  },
  {
    metodo: 'POST',
    caminho: rotasApi.administracao.convite(ID),
    manipulador: reenviarConvite,
    acesso: ['ADMIN_USUARIOS'],
    descricao: 'reenviar um convite',
    espera: esperaDaAdministracao,
  },
  {
    metodo: 'DELETE',
    caminho: rotasApi.administracao.sessoes(ID),
    manipulador: encerrarSessoes,
    acesso: ['ADMIN_USUARIOS'],
    descricao: 'encerrar as sessões de uma conta',
    espera: esperaDaAdministracao,
  },
  {
    metodo: 'DELETE',
    caminho: rotasApi.administracao.bloqueio(ID),
    manipulador: desbloquearConta,
    acesso: ['ADMIN_USUARIOS'],
    descricao: 'desbloquear uma conta',
    espera: esperaDaAdministracao,
  },
  {
    metodo: 'GET',
    caminho: rotasApi.auditoria.eventos,
    manipulador: listarAuditoria,
    acesso: ['ADMIN_AUDITORIA'],
    descricao: 'consultar a auditoria',
  },
  { metodo: 'POST', caminho: rotasApi.auditoria.acessos, manipulador: registrarAcessoATela, acesso: 'AUTENTICADA', espera: () => 0 },
];

function lerParametros(modelo: string, caminho: string): Record<string, string> | null {
  const trechosModelo = modelo.split('/');
  const trechos = caminho.split('/');
  if (trechosModelo.length !== trechos.length) return null;

  const parametros: Record<string, string> = {};
  for (const [indice, trechoModelo] of trechosModelo.entries()) {
    const trecho = trechos[indice] ?? '';
    if (trechoModelo.startsWith(MARCA_PARAMETRO) && trecho) parametros[trechoModelo.slice(MARCA_PARAMETRO.length)] = trecho;
    else if (trechoModelo !== trecho) return null;
  }
  return parametros;
}

function encontrarRota(requisicao: RequisicaoTransporte): RotaEncontrada | undefined {
  for (const rota of rotas) {
    if (rota.metodo !== requisicao.metodo) continue;
    const parametros = lerParametros(rota.caminho, requisicao.caminho);
    if (parametros) return { rota, parametros };
  }
  return undefined;
}

function esperar(milissegundos: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolver, rejeitar) => {
    const temporizador = window.setTimeout(resolver, milissegundos);
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(temporizador);
        rejeitar(new DOMException('Requisição cancelada.', 'AbortError'));
      },
      { once: true },
    );
  });
}

function latenciaDaRota(rota: Rota | undefined): number {
  if (rota?.caminho === rotasApi.auditoria.acessos) return 0;
  const configurada = latenciaConfigurada();
  if (configurada !== null) return configurada;
  if (rota?.espera) return rota.espera();
  return LATENCIA_MINIMA_MS + Math.random() * (LATENCIA_MAXIMA_MS - LATENCIA_MINIMA_MS);
}

function caminhoBaseApi(): string {
  try {
    return new URL(ambiente.urlApi).pathname.replace(/\/$/, '');
  } catch {
    return '';
  }
}

function completarErro(resposta: RespostaTransporte, caminho: string): RespostaTransporte {
  if (resposta.status < 400 || !resposta.corpo || typeof resposta.corpo !== 'object') return resposta;
  const base = caminhoBaseApi();
  const corpo = resposta.corpo as { instance?: string; type?: string };
  return { ...resposta, corpo: { ...corpo, instance: `${base}${caminho}`, type: `${base}${corpo.type ?? ''}` } };
}

export async function atenderNoSimulador(requisicao: RequisicaoTransporte, agora: Date = new Date()): Promise<RespostaTransporte> {
  const encontrada = encontrarRota(requisicao);
  if (deveFalhar(requisicao.caminho)) return servicoIndisponivel('Falha simulada pelo modo de desenvolvimento.');
  if (!encontrada) return rotaInexistente(`Rota ${requisicao.metodo} ${requisicao.caminho} não existe no simulador.`);
  const autorizacao = autorizar(requisicao, encontrada.rota.acesso, encontrada.rota.descricao, agora);
  if ('recusa' in autorizacao) return autorizacao.recusa;
  return encontrada.rota.manipulador(requisicao, agora, encontrada.parametros, autorizacao.contexto);
}

export const transporteSimulado: Transporte = async (requisicao) => {
  const encontrada = encontrarRota(requisicao);
  await esperar(latenciaDaRota(encontrada?.rota), requisicao.signal);
  return completarErro(await atenderNoSimulador(requisicao), requisicao.caminho);
};

function restaurarAdministracao(): void {
  restaurarContasSimuladas();
  restaurarAuditoriaSimulada();
  reiniciarConvitesSimulados();
  encerrarSessaoSimulada();
  encerrarAcessoSimulado();
  window.location.reload();
}

if (ambiente.desenvolvimento) {
  Object.assign(window, {
    oryntSimulacao: {
      cenario: definirCenarioConexao,
      falhar: (caminhos: string | false = '*') => definirFalhas(caminhos),
      latencia: definirLatencia,
      esvaziar: (vazios = true) => definirDadosVazios(vazios),
      rastrearFuncoes: definirRastreamentoDasFuncoes,
      recusarAlteracoes: (recusar = true) => definirRecusaDeAlteracoes(recusar),
      restaurarPapeis: restaurarPapeisSimulados,
      falharBackups: (falhar = true) => definirFalhaDosBackups(falhar),
      restaurarBackup: () => {
        restaurarBackupSimulado();
        window.location.reload();
      },
      restaurarAdministracao,
      encerrarSessao: encerrarSessaoSimulada,
      expirarCodigo: expirarCodigoSimulado,
      expirarRedefinicao: expirarRedefinicaoSimulada,
      sair: () => {
        sairDoAcessoSimulado();
        window.location.reload();
      },
    },
  });
}
