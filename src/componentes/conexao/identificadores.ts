import type { CampoConexao } from '@/regras/validacaoConexao';

export function idCampoConexao(campo: CampoConexao): string {
  return `conexao-${campo}`;
}

export function focarCampoConexao(campo: CampoConexao): void {
  document.getElementById(idCampoConexao(campo))?.focus();
}
