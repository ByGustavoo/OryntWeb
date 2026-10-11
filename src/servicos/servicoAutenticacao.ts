import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type { CredenciaisAcessoDTO, UsuarioDTO } from '@/modelos/autenticacao';

export const servicoAutenticacao = {
  entrar(credenciais: CredenciaisAcessoDTO, signal?: AbortSignal): Promise<UsuarioDTO> {
    return clienteHttp.post<UsuarioDTO>(rotasApi.autenticacao.sessao, credenciais, { signal });
  },

  buscarUsuarioAtual(signal?: AbortSignal): Promise<UsuarioDTO> {
    return clienteHttp.get<UsuarioDTO>(rotasApi.autenticacao.sessao, { signal });
  },
};
