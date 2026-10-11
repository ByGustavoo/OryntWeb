import type { CredenciaisAcessoDTO } from '@/modelos/autenticacao';

export interface CamposAcesso {
  email: string;
  senha: string;
}

export type CampoAcesso = keyof CamposAcesso;
export type ErrosAcesso = Partial<Record<CampoAcesso, string>>;

export const TAMANHO_MAXIMO_EMAIL = 254;

export const ORDEM_CAMPOS_ACESSO: CampoAcesso[] = ['email', 'senha'];

export const CAMPOS_ACESSO_INICIAIS: CamposAcesso = {
  email: '',
  senha: '',
};

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarEmail(valor: string): string | undefined {
  const email = valor.trim();
  if (!email) return 'Informe o seu e-mail.';
  if (email.length > TAMANHO_MAXIMO_EMAIL) return `O e-mail pode ter até ${TAMANHO_MAXIMO_EMAIL} caracteres.`;
  if (!EMAIL_VALIDO.test(email)) return 'Digite um e-mail completo, como voce@empresa.com.';
  return undefined;
}

export function validarCampoAcesso(campo: CampoAcesso, valor: string): string | undefined {
  switch (campo) {
    case 'email':
      return validarEmail(valor);
    case 'senha':
      return valor ? undefined : 'Informe a sua senha.';
  }
}

export function validarAcesso(campos: CamposAcesso): ErrosAcesso {
  const erros: ErrosAcesso = {};
  for (const campo of ORDEM_CAMPOS_ACESSO) {
    const erro = validarCampoAcesso(campo, campos[campo]);
    if (erro) erros[campo] = erro;
  }
  return erros;
}

export function primeiroCampoAcessoComErro(erros: ErrosAcesso): CampoAcesso | null {
  return ORDEM_CAMPOS_ACESSO.find((campo) => erros[campo]) ?? null;
}

export function montarCredenciaisAcesso(campos: CamposAcesso): CredenciaisAcessoDTO {
  return {
    email: campos.email.trim(),
    senha: campos.senha,
  };
}

export function mesmoEmail(primeiro: string, segundo: string): boolean {
  return primeiro.trim().toLowerCase() === segundo.trim().toLowerCase();
}
