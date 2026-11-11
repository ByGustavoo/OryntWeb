import { PREFIXO_ARMAZENAMENTO } from '@/configuracoes/aplicacao';
import type { CodigoTela } from '@/modelos/telas';
import { ehCodigoTela, normalizarTelas } from '@/regras/telasOcultas';

const CHAVE_TELAS_OCULTAS = `${PREFIXO_ARMAZENAMENTO}simulacao:telas-ocultas`;

type TelasPorConta = Record<string, CodigoTela[]>;

function lerTodas(): TelasPorConta {
  try {
    const salvo: unknown = JSON.parse(window.localStorage.getItem(CHAVE_TELAS_OCULTAS) ?? '{}');
    if (!salvo || typeof salvo !== 'object' || Array.isArray(salvo)) return {};
    const resultado: TelasPorConta = {};
    for (const [conta, lista] of Object.entries(salvo as Record<string, unknown>)) {
      resultado[conta] = Array.isArray(lista) ? normalizarTelas(lista.filter(ehCodigoTela)) : [];
    }
    return resultado;
  } catch {
    return {};
  }
}

function gravarTodas(todas: TelasPorConta): void {
  try {
    window.localStorage.setItem(CHAVE_TELAS_OCULTAS, JSON.stringify(todas));
  } catch {
    return;
  }
}

export function lerTelasOcultasSimuladas(conta: string): CodigoTela[] {
  return lerTodas()[conta] ?? [];
}

export function gravarTelasOcultasSimuladas(conta: string, telas: readonly CodigoTela[]): CodigoTela[] {
  const normalizadas = normalizarTelas(telas);
  gravarTodas({ ...lerTodas(), [conta]: normalizadas });
  return normalizadas;
}

export function removerTelasOcultasDaConta(conta: string): void {
  const todas = lerTodas();
  if (!(conta in todas)) return;
  delete todas[conta];
  gravarTodas(todas);
}
