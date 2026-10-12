import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type {
  CredenciaisAcessoDTO,
  NovaSenhaDTO,
  PedidoRecuperacaoDTO,
  RedefinicaoLiberadaDTO,
  UsuarioDTO,
  VerificacaoCodigoDTO,
} from '@/modelos/autenticacao';

export const servicoAutenticacao = {
  entrar(credenciais: CredenciaisAcessoDTO, signal?: AbortSignal): Promise<UsuarioDTO> {
    return clienteHttp.post<UsuarioDTO>(rotasApi.autenticacao.sessao, credenciais, { signal });
  },

  buscarUsuarioAtual(signal?: AbortSignal): Promise<UsuarioDTO> {
    return clienteHttp.get<UsuarioDTO>(rotasApi.autenticacao.sessao, { signal });
  },

  sair(signal?: AbortSignal): Promise<void> {
    return clienteHttp.delete<void>(rotasApi.autenticacao.sessao, { signal });
  },

  solicitarRecuperacao(pedido: PedidoRecuperacaoDTO, signal?: AbortSignal): Promise<void> {
    return clienteHttp.post<void>(rotasApi.autenticacao.recuperacao, pedido, { signal });
  },

  verificarCodigoRecuperacao(verificacao: VerificacaoCodigoDTO, signal?: AbortSignal): Promise<RedefinicaoLiberadaDTO> {
    return clienteHttp.post<RedefinicaoLiberadaDTO>(rotasApi.autenticacao.verificacaoRecuperacao, verificacao, { signal });
  },

  redefinirSenha(novaSenha: NovaSenhaDTO, signal?: AbortSignal): Promise<void> {
    return clienteHttp.post<void>(rotasApi.autenticacao.novaSenha, novaSenha, { signal });
  },
};
