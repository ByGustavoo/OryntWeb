import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type { AlteracaoDTO, ListaAlteracoesDTO, PedidoAlteracaoDTO } from '@/modelos/alteracoes';
import type { ListaPapeisDTO } from '@/modelos/papeis';
import type { ListaPermissoesDTO } from '@/modelos/permissoes';
import type { ListaSessoesDTO } from '@/modelos/sessoes';

export const servicoUsuarios = {
  listarPapeis(signal?: AbortSignal): Promise<ListaPapeisDTO> {
    return clienteHttp.get<ListaPapeisDTO>(rotasApi.usuarios.papeis, { signal });
  },
  listarSessoes(signal?: AbortSignal): Promise<ListaSessoesDTO> {
    return clienteHttp.get<ListaSessoesDTO>(rotasApi.usuarios.sessoes, { signal });
  },
  listarPermissoes(signal?: AbortSignal): Promise<ListaPermissoesDTO> {
    return clienteHttp.get<ListaPermissoesDTO>(rotasApi.usuarios.permissoes, { signal });
  },
  listarAlteracoes(signal?: AbortSignal): Promise<ListaAlteracoesDTO> {
    return clienteHttp.get<ListaAlteracoesDTO>(rotasApi.usuarios.alteracoes, { signal });
  },
  aplicarAlteracao(pedido: PedidoAlteracaoDTO, signal?: AbortSignal): Promise<AlteracaoDTO> {
    return clienteHttp.post<AlteracaoDTO>(rotasApi.usuarios.alteracoes, pedido, { signal });
  },
};
