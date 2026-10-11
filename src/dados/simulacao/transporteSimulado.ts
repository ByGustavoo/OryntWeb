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
import { buscarUsuarioAtual, entrar, esperaDoAcesso, sair, sairDoAcessoSimulado } from './manipuladores/autenticacao';
import {
  ativarConexao,
  buscarConexaoAtual,
  criarConexao,
  encerrarConexao,
  esperaDaTentativa,
  excluirConexao,
  listarConexoes,
  renomearConexao,
  testarConexao,
} from './manipuladores/conexoes';
import { buscarAtividade, buscarConsultas, buscarIndicadores } from './manipuladores/dashboard';
import { buscarVersao } from './manipuladores/sistema';
import { rotaInexistente, servicoIndisponivel } from './resposta';
import { encerrarSessaoSimulada } from './sessaoSimulada';

interface Rota {
  metodo: MetodoHttp;
  caminho: string;
  manipulador: (requisicao: RequisicaoTransporte, agora: Date, parametros: Record<string, string>) => RespostaTransporte;
  espera?: () => number;
}

interface RotaEncontrada {
  rota: Rota;
  parametros: Record<string, string>;
}

const MARCA_PARAMETRO = ':';

const LATENCIA_MINIMA_MS = 200;
const LATENCIA_MAXIMA_MS = 500;

const rotas: Rota[] = [
  { metodo: 'POST', caminho: rotasApi.autenticacao.sessao, manipulador: entrar, espera: esperaDoAcesso },
  { metodo: 'GET', caminho: rotasApi.autenticacao.sessao, manipulador: buscarUsuarioAtual },
  { metodo: 'DELETE', caminho: rotasApi.autenticacao.sessao, manipulador: sair },
  { metodo: 'POST', caminho: rotasApi.conexoes.teste, manipulador: testarConexao, espera: esperaDaTentativa },
  { metodo: 'POST', caminho: rotasApi.conexoes.lista, manipulador: criarConexao, espera: esperaDaTentativa },
  { metodo: 'GET', caminho: rotasApi.conexoes.lista, manipulador: listarConexoes },
  { metodo: 'GET', caminho: rotasApi.conexoes.atual, manipulador: buscarConexaoAtual },
  { metodo: 'DELETE', caminho: rotasApi.conexoes.atual, manipulador: encerrarConexao },
  {
    metodo: 'POST',
    caminho: rotasApi.conexoes.ativacao(`${MARCA_PARAMETRO}id`),
    manipulador: ativarConexao,
    espera: esperaDaTentativa,
  },
  { metodo: 'PATCH', caminho: rotasApi.conexoes.salva(`${MARCA_PARAMETRO}id`), manipulador: renomearConexao },
  { metodo: 'DELETE', caminho: rotasApi.conexoes.salva(`${MARCA_PARAMETRO}id`), manipulador: excluirConexao },
  { metodo: 'GET', caminho: rotasApi.dashboard.indicadores, manipulador: buscarIndicadores },
  { metodo: 'GET', caminho: rotasApi.dashboard.atividade, manipulador: buscarAtividade },
  { metodo: 'GET', caminho: rotasApi.dashboard.consultas, manipulador: buscarConsultas },
  { metodo: 'GET', caminho: rotasApi.sistema.versao, manipulador: buscarVersao },
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

function atender(requisicao: RequisicaoTransporte, encontrada: RotaEncontrada | undefined): RespostaTransporte {
  if (deveFalhar(requisicao.caminho)) return servicoIndisponivel('Falha simulada pelo modo de desenvolvimento.');
  if (!encontrada) return rotaInexistente(`Rota ${requisicao.metodo} ${requisicao.caminho} não existe no simulador.`);
  return encontrada.rota.manipulador(requisicao, new Date(), encontrada.parametros);
}

export const transporteSimulado: Transporte = async (requisicao) => {
  const encontrada = encontrarRota(requisicao);
  await esperar(latenciaDaRota(encontrada?.rota), requisicao.signal);
  return completarErro(atender(requisicao, encontrada), requisicao.caminho);
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
