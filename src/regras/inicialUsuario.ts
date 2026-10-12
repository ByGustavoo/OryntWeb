import type { UsuarioDTO } from '@/modelos/autenticacao';

const PRIMEIRA_LETRA_OU_NUMERO = /[\p{L}\p{N}]/u;
const INICIAL_DESCONHECIDA = '?';

export function inicialDoUsuario(usuario: Pick<UsuarioDTO, 'nome' | 'email'>): string {
  const inicial = PRIMEIRA_LETRA_OU_NUMERO.exec(usuario.nome)?.[0] ?? PRIMEIRA_LETRA_OU_NUMERO.exec(usuario.email)?.[0];
  return inicial ? inicial.toLocaleUpperCase('pt-BR') : INICIAL_DESCONHECIDA;
}
