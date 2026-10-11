import { rotasApi } from '@/api/rotasApi';
import type { MetodoHttp, RequisicaoTransporte, RespostaTransporte, Transporte } from '@/api/transporte';
import { ambiente } from '@/configuracoes/ambiente';
import {
  definirCenarioConexao,
  definirDadosVazios,
  definirFalhas,
  definirLatencia,
  deveFalhar,
  latenciaConfigurada,
} from './controles';
import { buscarUsuarioAtual, entrar, esperaDoAcesso, sairDoAcessoSimulado } from './manipuladores/autenticacao';
import { buscarConexaoAtual, criarConexao, encerrarConexao, esperaDaTentativa, testarConexao } from './manipuladores/conexoes';
import { buscarAtividade, buscarConsultas, buscarIndicadores } from './manipuladores/dashboard';
import { rotaInexistente, servicoIndisponivel } from './resposta';
import { encerrarSessaoSimulada } from './sessaoSimulada';

interface Rota {
  metodo: MetodoHttp;
  caminho: string;
  manipulador: (requisicao: RequisicaoTransporte, agora: Date) => RespostaTransporte;
  espera?: () => number;
}

const LATENCIA_MINIMA_MS = 200;
const LATENCIA_MAXIMA_MS = 500;

const rotas: Rota[] = [
  { metodo: 'POST', caminho: rotasApi.autenticacao.sessao, manipulador: entrar, espera: esperaDoAcesso },
  { metodo: 'GET', caminho: rotasApi.autenticacao.sessao, manipulador: buscarUsuarioAtual },
  { metodo: 'POST', caminho: rotasApi.conexoes.teste, manipulador: testarConexao, espera: esperaDaTentativa },
  { metodo: 'POST', caminho: rotasApi.conexoes.lista, manipulador: criarConexao, espera: esperaDaTentativa },
  { metodo: 'GET', caminho: rotasApi.conexoes.atual, manipulador: buscarConexaoAtual },
  { metodo: 'DELETE', caminho: rotasApi.conexoes.atual, manipulador: encerrarConexao },
  { metodo: 'GET', caminho: rotasApi.dashboard.indicadores, manipulador: buscarIndicadores },
  { metodo: 'GET', caminho: rotasApi.dashboard.atividade, manipulador: buscarAtividade },
  { metodo: 'GET', caminho: rotasApi.dashboard.consultas, manipulador: buscarConsultas },
];

function encontrarRota(requisicao: RequisicaoTransporte): Rota | undefined {
  return rotas.find((rota) => rota.metodo === requisicao.metodo && rota.caminho === requisicao.caminho);
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

function atender(requisicao: RequisicaoTransporte, rota: Rota | undefined): RespostaTransporte {
  if (deveFalhar(requisicao.caminho)) return servicoIndisponivel('Falha simulada pelo modo de desenvolvimento.');
  if (!rota) return rotaInexistente(`Rota ${requisicao.metodo} ${requisicao.caminho} não existe no simulador.`);
  return rota.manipulador(requisicao, new Date());
}

export const transporteSimulado: Transporte = async (requisicao) => {
  const rota = encontrarRota(requisicao);
  await esperar(latenciaDaRota(rota), requisicao.signal);
  return completarErro(atender(requisicao, rota), requisicao.caminho);
};

if (ambiente.desenvolvimento) {
  Object.assign(window, {
    oryntSimulacao: {
      cenario: definirCenarioConexao,
      falhar: (caminhos: string | false = '*') => definirFalhas(caminhos),
      latencia: definirLatencia,
      esvaziar: (vazios = true) => definirDadosVazios(vazios),
      encerrarSessao: encerrarSessaoSimulada,
      sair: () => {
        sairDoAcessoSimulado();
        window.location.reload();
      },
    },
  });
}
