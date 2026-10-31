import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import type { AlvoAuditoriaDTO, CodigoPermissao, ContaDTO, ListaContasDTO, MudancaAuditoriaDTO, PerfilConta } from '@/modelos/administracao';
import { PROBLEMAS_ADMINISTRACAO } from '@/modelos/administracao';
import { DIAS_DE_VALIDADE_DO_CONVITE, validarEmailConta, validarNomeConta } from '@/regras/contas';
import type { MudancaDeConta, RecusaDeMudanca } from '@/regras/permissoesConta';
import {
  avaliarMudancaDeConta,
  diferencaDePermissoes,
  ehCodigoPermissao,
  ehPerfil,
  normalizarPermissoes,
  rotuloDoPerfil,
} from '@/regras/permissoesConta';
import { registrarEvento } from '../auditoriaSimulada';
import type { ContextoSimulado } from '../autorizacaoSimulada';
import { semAcessoAutenticado } from '../autorizacaoSimulada';
import { removerBackupDaConta } from '../backup';
import { lerConexoesSalvasSimuladas, removerConexoesDaConta } from '../conexoesSalvasSimuladas';
import type { ContaSimulada, ConviteSimulado } from '../contasSimuladas';
import {
  atualizarContaSimulada,
  autorDaConta,
  contaPorEmail,
  contaPorId,
  encerrarSessoesDaConta,
  gravarContasSimuladas,
  lerContasSimuladas,
  limparTentativasDeLogin,
  paraContaDTO,
  removerContaSimulada,
} from '../contasSimuladas';
import { descartarConviteSimulado, entregarConviteSimulado } from '../convitesSimulados';
import { gerarToken, resumoDoToken } from '../hashSenhaSimulada';
import { criado, dadosInvalidos, ok, problema, rotaInexistente, semConteudo } from '../resposta';

type Parametros = Record<string, string>;

const DIA_MS = 86_400_000;

function corpoDe(requisicao: RequisicaoTransporte): Record<string, unknown> {
  return requisicao.corpo && typeof requisicao.corpo === 'object' ? (requisicao.corpo as Record<string, unknown>) : {};
}

function contaInexistente(): RespostaTransporte {
  return rotaInexistente('A conta não existe mais. Ela pode ter sido excluída em outra aba.');
}

function emailEmUso(): RespostaTransporte {
  return problema(409, 'E-mail em uso!', PROBLEMAS_ADMINISTRACAO.emailEmUso, 'Já existe uma conta com este e-mail.', [
    { campo: 'email', mensagem: 'Já existe uma conta com este e-mail.' },
  ]);
}

function recusar(recusa: RecusaDeMudanca): RespostaTransporte {
  if (recusa.motivo === 'ELEVACAO') return problema(403, 'Elevação de privilégio!', PROBLEMAS_ADMINISTRACAO.elevacaoDePrivilegio, recusa.mensagem);
  if (recusa.motivo === 'REQUISITO') return dadosInvalidos([{ campo: 'permissoes', mensagem: recusa.mensagem }]);
  return problema(409, 'Alteração protegida!', PROBLEMAS_ADMINISTRACAO.protecaoAdministrador, recusa.mensagem);
}

function alvoDaConta(conta: Pick<ContaSimulada, 'id' | 'nome' | 'email'>): AlvoAuditoriaDTO {
  return { tipo: 'CONTA', id: conta.id, rotulo: `${conta.nome} (${conta.email})` };
}

function dto(conta: ContaSimulada, agora: Date): ContaDTO {
  return paraContaDTO(conta, agora, lerConexoesSalvasSimuladas(conta.id).length);
}

function lerPermissoesDoCorpo(valor: unknown): CodigoPermissao[] | null {
  if (!Array.isArray(valor) || !valor.every(ehCodigoPermissao)) return null;
  return normalizarPermissoes(valor);
}

async function emitirConvite(conta: Pick<ContaSimulada, 'id' | 'nome' | 'email'>, agora: Date): Promise<ConviteSimulado> {
  const token = gerarToken();
  const enviadoEm = agora.toISOString();
  const expiraEm = new Date(agora.getTime() + DIAS_DE_VALIDADE_DO_CONVITE * DIA_MS).toISOString();
  entregarConviteSimulado({ contaId: conta.id, nome: conta.nome, destinatario: conta.email, token, enviadoEm, expiraEm });
  return { resumoDoToken: await resumoDoToken(token), enviadoEm, expiraEm };
}

function avaliar(ator: ContaSimulada, alvo: ContaSimulada, mudanca: MudancaDeConta): RecusaDeMudanca | null {
  return avaliarMudancaDeConta(ator, alvo, mudanca, lerContasSimuladas());
}

export function listarContas(
  _requisicao: RequisicaoTransporte,
  agora: Date,
  _parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  if (!contexto.conta) return semAcessoAutenticado();
  const lista: ListaContasDTO = {
    geradoEm: agora.toISOString(),
    contaAtual: contexto.conta.id,
    contas: lerContasSimuladas(agora).map((conta) => dto(conta, agora)),
  };
  return ok(lista);
}

export async function criarConta(
  requisicao: RequisicaoTransporte,
  agora: Date,
  _parametros: Parametros,
  contexto: ContextoSimulado,
): Promise<RespostaTransporte> {
  const ator = contexto.conta;
  if (!ator) return semAcessoAutenticado();
  const corpo = corpoDe(requisicao);
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim().replace(/\s+/g, ' ') : '';
  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  const erros = [
    { campo: 'nome', mensagem: validarNomeConta(nome) },
    { campo: 'email', mensagem: validarEmailConta(email) },
  ].flatMap(({ campo, mensagem }) => (mensagem ? [{ campo, mensagem }] : []));
  const permissoes = lerPermissoesDoCorpo(corpo.permissoes);
  if (!ehPerfil(corpo.perfil)) erros.push({ campo: 'perfil', mensagem: 'Escolha um dos perfis do Orynt.' });
  if (permissoes === null) erros.push({ campo: 'permissoes', mensagem: 'As permissões não estão no catálogo do Orynt.' });
  if (typeof corpo.ativa !== 'boolean') erros.push({ campo: 'ativa', mensagem: 'Informe se a conta começa ativa.' });
  if (erros.length > 0 || !ehPerfil(corpo.perfil) || permissoes === null) return dadosInvalidos(erros);
  if (contaPorEmail(email)) return emailEmUso();

  const perfil: PerfilConta = corpo.perfil;
  const ativa = corpo.ativa === true;
  const id = `conta-${crypto.randomUUID().slice(0, 12)}`;
  const instante = agora.toISOString();
  const nova: ContaSimulada = {
    id,
    nome,
    email,
    perfil,
    permissoes: [],
    ativa,
    inicial: false,
    criadaEm: instante,
    criadaPor: autorDaConta(ator),
    atualizadaEm: instante,
    ultimoAcessoEm: null,
    senha: null,
    convite: null,
    bloqueadaAte: null,
    sessoes: [],
  };
  const recusa = avaliar(ator, nova, { tipo: 'PERMISSOES', perfil, permissoes });
  if (recusa) return recusar(recusa);

  const convite = ativa ? await emitirConvite(nova, agora) : null;
  const salva: ContaSimulada = { ...nova, permissoes, convite };
  gravarContasSimuladas([...lerContasSimuladas(agora), salva]);
  registrarEvento(
    {
      tipo: 'CONTA_CRIADA',
      resultado: 'SUCESSO',
      conta: autorDaConta(ator),
      alvo: alvoDaConta(salva),
      concedidas: permissoes,
      mudancas: [
        { campo: 'Perfil', antes: null, depois: rotuloDoPerfil(perfil) },
        { campo: 'Situação', antes: null, depois: ativa ? 'Ativa, com convite enviado' : 'Desativada, sem convite' },
      ],
    },
    agora,
  );
  return criado(dto(salva, agora));
}

export async function editarConta(
  requisicao: RequisicaoTransporte,
  agora: Date,
  parametros: Parametros,
  contexto: ContextoSimulado,
): Promise<RespostaTransporte> {
  const ator = contexto.conta;
  if (!ator) return semAcessoAutenticado();
  const alvo = contaPorId(parametros.id ?? '');
  if (!alvo) return contaInexistente();
  const corpo = corpoDe(requisicao);

  const erros: { campo: string; mensagem: string }[] = [];
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim().replace(/\s+/g, ' ') : alvo.nome;
  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : alvo.email;
  const erroNome = validarNomeConta(nome);
  const erroEmail = validarEmailConta(email);
  if (erroNome) erros.push({ campo: 'nome', mensagem: erroNome });
  if (erroEmail) erros.push({ campo: 'email', mensagem: erroEmail });
  if (corpo.ativa !== undefined && typeof corpo.ativa !== 'boolean') erros.push({ campo: 'ativa', mensagem: 'Informe se a conta fica ativa.' });
  if (erros.length > 0) return dadosInvalidos(erros);

  const outra = contaPorEmail(email);
  if (outra && outra.id !== alvo.id) return emailEmUso();

  const ativa = typeof corpo.ativa === 'boolean' ? corpo.ativa : alvo.ativa;
  if (alvo.ativa && !ativa) {
    const recusa = avaliar(ator, alvo, { tipo: 'DESATIVAR' });
    if (recusa) return recusar(recusa);
  }

  const mudancas: MudancaAuditoriaDTO[] = [];
  if (nome !== alvo.nome) mudancas.push({ campo: 'Nome', antes: alvo.nome, depois: nome });
  if (email !== alvo.email) mudancas.push({ campo: 'E-mail', antes: alvo.email, depois: email });

  const precisaDeConvite = ativa && alvo.senha === null && (!alvo.ativa || email !== alvo.email);
  const convite = precisaDeConvite ? await emitirConvite({ id: alvo.id, nome, email }, agora) : ativa ? alvo.convite : null;
  if (!ativa) descartarConviteSimulado(alvo.id);

  const atualizada = atualizarContaSimulada(alvo.id, (atual) => ({
    ...atual,
    nome,
    email,
    ativa,
    convite,
    sessoes: ativa ? atual.sessoes : [],
    atualizadaEm: agora.toISOString(),
  }));
  if (!atualizada) return contaInexistente();
  if (!ativa && alvo.ativa) encerrarSessoesDaConta(alvo.id);

  if (mudancas.length > 0) {
    registrarEvento({ tipo: 'CONTA_EDITADA', resultado: 'SUCESSO', conta: autorDaConta(ator), alvo: alvoDaConta(atualizada), mudancas }, agora);
  }
  if (ativa !== alvo.ativa) {
    registrarEvento(
      {
        tipo: ativa ? 'CONTA_ATIVADA' : 'CONTA_DESATIVADA',
        resultado: 'SUCESSO',
        conta: autorDaConta(ator),
        alvo: alvoDaConta(atualizada),
        motivo: ativa && precisaDeConvite ? 'Convite enviado para a pessoa definir a senha.' : null,
      },
      agora,
    );
  }
  return ok(dto(contaPorId(alvo.id) ?? atualizada, agora));
}

export function mudarPermissoes(
  requisicao: RequisicaoTransporte,
  agora: Date,
  parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const ator = contexto.conta;
  if (!ator) return semAcessoAutenticado();
  const alvo = contaPorId(parametros.id ?? '');
  if (!alvo) return contaInexistente();
  const corpo = corpoDe(requisicao);
  const permissoes = lerPermissoesDoCorpo(corpo.permissoes);
  if (!ehPerfil(corpo.perfil) || permissoes === null) {
    return dadosInvalidos([{ campo: 'permissoes', mensagem: 'Informe um perfil e permissões do catálogo do Orynt.' }]);
  }
  const perfil: PerfilConta = corpo.perfil;
  const recusa = avaliar(ator, alvo, { tipo: 'PERMISSOES', perfil, permissoes });
  if (recusa) return recusar(recusa);

  const { concedidas, revogadas } = diferencaDePermissoes(alvo.permissoes, permissoes);
  if (concedidas.length === 0 && revogadas.length === 0 && perfil === alvo.perfil) return ok(dto(alvo, agora));

  const atualizada = atualizarContaSimulada(alvo.id, (atual) => ({ ...atual, perfil, permissoes, atualizadaEm: agora.toISOString() }));
  if (!atualizada) return contaInexistente();
  registrarEvento(
    {
      tipo: 'PERMISSOES_ALTERADAS',
      resultado: 'SUCESSO',
      conta: autorDaConta(ator),
      alvo: alvoDaConta(atualizada),
      concedidas,
      revogadas,
      mudancas: perfil !== alvo.perfil ? [{ campo: 'Perfil', antes: rotuloDoPerfil(alvo.perfil), depois: rotuloDoPerfil(perfil) }] : [],
    },
    agora,
  );
  return ok(dto(atualizada, agora));
}

export function excluirConta(
  _requisicao: RequisicaoTransporte,
  agora: Date,
  parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const ator = contexto.conta;
  if (!ator) return semAcessoAutenticado();
  const alvo = contaPorId(parametros.id ?? '');
  if (!alvo) return contaInexistente();
  const recusa = avaliar(ator, alvo, { tipo: 'EXCLUIR' });
  if (recusa) return recusar(recusa);

  const sessoes = encerrarSessoesDaConta(alvo.id);
  const conexoes = removerConexoesDaConta(alvo.id);
  removerBackupDaConta(alvo.id);
  descartarConviteSimulado(alvo.id);
  removerContaSimulada(alvo.id);
  registrarEvento(
    {
      tipo: 'CONTA_EXCLUIDA',
      resultado: 'SUCESSO',
      conta: autorDaConta(ator),
      alvo: alvoDaConta(alvo),
      motivo: `${sessoes} ${sessoes === 1 ? 'sessão encerrada' : 'sessões encerradas'} e ${conexoes} ${conexoes === 1 ? 'conexão salva apagada' : 'conexões salvas apagadas'}.`,
      revogadas: alvo.permissoes,
    },
    agora,
  );
  return semConteudo();
}

export async function reenviarConvite(
  _requisicao: RequisicaoTransporte,
  agora: Date,
  parametros: Parametros,
  contexto: ContextoSimulado,
): Promise<RespostaTransporte> {
  const ator = contexto.conta;
  if (!ator) return semAcessoAutenticado();
  const alvo = contaPorId(parametros.id ?? '');
  if (!alvo) return contaInexistente();
  if (alvo.senha !== null || !alvo.ativa) {
    return problema(
      409,
      'Convite desnecessário!',
      PROBLEMAS_ADMINISTRACAO.conviteInvalido,
      alvo.ativa ? 'A pessoa já definiu a senha desta conta.' : 'Ative a conta antes de reenviar o convite.',
    );
  }
  const convite = await emitirConvite(alvo, agora);
  const atualizada = atualizarContaSimulada(alvo.id, (atual) => ({ ...atual, convite, atualizadaEm: agora.toISOString() }));
  if (!atualizada) return contaInexistente();
  registrarEvento({ tipo: 'CONVITE_REENVIADO', resultado: 'SUCESSO', conta: autorDaConta(ator), alvo: alvoDaConta(atualizada) }, agora);
  return ok(dto(atualizada, agora));
}

export function encerrarSessoes(
  _requisicao: RequisicaoTransporte,
  agora: Date,
  parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const ator = contexto.conta;
  if (!ator) return semAcessoAutenticado();
  const alvo = contaPorId(parametros.id ?? '');
  if (!alvo) return contaInexistente();
  if (alvo.id === ator.id) {
    return problema(
      409,
      'Alteração protegida!',
      PROBLEMAS_ADMINISTRACAO.protecaoAdministrador,
      'Para encerrar a própria sessão, use “Sair” no menu da conta.',
    );
  }
  const quantidade = encerrarSessoesDaConta(alvo.id);
  registrarEvento(
    {
      tipo: 'SESSOES_ENCERRADAS',
      resultado: 'SUCESSO',
      conta: autorDaConta(ator),
      alvo: alvoDaConta(alvo),
      motivo: `${quantidade} ${quantidade === 1 ? 'sessão encerrada' : 'sessões encerradas'}.`,
    },
    agora,
  );
  return ok(dto(contaPorId(alvo.id) ?? alvo, agora));
}

export function desbloquearConta(
  _requisicao: RequisicaoTransporte,
  agora: Date,
  parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const ator = contexto.conta;
  if (!ator) return semAcessoAutenticado();
  const alvo = contaPorId(parametros.id ?? '');
  if (!alvo) return contaInexistente();
  limparTentativasDeLogin(alvo.email);
  registrarEvento({ tipo: 'CONTA_DESBLOQUEADA', resultado: 'SUCESSO', conta: autorDaConta(ator), alvo: alvoDaConta(alvo) }, agora);
  return ok(dto(contaPorId(alvo.id) ?? alvo, agora));
}

