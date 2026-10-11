import type { CredenciaisAcessoDTO, UsuarioDTO } from '@/modelos/autenticacao';

export const CREDENCIAIS_DEMONSTRACAO: CredenciaisAcessoDTO = {
  email: 'demo@orynt.local',
  senha: 'orynt-demo',
};

export const USUARIO_DEMONSTRACAO: UsuarioDTO = {
  id: 'usuario-demonstracao',
  nome: 'Conta de demonstração',
  email: CREDENCIAIS_DEMONSTRACAO.email,
  simulado: true,
};
