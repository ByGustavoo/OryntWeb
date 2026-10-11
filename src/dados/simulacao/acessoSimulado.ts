import type { UsuarioDTO } from '@/modelos/autenticacao';

const NOME_COOKIE = 'orynt_acesso_simulado';
const ATRIBUTOS_COOKIE = 'path=/; SameSite=Strict';

function temFormatoDeUsuario(valor: unknown): valor is UsuarioDTO {
  if (!valor || typeof valor !== 'object') return false;
  const bruto = valor as Record<string, unknown>;
  return typeof bruto.id === 'string' && typeof bruto.nome === 'string' && typeof bruto.email === 'string';
}

export function lerAcessoSimulado(): UsuarioDTO | null {
  const prefixo = `${NOME_COOKIE}=`;
  const par = document.cookie.split('; ').find((item) => item.startsWith(prefixo));
  if (!par) return null;
  try {
    const valor: unknown = JSON.parse(decodeURIComponent(par.slice(prefixo.length)));
    return temFormatoDeUsuario(valor) ? valor : null;
  } catch {
    return null;
  }
}

export function gravarAcessoSimulado(usuario: UsuarioDTO): void {
  document.cookie = `${NOME_COOKIE}=${encodeURIComponent(JSON.stringify(usuario))}; ${ATRIBUTOS_COOKIE}`;
}

export function encerrarAcessoSimulado(): void {
  document.cookie = `${NOME_COOKIE}=; max-age=0; ${ATRIBUTOS_COOKIE}`;
}
