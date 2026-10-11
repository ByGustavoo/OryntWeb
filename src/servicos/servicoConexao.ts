import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type { ConexaoDTO, CredenciaisConexaoDTO, TesteConexaoDTO } from '@/modelos/conexao';

export const servicoConexao = {
  testarConexao(credenciais: CredenciaisConexaoDTO, signal?: AbortSignal): Promise<TesteConexaoDTO> {
    return clienteHttp.post<TesteConexaoDTO>(rotasApi.conexoes.teste, credenciais, { signal });
  },

  conectar(credenciais: CredenciaisConexaoDTO, signal?: AbortSignal): Promise<ConexaoDTO> {
    return clienteHttp.post<ConexaoDTO>(rotasApi.conexoes.lista, credenciais, { signal });
  },

  buscarConexaoAtual(signal?: AbortSignal): Promise<ConexaoDTO> {
    return clienteHttp.get<ConexaoDTO>(rotasApi.conexoes.atual, { signal });
  },

  encerrarConexao(signal?: AbortSignal): Promise<void> {
    return clienteHttp.delete<void>(rotasApi.conexoes.atual, { signal });
  },
};
