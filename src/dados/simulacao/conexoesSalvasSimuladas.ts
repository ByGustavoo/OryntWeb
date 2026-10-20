import { PREFIXO_ARMAZENAMENTO } from '@/configuracoes/aplicacao';
import type { ConexaoSalvaDTO } from '@/modelos/conexao';
import { lerConexoesSalvas } from '@/regras/conexoesSalvas';
import { ID_CONTA_DEMONSTRACAO } from './credenciaisDemonstracao';

const CHAVE_CONEXOES_SALVAS = `${PREFIXO_ARMAZENAMENTO}simulacao:conexoes-salvas`;

type ConexoesPorConta = Record<string, ConexaoSalvaDTO[]>;

function lerTodas(): ConexoesPorConta {
  try {
    const salvo: unknown = JSON.parse(window.localStorage.getItem(CHAVE_CONEXOES_SALVAS) ?? '{}');
    if (Array.isArray(salvo)) return { [ID_CONTA_DEMONSTRACAO]: lerConexoesSalvas(salvo) };
    if (!salvo || typeof salvo !== 'object') return {};
    const resultado: ConexoesPorConta = {};
    for (const [conta, lista] of Object.entries(salvo as Record<string, unknown>)) resultado[conta] = lerConexoesSalvas(lista);
    return resultado;
  } catch {
    return {};
  }
}

function gravarTodas(todas: ConexoesPorConta): void {
  try {
    window.localStorage.setItem(CHAVE_CONEXOES_SALVAS, JSON.stringify(todas));
  } catch {
    return;
  }
}

export function lerConexoesSalvasSimuladas(conta: string): ConexaoSalvaDTO[] {
  return lerTodas()[conta] ?? [];
}

export function gravarConexoesSalvasSimuladas(conta: string, lista: ConexaoSalvaDTO[]): void {
  gravarTodas({ ...lerTodas(), [conta]: lerConexoesSalvas(lista) });
}

export function removerConexoesDaConta(conta: string): number {
  const todas = lerTodas();
  const quantidade = todas[conta]?.length ?? 0;
  delete todas[conta];
  gravarTodas(todas);
  return quantidade;
}
