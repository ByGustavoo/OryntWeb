import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
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
};
