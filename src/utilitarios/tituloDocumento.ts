import { NOME_APLICACAO, SLOGAN_APLICACAO } from '@/configuracoes/aplicacao';

let tituloBase = '';
let tituloDestaque: string | null = null;

function aplicarTitulo(): void {
  const proximo = tituloDestaque
    ? `${tituloDestaque} · ${NOME_APLICACAO}`
    : tituloBase
      ? `${NOME_APLICACAO} · ${tituloBase}`
      : `${NOME_APLICACAO} · ${SLOGAN_APLICACAO}`;
  if (document.title !== proximo) document.title = proximo;
}

export function definirTituloBase(titulo: string): void {
  tituloBase = titulo;
  aplicarTitulo();
}

export function definirTituloDestaque(texto: string | null): void {
  if (tituloDestaque === texto) return;
  tituloDestaque = texto;
  aplicarTitulo();
}
