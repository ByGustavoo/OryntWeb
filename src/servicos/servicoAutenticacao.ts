import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type {
  AceiteConviteDTO,
  ConviteValidoDTO,
  CredenciaisAcessoDTO,
  NovaSenhaDTO,
  PedidoRecuperacaoDTO,
  RedefinicaoLiberadaDTO,
  UsuarioDTO,
  VerificacaoCodigoDTO,
  VerificacaoConviteDTO,
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

  verificarConvite(verificacao: VerificacaoConviteDTO, signal?: AbortSignal): Promise<ConviteValidoDTO> {
    return clienteHttp.post<ConviteValidoDTO>(rotasApi.autenticacao.verificacaoConvite, verificacao, { signal });
  },

  aceitarConvite(aceite: AceiteConviteDTO, signal?: AbortSignal): Promise<void> {
    return clienteHttp.post<void>(rotasApi.autenticacao.convite, aceite, { signal });
  },
};
