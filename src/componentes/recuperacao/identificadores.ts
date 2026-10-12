import type { CampoRecuperacao } from '@/regras/recuperacaoSenha';

export function idCampoRecuperacao(campo: CampoRecuperacao): string {
  return `recuperacao-${campo}`;
}

export function focarCampoRecuperacao(campo: CampoRecuperacao): void {
  document.getElementById(idCampoRecuperacao(campo))?.focus();
}
