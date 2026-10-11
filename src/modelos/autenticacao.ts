export interface CredenciaisAcessoDTO {
  email: string;
  senha: string;
}

export interface UsuarioDTO {
  id: string;
  nome: string;
  email: string;
  simulado: boolean;
}

export const PROBLEMAS_AUTENTICACAO = {
  credenciaisInvalidas: '/problems/invalid-credentials',
  naoAutenticado: '/problems/unauthenticated',
} as const;
