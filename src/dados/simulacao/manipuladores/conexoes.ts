import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { PROBLEMAS_CONEXAO } from '@/modelos/conexao';
import type { ConexaoDTO, ConexaoSalvaDTO, TesteConexaoDTO } from '@/modelos/conexao';
import {
  mesmaConexao,
  registrarConexaoSalva,
  removerConexaoSalva,
  renomearConexaoSalva,
  validarNomeConexaoSalva,
} from '@/regras/conexoesSalvas';
import type { AlvoConexao } from '@/regras/falhaConexao';
import { ORDEM_CAMPOS, montarCredenciais, nomeSugerido, validarConexao } from '@/regras/validacaoConexao';
import type { CamposConexao } from '@/regras/validacaoConexao';
import type { AlvoAuditoriaDTO } from '@/modelos/administracao';
import type { NovoEvento } from '../auditoriaSimulada';
import { registrarEvento } from '../auditoriaSimulada';
import type { ContextoSimulado } from '../autorizacaoSimulada';
import { atualizarConexaoNosAgendamentos, desvincularConexaoDosAgendamentos } from '../backup';
import { autorDaConta } from '../contasSimuladas';
import { gravarConexoesSalvasSimuladas, lerConexoesSalvasSimuladas } from '../conexoesSalvasSimuladas';
import { lerCenarioConexao } from '../controles';
import { criado, dadosInvalidos, naoAutorizado, ok, problema, rotaInexistente, semConteudo } from '../resposta';
import { encerrarSessaoSimulada, gravarSessaoSimulada, lerSessaoSimulada } from '../sessaoSimulada';
import { acessoNaoAutenticado } from './autenticacao';

const VERSAO_SERVIDOR_SIMULADA = 'PostgreSQL 16.4';
const LATENCIA_TESTE_SIMULADA_MS = 38;
const ESPERA_MINIMA_MS = 900;
const ESPERA_MAXIMA_MS = 1600;
const ESPERA_TEMPO_ESGOTADO_MS = 5000;
const SENHA_GUARDADA_PELA_API = 'guardada-pela-api';

type Parametros = Record<string, string>;

function texto(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  return typeof valor === 'number' ? String(valor) : '';
}

function camposDoCorpo(corpo: unknown): CamposConexao {
  const bruto = corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : {};
  return {
    nome: texto(bruto.nome),
    host: texto(bruto.host),
    porta: texto(bruto.porta),
    banco: texto(bruto.banco),
    usuario: texto(bruto.usuario),
    senha: texto(bruto.senha),
  };
}

function recusarCampos(campos: CamposConexao): RespostaTransporte | null {
  const erros = validarConexao(campos);
  const errosCampos = ORDEM_CAMPOS.flatMap((campo) => {
    const mensagem = erros[campo];
    return mensagem ? [{ campo, mensagem }] : [];
  });
  return errosCampos.length > 0 ? dadosInvalidos(errosCampos) : null;
}

function recusarPeloCenario({ host, porta, banco, usuario }: AlvoConexao): RespostaTransporte | null {
  switch (lerCenarioConexao()) {
    case 'SENHA_INCORRETA':
      return problema(
        422,
        'Autenticação recusada!',
        PROBLEMAS_CONEXAO.autenticacao,
        `password authentication failed for user "${usuario}"`,
      );
    case 'SERVIDOR_INACESSIVEL':
      return problema(
        502,
        'Servidor inacessível!',
        PROBLEMAS_CONEXAO.servidorInacessivel,
        `connection to server at "${host}", port ${porta} failed: Connection refused`,
      );
    case 'BANCO_INEXISTENTE':
      return problema(422, 'Banco inexistente!', PROBLEMAS_CONEXAO.bancoInexistente, `database "${banco}" does not exist`);
    case 'TEMPO_ESGOTADO':
      return problema(504, 'Tempo esgotado!', PROBLEMAS_CONEXAO.tempoEsgotado, 'timeout expired');
    case 'SUCESSO':
      return null;
  }
}

function recusar(campos: CamposConexao): RespostaTransporte | null {
  return recusarCampos(campos) ?? recusarPeloCenario(montarCredenciais(campos));
}

function conexaoInexistente(): RespostaTransporte {
  return rotaInexistente('A conexão não existe mais. Ela pode ter sido excluída em outra tela.');
}

function abrirSessao(salva: ConexaoSalvaDTO, agora: Date): ConexaoDTO {
  const conexao: ConexaoDTO = {
    id: salva.id,
    tipoBanco: salva.tipoBanco,
    nome: salva.nome,
    host: salva.host,
    porta: salva.porta,
    banco: salva.banco,
    usuario: salva.usuario,
    versaoServidor: VERSAO_SERVIDOR_SIMULADA,
    conectadaEm: agora.toISOString(),
    simulada: true,
  };
  gravarSessaoSimulada(conexao);
  return conexao;
}

export function esperaDaTentativa(): number {
  if (lerCenarioConexao() === 'TEMPO_ESGOTADO') return ESPERA_TEMPO_ESGOTADO_MS;
  return ESPERA_MINIMA_MS + Math.random() * (ESPERA_MAXIMA_MS - ESPERA_MINIMA_MS);
}

function alvoDaConexao(salva: Pick<ConexaoSalvaDTO, 'id' | 'nome' | 'banco' | 'host'>): AlvoAuditoriaDTO {
  return { tipo: 'CONEXAO', id: salva.id, rotulo: `${salva.nome} (${salva.banco} em ${salva.host})` };
}

function registrarNaConta(contexto: ContextoSimulado, evento: Omit<NovoEvento, 'conta'>, agora: Date): void {
  if (contexto.conta) registrarEvento({ ...evento, conta: autorDaConta(contexto.conta) }, agora);
}

function motivoDaRecusa(recusa: RespostaTransporte): string | null {
  const corpo = recusa.corpo as { detail?: unknown } | undefined;
  return typeof corpo?.detail === 'string' ? corpo.detail : null;
}

export function testarConexao(
  requisicao: RequisicaoTransporte,
  _agora: Date,
  _parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  if (!contexto.conta) return acessoNaoAutenticado();
  const recusa = recusar(camposDoCorpo(requisicao.corpo));
  if (recusa) return recusa;
  const teste: TesteConexaoDTO = {
    versaoServidor: VERSAO_SERVIDOR_SIMULADA,
    latenciaMs: LATENCIA_TESTE_SIMULADA_MS,
    simulado: true,
  };
  return ok(teste);
}

export function criarConexao(
  requisicao: RequisicaoTransporte,
  agora: Date,
  _parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return acessoNaoAutenticado();
  const campos = camposDoCorpo(requisicao.corpo);
  const recusaDosCampos = recusarCampos(campos);
  if (recusaDosCampos) return recusaDosCampos;

  const { nome, host, porta, banco, usuario } = montarCredenciais(campos);
  const salvas = lerConexoesSalvasSimuladas(conta.id);
  const existente = salvas.find((item) => mesmaConexao(item, { host, porta, banco, usuario }));
  const salva: ConexaoSalvaDTO = {
    id: existente?.id ?? `simulada-${crypto.randomUUID().slice(0, 8)}`,
    tipoBanco: 'POSTGRESQL',
    nome: nome ?? nomeSugerido(banco, host),
    host,
    porta,
    banco,
    usuario,
    ultimoUsoEm: agora.toISOString(),
  };

  const recusa = recusarPeloCenario({ host, porta, banco, usuario });
  if (recusa) {
    registrarNaConta(
      contexto,
      { tipo: 'CONEXAO_CRIADA', resultado: 'FALHA', alvo: alvoDaConexao(salva), motivo: motivoDaRecusa(recusa) },
      agora,
    );
    return recusa;
  }

  gravarConexoesSalvasSimuladas(conta.id, registrarConexaoSalva(salvas, salva));
  registrarNaConta(
    contexto,
    { tipo: existente ? 'CONEXAO_ATIVADA' : 'CONEXAO_CRIADA', resultado: 'SUCESSO', alvo: alvoDaConexao(salva) },
    agora,
  );
  return criado(abrirSessao(salva, agora));
}

export function salvarConexao(
  requisicao: RequisicaoTransporte,
  agora: Date,
  _parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return acessoNaoAutenticado();
  const campos = camposDoCorpo(requisicao.corpo);
  const recusaDosCampos = recusarCampos(campos);
  if (recusaDosCampos) return recusaDosCampos;

  const { nome, host, porta, banco, usuario } = montarCredenciais(campos);
  const salvas = lerConexoesSalvasSimuladas(conta.id);
  const existente = salvas.find((item) => mesmaConexao(item, { host, porta, banco, usuario }));
  const salva: ConexaoSalvaDTO = {
    id: existente?.id ?? `simulada-${crypto.randomUUID().slice(0, 8)}`,
    tipoBanco: 'POSTGRESQL',
    nome: nome ?? existente?.nome ?? nomeSugerido(banco, host),
    host,
    porta,
    banco,
    usuario,
    ultimoUsoEm: existente?.ultimoUsoEm ?? null,
  };

  const recusa = recusarPeloCenario({ host, porta, banco, usuario });
  if (recusa) {
    registrarNaConta(contexto, { tipo: 'CONEXAO_SALVA', resultado: 'FALHA', alvo: alvoDaConexao(salva), motivo: motivoDaRecusa(recusa) }, agora);
    return recusa;
  }

  gravarConexoesSalvasSimuladas(conta.id, registrarConexaoSalva(salvas, salva));
  atualizarConexaoNosAgendamentos(conta.id, salva);
  registrarNaConta(contexto, { tipo: 'CONEXAO_SALVA', resultado: 'SUCESSO', alvo: alvoDaConexao(salva) }, agora);
  return criado(salva);
}

function camposDaEdicao(corpo: unknown): CamposConexao {
  const campos = camposDoCorpo(corpo);
  return campos.senha ? campos : { ...campos, senha: SENHA_GUARDADA_PELA_API };
}

export function editarConexao(
  requisicao: RequisicaoTransporte,
  agora: Date,
  parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return acessoNaoAutenticado();
  const salvas = lerConexoesSalvasSimuladas(conta.id);
  const salva = salvas.find((item) => item.id === parametros.id);
  if (!salva) return conexaoInexistente();

  const campos = camposDaEdicao(requisicao.corpo);
  const recusaDosCampos = recusarCampos(campos);
  if (recusaDosCampos) return recusaDosCampos;

  const { nome, host, porta, banco, usuario } = montarCredenciais(campos);
  if (salvas.some((item) => item.id !== salva.id && mesmaConexao(item, { host, porta, banco, usuario }))) {
    return dadosInvalidos([{ campo: 'banco', mensagem: 'Já existe outra conexão com este servidor, banco e usuário.' }]);
  }
  const recusa = recusarPeloCenario({ host, porta, banco, usuario });
  if (recusa) return recusa;

  const editada: ConexaoSalvaDTO = { ...salva, nome: nome ?? nomeSugerido(banco, host), host, porta, banco, usuario };
  gravarConexoesSalvasSimuladas(conta.id, salvas.map((item) => (item.id === salva.id ? editada : item)));
  atualizarConexaoNosAgendamentos(conta.id, editada);
  const sessao = lerSessaoSimulada();
  if (sessao?.id === salva.id) gravarSessaoSimulada({ ...sessao, nome: editada.nome, host, porta, banco, usuario });
  registrarNaConta(
    contexto,
    {
      tipo: 'CONEXAO_EDITADA',
      resultado: 'SUCESSO',
      alvo: alvoDaConexao(editada),
      mudancas: [
        { campo: 'Nome', antes: salva.nome, depois: editada.nome },
        { campo: 'Servidor', antes: `${salva.host}:${salva.porta}`, depois: `${host}:${porta}` },
        { campo: 'Banco', antes: salva.banco, depois: banco },
        { campo: 'Usuário', antes: salva.usuario, depois: usuario },
      ].filter((mudanca) => mudanca.antes !== mudanca.depois),
    },
    agora,
  );
  return ok(editada);
}

export function testarConexaoSalva(
  requisicao: RequisicaoTransporte,
  _agora: Date,
  parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return acessoNaoAutenticado();
  const salva = lerConexoesSalvasSimuladas(conta.id).find((item) => item.id === parametros.id);
  if (!salva) return conexaoInexistente();
  const recusa = requisicao.corpo ? recusar(camposDaEdicao(requisicao.corpo)) : recusarPeloCenario(salva);
  if (recusa) return recusa;
  const teste: TesteConexaoDTO = { versaoServidor: VERSAO_SERVIDOR_SIMULADA, latenciaMs: LATENCIA_TESTE_SIMULADA_MS, simulado: true };
  return ok(teste);
}

export function listarConexoes(
  _requisicao: RequisicaoTransporte,
  _agora: Date,
  _parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  if (!contexto.conta) return acessoNaoAutenticado();
  return ok(lerConexoesSalvasSimuladas(contexto.conta.id));
}

export function ativarConexao(
  _requisicao: RequisicaoTransporte,
  agora: Date,
  parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return acessoNaoAutenticado();
  const salvas = lerConexoesSalvasSimuladas(conta.id);
  const salva = salvas.find((item) => item.id === parametros.id);
  if (!salva) return conexaoInexistente();
  const recusa = recusarPeloCenario(salva);
  if (recusa) {
    registrarNaConta(
      contexto,
      { tipo: 'CONEXAO_ATIVADA', resultado: 'FALHA', alvo: alvoDaConexao(salva), motivo: motivoDaRecusa(recusa) },
      agora,
    );
    return recusa;
  }

  const usada: ConexaoSalvaDTO = { ...salva, ultimoUsoEm: agora.toISOString() };
  gravarConexoesSalvasSimuladas(conta.id, registrarConexaoSalva(salvas, usada));
  registrarNaConta(contexto, { tipo: 'CONEXAO_ATIVADA', resultado: 'SUCESSO', alvo: alvoDaConexao(usada) }, agora);
  return ok(abrirSessao(usada, agora));
}

export function renomearConexao(
  requisicao: RequisicaoTransporte,
  agora: Date,
  parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return acessoNaoAutenticado();
  const salvas = lerConexoesSalvasSimuladas(conta.id);
  const salva = salvas.find((item) => item.id === parametros.id);
  if (!salva) return conexaoInexistente();

  const nome = camposDoCorpo(requisicao.corpo).nome;
  const erro = validarNomeConexaoSalva(nome);
  if (erro) return dadosInvalidos([{ campo: 'nome', mensagem: erro }]);

  const renomeada: ConexaoSalvaDTO = { ...salva, nome: nome.trim() };
  gravarConexoesSalvasSimuladas(conta.id, renomearConexaoSalva(salvas, salva.id, renomeada.nome));
  atualizarConexaoNosAgendamentos(conta.id, renomeada);
  const sessao = lerSessaoSimulada();
  if (sessao?.id === salva.id) gravarSessaoSimulada({ ...sessao, nome: renomeada.nome });
  registrarNaConta(
    contexto,
    {
      tipo: 'CONEXAO_RENOMEADA',
      resultado: 'SUCESSO',
      alvo: alvoDaConexao(renomeada),
      mudancas: [{ campo: 'Nome', antes: salva.nome, depois: renomeada.nome }],
    },
    agora,
  );
  return ok(renomeada);
}

export function excluirConexao(
  _requisicao: RequisicaoTransporte,
  agora: Date,
  parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const conta = contexto.conta;
  if (!conta) return acessoNaoAutenticado();
  const salvas = lerConexoesSalvasSimuladas(conta.id);
  const salva = salvas.find((item) => item.id === parametros.id);
  if (!salva) return conexaoInexistente();

  gravarConexoesSalvasSimuladas(conta.id, removerConexaoSalva(salvas, salva.id));
  desvincularConexaoDosAgendamentos(conta.id, salva.id, agora);
  if (lerSessaoSimulada()?.id === salva.id) encerrarSessaoSimulada();
  registrarNaConta(contexto, { tipo: 'CONEXAO_EXCLUIDA', resultado: 'SUCESSO', alvo: alvoDaConexao(salva) }, agora);
  return semConteudo();
}

export function buscarConexaoAtual(
  _requisicao: RequisicaoTransporte,
  _agora: Date,
  _parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  if (!contexto.conta) return acessoNaoAutenticado();
  const conexao = lerSessaoSimulada();
  return conexao ? ok(conexao) : naoAutorizado();
}

export function encerrarConexao(
  _requisicao: RequisicaoTransporte,
  agora: Date,
  _parametros: Parametros,
  contexto: ContextoSimulado,
): RespostaTransporte {
  const conexao = lerSessaoSimulada();
  encerrarSessaoSimulada();
  if (conexao) registrarNaConta(contexto, { tipo: 'CONEXAO_ENCERRADA', resultado: 'SUCESSO', alvo: alvoDaConexao(conexao) }, agora);
  return semConteudo();
}
