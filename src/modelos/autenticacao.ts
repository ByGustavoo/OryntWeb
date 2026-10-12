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

export interface PedidoRecuperacaoDTO {
  email: string;
}

export interface VerificacaoCodigoDTO {
  email: string;
  codigo: string;
}

export interface RedefinicaoLiberadaDTO {
  tokenRedefinicao: string;
}

export interface NovaSenhaDTO {
  tokenRedefinicao: string;
  senha: string;
}

export const PROBLEMAS_AUTENTICACAO = {
  credenciaisInvalidas: '/problems/invalid-credentials',
  naoAutenticado: '/problems/unauthenticated',
  codigoInvalido: '/problems/invalid-recovery-code',
  tentativasEsgotadas: '/problems/recovery-attempts-exceeded',
  redefinicaoExpirada: '/problems/invalid-reset-token',
} as const;
