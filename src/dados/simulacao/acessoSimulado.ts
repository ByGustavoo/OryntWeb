const NOME_COOKIE = 'orynt_acesso_simulado';
const ATRIBUTOS_COOKIE = 'path=/; SameSite=Strict';

export interface AcessoSimulado {
  conta: string;
  sessao: string;
}

function temFormatoDeAcesso(valor: unknown): valor is AcessoSimulado {
  if (!valor || typeof valor !== 'object') return false;
  const bruto = valor as Record<string, unknown>;
  return typeof bruto.conta === 'string' && typeof bruto.sessao === 'string';
}

export function lerAcessoSimulado(): AcessoSimulado | null {
  const prefixo = `${NOME_COOKIE}=`;
  const par = document.cookie.split('; ').find((item) => item.startsWith(prefixo));
  if (!par) return null;
  try {
    const valor: unknown = JSON.parse(decodeURIComponent(par.slice(prefixo.length)));
    return temFormatoDeAcesso(valor) ? { conta: valor.conta, sessao: valor.sessao } : null;
  } catch {
    return null;
  }
}

export function gravarAcessoSimulado(acesso: AcessoSimulado): void {
  document.cookie = `${NOME_COOKIE}=${encodeURIComponent(JSON.stringify(acesso))}; ${ATRIBUTOS_COOKIE}`;
}

export function encerrarAcessoSimulado(): void {
  document.cookie = `${NOME_COOKIE}=; max-age=0; ${ATRIBUTOS_COOKIE}`;
}
