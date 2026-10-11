import { PREFIXO_ARMAZENAMENTO } from '@/configuracoes/aplicacao';
import type { ConexaoSalvaDTO } from '@/modelos/conexao';
import { lerConexoesSalvas } from '@/regras/conexoesSalvas';

const CHAVE_CONEXOES_SALVAS = `${PREFIXO_ARMAZENAMENTO}simulacao:conexoes-salvas`;

export function lerConexoesSalvasSimuladas(): ConexaoSalvaDTO[] {
  try {
    const salvo: unknown = JSON.parse(window.localStorage.getItem(CHAVE_CONEXOES_SALVAS) ?? '[]');
    return lerConexoesSalvas(salvo);
  } catch {
    return [];
  }
}

export function gravarConexoesSalvasSimuladas(lista: ConexaoSalvaDTO[]): void {
  try {
    window.localStorage.setItem(CHAVE_CONEXOES_SALVAS, JSON.stringify(lerConexoesSalvas(lista)));
  } catch {
    return;
  }
}
