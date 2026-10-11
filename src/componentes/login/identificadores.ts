import type { CampoAcesso } from '@/regras/validacaoAcesso';

export function idCampoAcesso(campo: CampoAcesso): string {
  return `acesso-${campo}`;
}

export function focarCampoAcesso(campo: CampoAcesso): void {
  document.getElementById(idCampoAcesso(campo))?.focus();
}

export function selecionarCampoAcesso(campo: CampoAcesso): void {
  const controle = document.getElementById(idCampoAcesso(campo));
  if (!(controle instanceof HTMLInputElement)) return;
  controle.focus();
  controle.select();
}
