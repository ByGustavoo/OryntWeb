import type { RequisicaoTransporte, RespostaTransporte } from '@/api/transporte';
import { PROBLEMAS_CONEXAO } from '@/modelos/conexao';
import type { ConexaoDTO, TesteConexaoDTO } from '@/modelos/conexao';
import { ORDEM_CAMPOS, montarCredenciais, nomeSugerido, validarConexao } from '@/regras/validacaoConexao';
import type { CamposConexao } from '@/regras/validacaoConexao';
import { lerAcessoSimulado } from '../acessoSimulado';
import { lerCenarioConexao } from '../controles';
import { criado, dadosInvalidos, naoAutorizado, ok, problema, semConteudo } from '../resposta';
import { encerrarSessaoSimulada, gravarSessaoSimulada, lerSessaoSimulada } from '../sessaoSimulada';
import { acessoNaoAutenticado } from './autenticacao';

const VERSAO_SERVIDOR_SIMULADA = 'PostgreSQL 16.4';
const LATENCIA_TESTE_SIMULADA_MS = 38;
const ESPERA_MINIMA_MS = 900;
const ESPERA_MAXIMA_MS = 1600;
const ESPERA_TEMPO_ESGOTADO_MS = 5000;

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

function recusar(campos: CamposConexao): RespostaTransporte | null {
  const erros = validarConexao(campos);
  const errosCampos = ORDEM_CAMPOS.flatMap((campo) => {
    const mensagem = erros[campo];
    return mensagem ? [{ campo, mensagem }] : [];
  });
  if (errosCampos.length > 0) return dadosInvalidos(errosCampos);

  const { host, porta, banco, usuario } = montarCredenciais(campos);
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

export function esperaDaTentativa(): number {
  if (lerCenarioConexao() === 'TEMPO_ESGOTADO') return ESPERA_TEMPO_ESGOTADO_MS;
  return ESPERA_MINIMA_MS + Math.random() * (ESPERA_MAXIMA_MS - ESPERA_MINIMA_MS);
}

export function testarConexao(requisicao: RequisicaoTransporte): RespostaTransporte {
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
  const campos = camposDoCorpo(requisicao.corpo);
  const recusa = recusar(campos);
  if (recusa) return recusa;

  const { nome, host, porta, banco, usuario } = montarCredenciais(campos);
  const conexao: ConexaoDTO = {
    id: `simulada-${crypto.randomUUID().slice(0, 8)}`,
    tipoBanco: 'POSTGRESQL',
    nome: nome ?? nomeSugerido(banco, host),
    host,
    porta,
    banco,
    usuario,
    versaoServidor: VERSAO_SERVIDOR_SIMULADA,
    conectadaEm: agora.toISOString(),
    simulada: true,
  };
  gravarSessaoSimulada(conexao);
  return criado(conexao);
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
