import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import type { AlvoAuditoriaDTO } from '@/modelos/administracao';
import type {
  DadosAgendamentoDTO,
  FrequenciaBackup,
  ListaAgendamentosDTO,
  ListaAlertasBackupDTO,
  PaginaExecucoesDTO,
  SelecaoObjetos,
  TipoBackup,
} from '@/modelos/backup';
import { PROBLEMAS_BACKUP } from '@/modelos/backup';
import type { ConexaoSalvaDTO } from '@/modelos/conexao';
import {
  EXECUCOES_POR_PAGINA,
  TAMANHO_MAXIMO_NOME_BACKUP,
  filtrarExecucoes,
  lerFiltrosHistorico,
  tiposBackup,
} from '@/regras/backup';
import { INTERVALO_MAXIMO, descreverFrequencia, horarioValido } from '@/regras/frequenciaBackup';
import type { NovoEvento } from '../auditoriaSimulada';
import { registrarEvento } from '../auditoriaSimulada';
import type { ContextoSimulado } from '../autorizacaoSimulada';
import { semAcessoAutenticado } from '../autorizacaoSimulada';
import {
  alternarAgendamentoSimulado,
  arquivoDaExecucaoSimulada,
  buscarExecucaoSimulada,
  cancelarExecucaoSimulada,
  criarAgendamentoSimulado,
  editarAgendamentoSimulado,
  excluirAgendamentoSimulado,
  excluirExecucaoSimulada,
  impactosNasConexoes,
  iniciarExecucaoSimulada,
  listarAgendamentosSimulados,
  listarAlertasSimulados,
  listarExecucoesSimuladas,
  objetosAceitosDaSelecao,
  objetosDoBanco,
  resumoSimulado,
} from '../backup';
import { lerConexoesSalvasSimuladas } from '../conexoesSalvasSimuladas';
import type { ContaSimulada } from '../contasSimuladas';
import { autorDaConta } from '../contasSimuladas';
import { dadosVazios, lerCenarioConexao } from '../controles';
import { criado, dadosInvalidos, ok, problema, rotaInexistente, semConteudo } from '../resposta';

type Parametros = Record<string, string>;

const MOTIVO_DO_CENARIO: Record<ReturnType<typeof lerCenarioConexao>, string | null> = {
  SUCESSO: null,
  SENHA_INCORRETA: 'O banco recusou o usuário ou a senha guardados nesta conexão.',
  SERVIDOR_INACESSIVEL: 'Ninguém respondeu no endereço e na porta desta conexão.',
  BANCO_INEXISTENTE: 'O servidor respondeu, mas o banco desta conexão não existe mais.',
  TEMPO_ESGOTADO: 'O servidor demorou demais para responder e o backup foi interrompido.',
};

function corpoDe(requisicao: RequisicaoTransporte): Record<string, unknown> {
  return requisicao.corpo && typeof requisicao.corpo === 'object' ? (requisicao.corpo as Record<string, unknown>) : {};
}

function registrar(conta: ContaSimulada, evento: Omit<NovoEvento, 'conta'>, agora: Date): void {
  registrarEvento({ ...evento, conta: autorDaConta(conta) }, agora);
}

function alvoDoAgendamento(id: string, nome: string): AlvoAuditoriaDTO {
  return { tipo: 'AGENDAMENTO', id, rotulo: nome };
}

function lerSelecao(valor: unknown): SelecaoObjetos | null {
  if (!valor || typeof valor !== 'object') return null;
  const bruto = valor as Record<string, unknown>;
  if (bruto.modo === 'BANCO_INTEIRO') return { modo: 'BANCO_INTEIRO' };
  if (bruto.modo === 'ESCOLHIDOS' && Array.isArray(bruto.objetos) && bruto.objetos.every((item) => typeof item === 'string')) {
    return { modo: 'ESCOLHIDOS', objetos: bruto.objetos as string[] };
  }
  return null;
}

function inteiroEntre(valor: unknown, minimo: number, maximo: number): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= minimo && valor <= maximo;
}

function lerFrequencia(valor: unknown): FrequenciaBackup | null {
  if (!valor || typeof valor !== 'object') return null;
  const bruto = valor as Record<string, unknown>;
  const horario = typeof bruto.horario === 'string' && horarioValido(bruto.horario) ? bruto.horario : null;
  if (!horario) return null;
  switch (bruto.tipo) {
    case 'DIARIA':
      return { tipo: 'DIARIA', horario };
    case 'SEMANAL':
      return inteiroEntre(bruto.diaDaSemana, 0, 6) ? { tipo: 'SEMANAL', diaDaSemana: bruto.diaDaSemana, horario } : null;
    case 'MENSAL':
      return inteiroEntre(bruto.diaDoMes, 1, 31) ? { tipo: 'MENSAL', diaDoMes: bruto.diaDoMes, horario } : null;
    case 'PERSONALIZADA': {
      if (bruto.unidade !== 'HORAS' && bruto.unidade !== 'DIAS') return null;
      return inteiroEntre(bruto.intervalo, 1, INTERVALO_MAXIMO[bruto.unidade])
        ? { tipo: 'PERSONALIZADA', intervalo: bruto.intervalo, unidade: bruto.unidade, horario }
        : null;
    }
    default:
      return null;
  }
}

function lerTipo(valor: unknown): TipoBackup | null {
  return tiposBackup.find((tipo) => tipo === valor) ?? null;
}

function conexaoDaConta(salvas: ConexaoSalvaDTO[], id: unknown): ConexaoSalvaDTO | null {
  return salvas.find((salva) => salva.id === id) ?? null;
}

function conexaoInexistente(): RespostaTransporte {
  return dadosInvalidos([{ campo: 'conexaoId', mensagem: 'Esta conexão não existe mais. Escolha outra.' }]);
}

function lerDadosDoAgendamento(
  requisicao: RequisicaoTransporte,
  salvas: ConexaoSalvaDTO[],
  agora: Date,
): { dados: DadosAgendamentoDTO; conexao: ConexaoSalvaDTO } | { recusa: RespostaTransporte } {
  const corpo = corpoDe(requisicao);
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : '';
  if (!nome || nome.length > TAMANHO_MAXIMO_NOME_BACKUP) {
    return { recusa: dadosInvalidos([{ campo: 'nome', mensagem: `Use um nome com até ${TAMANHO_MAXIMO_NOME_BACKUP} caracteres.` }]) };
  }
  const conexao = conexaoDaConta(salvas, corpo.conexaoId);
  if (!conexao) return { recusa: conexaoInexistente() };
  const tipo = lerTipo(corpo.tipo);
  const selecao = lerSelecao(corpo.selecao);
  const frequencia = lerFrequencia(corpo.frequencia);
  if (!tipo || !selecao || !frequencia || typeof corpo.ativo !== 'boolean') {
    return { recusa: dadosInvalidos([{ campo: 'frequencia', mensagem: 'Revise a frequência.' }]) };
  }
  if (!objetosAceitosDaSelecao(selecao, tipo, agora)) {
    return { recusa: dadosInvalidos([{ campo: 'selecao', mensagem: 'A seleção tem objetos que este tipo de backup não aceita.' }]) };
  }
  return { dados: { nome, conexaoId: conexao.id, tipo, selecao, frequencia, ativo: corpo.ativo }, conexao };
}

export function buscarResumoBackup(_requisicao: RequisicaoTransporte, agora: Date, _parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  return ok(resumoSimulado(conta.id, lerConexoesSalvasSimuladas(conta.id), agora, dadosVazios()));
}

export function listarAlertasBackup(_requisicao: RequisicaoTransporte, agora: Date, _parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const resposta: ListaAlertasBackupDTO = {
    geradoEm: agora.toISOString(),
    alertas: listarAlertasSimulados(conta.id, lerConexoesSalvasSimuladas(conta.id), agora, dadosVazios()),
  };
  return ok(resposta);
}

export function listarImpactosBackup(_requisicao: RequisicaoTransporte, agora: Date, _parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  return ok(impactosNasConexoes(conta.id, lerConexoesSalvasSimuladas(conta.id), agora));
}

export function listarObjetosBackup(_requisicao: RequisicaoTransporte, agora: Date, parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const conexao = conexaoDaConta(lerConexoesSalvasSimuladas(conta.id), parametros.id);
  if (!conexao) return rotaInexistente('A conexão não existe mais. Ela pode ter sido excluída em outra tela.');
  return ok({ conexaoId: conexao.id, banco: conexao.banco, objetos: dadosVazios() ? [] : objetosDoBanco(agora) });
}

export function listarExecucoesBackup(requisicao: RequisicaoTransporte, agora: Date, _parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const pagina = Number(requisicao.consulta.pagina);
  const filtros = lerFiltrosHistorico({ ...requisicao.consulta, pagina: Number.isFinite(pagina) ? pagina : 1 });
  const todas = listarExecucoesSimuladas(conta.id, lerConexoesSalvasSimuladas(conta.id), agora, dadosVazios());
  const encontradas = filtrarExecucoes(todas, filtros, agora);
  const totalPaginas = Math.max(1, Math.ceil(encontradas.length / EXECUCOES_POR_PAGINA));
  const atual = Math.min(filtros.pagina, totalPaginas);
  const inicio = (atual - 1) * EXECUCOES_POR_PAGINA;
  const resposta: PaginaExecucoesDTO = {
    geradoEm: agora.toISOString(),
    itens: encontradas.slice(inicio, inicio + EXECUCOES_POR_PAGINA),
    pagina: atual,
    itensPorPagina: EXECUCOES_POR_PAGINA,
    totalItens: encontradas.length,
    totalPaginas,
    totalRegistradas: todas.length,
    bancos: [...new Set(todas.map((execucao) => execucao.banco))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  };
  return ok(resposta);
}

export function buscarExecucaoBackup(_requisicao: RequisicaoTransporte, agora: Date, parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const execucao = buscarExecucaoSimulada(conta.id, lerConexoesSalvasSimuladas(conta.id), parametros.id ?? '', agora);
  return execucao ? ok(execucao) : rotaInexistente('Este backup não existe mais.');
}

export function iniciarExecucaoBackup(requisicao: RequisicaoTransporte, agora: Date, _parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const salvas = lerConexoesSalvasSimuladas(conta.id);
  const corpo = corpoDe(requisicao);
  const conexao = conexaoDaConta(salvas, corpo.conexaoId);
  if (!conexao) return conexaoInexistente();
  const tipo = lerTipo(corpo.tipo);
  const selecao = lerSelecao(corpo.selecao);
  if (!tipo || !selecao || !objetosAceitosDaSelecao(selecao, tipo, agora)) {
    return dadosInvalidos([{ campo: 'selecao', mensagem: 'Marque ao menos um objeto que este tipo de backup aceite.' }]);
  }
  const nome = typeof corpo.nome === 'string' && corpo.nome.trim() ? corpo.nome.trim() : null;
  if (nome && nome.length > TAMANHO_MAXIMO_NOME_BACKUP) {
    return dadosInvalidos([{ campo: 'nome', mensagem: `O nome pode ter até ${TAMANHO_MAXIMO_NOME_BACKUP} caracteres.` }]);
  }

  const motivo = MOTIVO_DO_CENARIO[lerCenarioConexao()];
  const execucao = iniciarExecucaoSimulada(conta.id, salvas, conexao, { nome, tipo, selecao, agendamentoId: null }, agora, motivo);
  registrar(
    conta,
    { tipo: 'BACKUP_INICIADO', resultado: 'SUCESSO', alvo: { tipo: 'BACKUP', id: execucao.id, rotulo: `${execucao.nome} (${execucao.banco})` } },
    agora,
  );
  return criado(execucao);
}

export function iniciarExecucaoDoAgendamento(_requisicao: RequisicaoTransporte, agora: Date, parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const salvas = lerConexoesSalvasSimuladas(conta.id);
  const agendamento = listarAgendamentosSimulados(conta.id, salvas, agora).find((item) => item.id === parametros.id);
  if (!agendamento) return rotaInexistente('Este agendamento não existe mais.');
  const conexao = conexaoDaConta(salvas, agendamento.conexaoId);
  if (!conexao) {
    return problema(409, 'Sem conexão!', PROBLEMAS_BACKUP.conexaoIndisponivel, 'A conexão deste agendamento foi excluída. Edite-o e escolha outra conexão.');
  }
  const execucao = iniciarExecucaoSimulada(
    conta.id,
    salvas,
    conexao,
    { nome: agendamento.nome, tipo: agendamento.tipo, selecao: agendamento.selecao, agendamentoId: agendamento.id },
    agora,
    MOTIVO_DO_CENARIO[lerCenarioConexao()],
  );
  registrar(
    conta,
    { tipo: 'BACKUP_INICIADO', resultado: 'SUCESSO', alvo: { tipo: 'BACKUP', id: execucao.id, rotulo: `${execucao.nome} (${execucao.banco})` } },
    agora,
  );
  return criado(execucao);
}

export function cancelarExecucaoBackup(_requisicao: RequisicaoTransporte, agora: Date, parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const salvas = lerConexoesSalvasSimuladas(conta.id);
  const atual = buscarExecucaoSimulada(conta.id, salvas, parametros.id ?? '', agora);
  if (!atual) return rotaInexistente('Este backup não existe mais.');
  if (atual.situacao !== 'EM_ANDAMENTO') return ok(atual);
  const execucao = cancelarExecucaoSimulada(conta.id, salvas, atual.id, agora);
  if (!execucao) return rotaInexistente('Este backup não existe mais.');
  registrar(
    conta,
    { tipo: 'BACKUP_CANCELADO', resultado: 'SUCESSO', alvo: { tipo: 'BACKUP', id: execucao.id, rotulo: `${execucao.nome} (${execucao.banco})` } },
    agora,
  );
  return ok(execucao);
}

export function buscarArquivoBackup(_requisicao: RequisicaoTransporte, agora: Date, parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const arquivo = arquivoDaExecucaoSimulada(conta.id, lerConexoesSalvasSimuladas(conta.id), parametros.id ?? '', agora);
  if (!arquivo) {
    return problema(410, 'Arquivo indisponível!', PROBLEMAS_BACKUP.arquivoIndisponivel, 'O Orynt não guarda os arquivos: só a aba que fez o backup recebe o arquivo.');
  }
  return ok(arquivo);
}

export function excluirExecucaoBackup(_requisicao: RequisicaoTransporte, agora: Date, parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const execucao = buscarExecucaoSimulada(conta.id, lerConexoesSalvasSimuladas(conta.id), parametros.id ?? '', agora);
  if (!execucao) return rotaInexistente('Este backup não existe mais.');
  if (execucao.situacao === 'EM_ANDAMENTO') {
    return problema(409, 'Backup em andamento!', PROBLEMAS_BACKUP.execucaoEmAndamento, 'Espere o backup terminar para excluí-lo.');
  }
  excluirExecucaoSimulada(conta.id, execucao.id);
  registrar(
    conta,
    { tipo: 'BACKUP_EXCLUIDO', resultado: 'SUCESSO', alvo: { tipo: 'BACKUP', id: execucao.id, rotulo: `${execucao.nome} (${execucao.banco})` } },
    agora,
  );
  return semConteudo();
}

export function listarAgendamentosBackup(_requisicao: RequisicaoTransporte, agora: Date, _parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const resposta: ListaAgendamentosDTO = {
    geradoEm: agora.toISOString(),
    agendamentos: listarAgendamentosSimulados(conta.id, lerConexoesSalvasSimuladas(conta.id), agora, dadosVazios()),
  };
  return ok(resposta);
}

export function criarAgendamentoBackup(requisicao: RequisicaoTransporte, agora: Date, _parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const salvas = lerConexoesSalvasSimuladas(conta.id);
  const lidos = lerDadosDoAgendamento(requisicao, salvas, agora);
  if ('recusa' in lidos) return lidos.recusa;
  const agendamento = criarAgendamentoSimulado(conta.id, salvas, lidos.conexao, lidos.dados, agora);
  registrar(conta, { tipo: 'AGENDAMENTO_CRIADO', resultado: 'SUCESSO', alvo: alvoDoAgendamento(agendamento.id, agendamento.nome) }, agora);
  return criado(agendamento);
}

export function editarAgendamentoBackup(requisicao: RequisicaoTransporte, agora: Date, parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const salvas = lerConexoesSalvasSimuladas(conta.id);
  const lidos = lerDadosDoAgendamento(requisicao, salvas, agora);
  if ('recusa' in lidos) return lidos.recusa;
  const antes = listarAgendamentosSimulados(conta.id, salvas, agora).find((item) => item.id === parametros.id);
  const agendamento = editarAgendamentoSimulado(conta.id, salvas, parametros.id ?? '', lidos.conexao, lidos.dados, agora);
  if (!agendamento) return rotaInexistente('Este agendamento não existe mais.');
  registrar(
    conta,
    {
      tipo: 'AGENDAMENTO_EDITADO',
      resultado: 'SUCESSO',
      alvo: alvoDoAgendamento(agendamento.id, agendamento.nome),
      mudancas: antes
        ? [{ campo: 'Frequência', antes: descreverFrequencia(antes.frequencia), depois: descreverFrequencia(agendamento.frequencia) }].filter(
            (mudanca) => mudanca.antes !== mudanca.depois,
          )
        : [],
    },
    agora,
  );
  return ok(agendamento);
}

export function alternarAgendamentoBackup(requisicao: RequisicaoTransporte, agora: Date, parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const { ativo } = corpoDe(requisicao);
  if (typeof ativo !== 'boolean') return dadosInvalidos([{ campo: 'ativo', mensagem: 'Informe se o agendamento fica ativo.' }]);
  const salvas = lerConexoesSalvasSimuladas(conta.id);
  const atual = listarAgendamentosSimulados(conta.id, salvas, agora).find((item) => item.id === parametros.id);
  if (!atual) return rotaInexistente('Este agendamento não existe mais.');
  if (ativo && !atual.conexaoId) {
    return problema(409, 'Sem conexão!', PROBLEMAS_BACKUP.conexaoIndisponivel, 'A conexão deste agendamento foi excluída. Edite-o e escolha outra conexão.');
  }
  const agendamento = alternarAgendamentoSimulado(conta.id, salvas, atual.id, ativo, agora);
  if (!agendamento) return rotaInexistente('Este agendamento não existe mais.');
  registrar(conta, { tipo: ativo ? 'AGENDAMENTO_ATIVADO' : 'AGENDAMENTO_DESATIVADO', resultado: 'SUCESSO', alvo: alvoDoAgendamento(agendamento.id, agendamento.nome) }, agora);
  return ok(agendamento);
}

export function excluirAgendamentoBackup(_requisicao: RequisicaoTransporte, agora: Date, parametros: Parametros, contexto: ContextoSimulado): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return semAcessoAutenticado();
  const atual = listarAgendamentosSimulados(conta.id, lerConexoesSalvasSimuladas(conta.id), agora).find((item) => item.id === parametros.id);
  if (!atual) return rotaInexistente('Este agendamento não existe mais.');
  excluirAgendamentoSimulado(conta.id, atual.id);
  registrar(conta, { tipo: 'AGENDAMENTO_EXCLUIDO', resultado: 'SUCESSO', alvo: alvoDoAgendamento(atual.id, atual.nome) }, agora);
  return semConteudo();
}
