import type { ConexaoDTO } from '@/modelos/conexao';

const NOME_COOKIE = 'orynt_sessao_simulada';
const ATRIBUTOS_COOKIE = 'path=/; SameSite=Strict';

function temFormatoDeConexao(valor: unknown): valor is ConexaoDTO {
  if (!valor || typeof valor !== 'object') return false;
  const bruto = valor as Record<string, unknown>;
  return (
    typeof bruto.id === 'string' &&
    typeof bruto.nome === 'string' &&
    typeof bruto.host === 'string' &&
    typeof bruto.porta === 'number' &&
    typeof bruto.banco === 'string' &&
    typeof bruto.usuario === 'string' &&
    typeof bruto.conectadaEm === 'string'
  );
}

export function lerSessaoSimulada(): ConexaoDTO | null {
  const prefixo = `${NOME_COOKIE}=`;
  const par = document.cookie.split('; ').find((item) => item.startsWith(prefixo));
  if (!par) return null;
  try {
    const valor: unknown = JSON.parse(decodeURIComponent(par.slice(prefixo.length)));
    return temFormatoDeConexao(valor) ? valor : null;
  } catch {
    return null;
  }
}

export function gravarSessaoSimulada(conexao: ConexaoDTO): void {
  document.cookie = `${NOME_COOKIE}=${encodeURIComponent(JSON.stringify(conexao))}; ${ATRIBUTOS_COOKIE}`;
}

export function encerrarSessaoSimulada(): void {
  document.cookie = `${NOME_COOKIE}=; max-age=0; ${ATRIBUTOS_COOKIE}`;
}
