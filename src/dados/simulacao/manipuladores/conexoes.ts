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
import { lerAcessoSimulado } from '../acessoSimulado';
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

export function testarConexao(requisicao: RequisicaoTransporte): RespostaTransporte {
  if (!lerAcessoSimulado()) return acessoNaoAutenticado();
  const recusa = recusar(camposDoCorpo(requisicao.corpo));
  if (recusa) return recusa;
  const teste: TesteConexaoDTO = {
    versaoServidor: VERSAO_SERVIDOR_SIMULADA,
    latenciaMs: LATENCIA_TESTE_SIMULADA_MS,
    simulado: true,
  };
  return ok(teste);
}

export function criarConexao(requisicao: RequisicaoTransporte, agora: Date): RespostaTransporte {
  if (!lerAcessoSimulado()) return acessoNaoAutenticado();
  const campos = camposDoCorpo(requisicao.corpo);
  const recusa = recusar(campos);
  if (recusa) return recusa;

  const { nome, host, porta, banco, usuario } = montarCredenciais(campos);
  const salvas = lerConexoesSalvasSimuladas();
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
  gravarConexoesSalvasSimuladas(registrarConexaoSalva(salvas, salva));
  return criado(abrirSessao(salva, agora));
}

export function listarConexoes(): RespostaTransporte {
  if (!lerAcessoSimulado()) return acessoNaoAutenticado();
  return ok(lerConexoesSalvasSimuladas());
}

export function ativarConexao(_requisicao: RequisicaoTransporte, agora: Date, parametros: Parametros): RespostaTransporte {
  if (!lerAcessoSimulado()) return acessoNaoAutenticado();
  const salvas = lerConexoesSalvasSimuladas();
  const salva = salvas.find((item) => item.id === parametros.id);
  if (!salva) return conexaoInexistente();
  const recusa = recusarPeloCenario(salva);
  if (recusa) return recusa;

  const usada: ConexaoSalvaDTO = { ...salva, ultimoUsoEm: agora.toISOString() };
  gravarConexoesSalvasSimuladas(registrarConexaoSalva(salvas, usada));
  return ok(abrirSessao(usada, agora));
}

export function renomearConexao(requisicao: RequisicaoTransporte, _agora: Date, parametros: Parametros): RespostaTransporte {
  if (!lerAcessoSimulado()) return acessoNaoAutenticado();
  const salvas = lerConexoesSalvasSimuladas();
  const salva = salvas.find((item) => item.id === parametros.id);
  if (!salva) return conexaoInexistente();

  const nome = camposDoCorpo(requisicao.corpo).nome;
  const erro = validarNomeConexaoSalva(nome);
  if (erro) return dadosInvalidos([{ campo: 'nome', mensagem: erro }]);

  const renomeada: ConexaoSalvaDTO = { ...salva, nome: nome.trim() };
  gravarConexoesSalvasSimuladas(renomearConexaoSalva(salvas, salva.id, renomeada.nome));
  const sessao = lerSessaoSimulada();
  if (sessao?.id === salva.id) gravarSessaoSimulada({ ...sessao, nome: renomeada.nome });
  return ok(renomeada);
}

export function excluirConexao(_requisicao: RequisicaoTransporte, _agora: Date, parametros: Parametros): RespostaTransporte {
  if (!lerAcessoSimulado()) return acessoNaoAutenticado();
  const salvas = lerConexoesSalvasSimuladas();
  const salva = salvas.find((item) => item.id === parametros.id);
  if (!salva) return conexaoInexistente();

  gravarConexoesSalvasSimuladas(removerConexaoSalva(salvas, salva.id));
  if (lerSessaoSimulada()?.id === salva.id) encerrarSessaoSimulada();
  return semConteudo();
}

export function buscarConexaoAtual(): RespostaTransporte {
  if (!lerAcessoSimulado()) return acessoNaoAutenticado();
  const conexao = lerSessaoSimulada();
  return conexao ? ok(conexao) : naoAutorizado();
}

export function encerrarConexao(): RespostaTransporte {
  encerrarSessaoSimulada();
  return semConteudo();
}
