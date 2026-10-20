import { ambiente } from '@/configuracoes/ambiente';
import { ErroApi, tipoPorStatus } from './ErroApi';
import { lerErrorResponse, registrarErro } from './tratamentoErros';
import type { MetodoHttp, Transporte, ValorConsulta } from './transporte';
import { transporteFetch } from './transporteFetch';

export interface OpcoesRequisicao {
  consulta?: Record<string, ValorConsulta>;
  signal?: AbortSignal;
}

const TEMPO_LIMITE_MS = 15000;
const TIPO_ACESSO_PERDIDO = '/problems/unauthenticated';

const ouvintesDoAcessoPerdido = new Set<() => void>();

export function aoPerderOAcesso(ouvinte: () => void): () => void {
  ouvintesDoAcessoPerdido.add(ouvinte);
  return () => {
    ouvintesDoAcessoPerdido.delete(ouvinte);
  };
}

function avisarSeOAcessoFoiPerdido(falha: ErroApi): void {
  if (falha.status === 401 && falha.resposta?.type.endsWith(TIPO_ACESSO_PERDIDO)) {
    ouvintesDoAcessoPerdido.forEach((ouvinte) => ouvinte());
  }
}

let transporteCarregado: Promise<Transporte> | null = null;

function obterTransporte(): Promise<Transporte> {
  transporteCarregado ??=
    ambiente.fonteDados === 'simulada'
      ? import('@/dados/simulacao/transporteSimulado').then((modulo) => modulo.transporteSimulado)
      : Promise.resolve(transporteFetch);
  return transporteCarregado;
}

function erroDaResposta(status: number, corpo: unknown): ErroApi {
  const resposta = lerErrorResponse(corpo, status);
  const mensagem = resposta?.detail || resposta?.title || `Falha na requisição (${status}).`;
  return new ErroApi(tipoPorStatus(status), mensagem, status, resposta);
}

function normalizarFalha(erro: unknown, abortada: boolean, expirou: boolean): ErroApi {
  if (erro instanceof ErroApi) return erro;
  if (abortada) {
    return expirou
      ? new ErroApi('TEMPO_ESGOTADO', 'O servidor demorou demais para responder.')
      : new ErroApi('CANCELADO', 'A requisição foi cancelada.');
  }
  return new ErroApi('REDE', 'Não foi possível falar com o servidor.');
}

async function requisitar<T>(metodo: MetodoHttp, caminho: string, corpo: unknown, opcoes: OpcoesRequisicao = {}): Promise<T> {
  if (opcoes.signal?.aborted) throw new ErroApi('CANCELADO', 'A requisição foi cancelada.');

  const controlador = new AbortController();
  let expirou = false;
  const temporizador = window.setTimeout(() => {
    expirou = true;
    controlador.abort();
  }, TEMPO_LIMITE_MS);
  const cancelarExterno = () => controlador.abort();
  opcoes.signal?.addEventListener('abort', cancelarExterno, { once: true });

  try {
    const transporte = await obterTransporte();
    const resposta = await transporte({
      metodo,
      caminho,
      consulta: opcoes.consulta ?? {},
      corpo,
      cabecalhos: {},
      signal: controlador.signal,
    });

    if (resposta.status >= 400) throw erroDaResposta(resposta.status, resposta.corpo);

    return resposta.corpo as T;
  } catch (erro) {
    const falha = normalizarFalha(erro, controlador.signal.aborted, expirou);
    registrarErro(falha, { metodo, caminho });
    avisarSeOAcessoFoiPerdido(falha);
    throw falha;
  } finally {
    window.clearTimeout(temporizador);
    opcoes.signal?.removeEventListener('abort', cancelarExterno);
  }
}

export const clienteHttp = {
  get: <T>(caminho: string, opcoes?: OpcoesRequisicao) => requisitar<T>('GET', caminho, undefined, opcoes),
  post: <T>(caminho: string, corpo?: unknown, opcoes?: OpcoesRequisicao) => requisitar<T>('POST', caminho, corpo, opcoes),
  put: <T>(caminho: string, corpo?: unknown, opcoes?: OpcoesRequisicao) => requisitar<T>('PUT', caminho, corpo, opcoes),
  patch: <T>(caminho: string, corpo?: unknown, opcoes?: OpcoesRequisicao) => requisitar<T>('PATCH', caminho, corpo, opcoes),
  delete: <T>(caminho: string, opcoes?: OpcoesRequisicao) => requisitar<T>('DELETE', caminho, undefined, opcoes),
};
