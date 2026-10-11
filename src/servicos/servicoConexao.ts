import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type {
  ConexaoDTO,
  ConexaoSalvaDTO,
  CredenciaisConexaoDTO,
  RenomeacaoConexaoDTO,
  TesteConexaoDTO,
} from '@/modelos/conexao';

export const servicoConexao = {
  testarConexao(credenciais: CredenciaisConexaoDTO, signal?: AbortSignal): Promise<TesteConexaoDTO> {
    return clienteHttp.post<TesteConexaoDTO>(rotasApi.conexoes.teste, credenciais, { signal });
  },

  conectar(credenciais: CredenciaisConexaoDTO, signal?: AbortSignal): Promise<ConexaoDTO> {
    return clienteHttp.post<ConexaoDTO>(rotasApi.conexoes.lista, credenciais, { signal });
  },

  listarConexoes(signal?: AbortSignal): Promise<ConexaoSalvaDTO[]> {
    return clienteHttp.get<ConexaoSalvaDTO[]>(rotasApi.conexoes.lista, { signal });
  },

  ativarConexao(id: string, signal?: AbortSignal): Promise<ConexaoDTO> {
    return clienteHttp.post<ConexaoDTO>(rotasApi.conexoes.ativacao(id), undefined, { signal });
  },

  renomearConexao(id: string, renomeacao: RenomeacaoConexaoDTO, signal?: AbortSignal): Promise<ConexaoSalvaDTO> {
    return clienteHttp.patch<ConexaoSalvaDTO>(rotasApi.conexoes.salva(id), renomeacao, { signal });
  },

  excluirConexao(id: string, signal?: AbortSignal): Promise<void> {
    return clienteHttp.delete<void>(rotasApi.conexoes.salva(id), { signal });
  },

  buscarConexaoAtual(signal?: AbortSignal): Promise<ConexaoDTO> {
    return clienteHttp.get<ConexaoDTO>(rotasApi.conexoes.atual, { signal });
  },

  encerrarConexao(signal?: AbortSignal): Promise<void> {
    return clienteHttp.delete<void>(rotasApi.conexoes.atual, { signal });
  },
};
