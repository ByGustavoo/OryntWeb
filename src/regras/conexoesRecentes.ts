import type { ConexaoRecente } from '@/modelos/conexao';

export const MAXIMO_CONEXOES_RECENTES = 5;

export type DadosConexaoRecente = Omit<ConexaoRecente, 'usadaEm'>;

export function mesmaConexao(a: DadosConexaoRecente, b: DadosConexaoRecente): boolean {
  return (
    a.host.toLowerCase() === b.host.toLowerCase() && a.porta === b.porta && a.banco === b.banco && a.usuario === b.usuario
  );
}

export function registrarConexaoRecente(
  lista: ConexaoRecente[],
  conexao: DadosConexaoRecente,
  agora: Date,
): ConexaoRecente[] {
  const nova: ConexaoRecente = {
    nome: conexao.nome,
    host: conexao.host,
    porta: conexao.porta,
    banco: conexao.banco,
    usuario: conexao.usuario,
    usadaEm: agora.toISOString(),
  };
  return [nova, ...lista.filter((item) => !mesmaConexao(item, conexao))].slice(0, MAXIMO_CONEXOES_RECENTES);
}

export function removerConexaoRecente(lista: ConexaoRecente[], conexao: DadosConexaoRecente): ConexaoRecente[] {
  return lista.filter((item) => !mesmaConexao(item, conexao));
}

function temFormatoDeConexaoRecente(item: unknown): item is ConexaoRecente {
  if (!item || typeof item !== 'object') return false;
  const bruto = item as Record<string, unknown>;
  return (
    typeof bruto.host === 'string' &&
    typeof bruto.porta === 'number' &&
    typeof bruto.banco === 'string' &&
    typeof bruto.usuario === 'string' &&
    typeof bruto.usadaEm === 'string' &&
    (bruto.nome === null || typeof bruto.nome === 'string')
  );
}

export function lerConexoesRecentes(valor: unknown): ConexaoRecente[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter(temFormatoDeConexaoRecente)
    .map(({ nome, host, porta, banco, usuario, usadaEm }) => ({ nome, host, porta, banco, usuario, usadaEm }))
    .slice(0, MAXIMO_CONEXOES_RECENTES);
}
