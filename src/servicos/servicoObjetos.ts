import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type { ListaIndicesDTO, ListaVisoesDTO } from '@/modelos/objetos';

export const servicoObjetos = {
  listarVisoes(signal?: AbortSignal): Promise<ListaVisoesDTO> {
    return clienteHttp.get<ListaVisoesDTO>(rotasApi.objetos.visoes, { signal });
  },

  listarIndices(signal?: AbortSignal): Promise<ListaIndicesDTO> {
    return clienteHttp.get<ListaIndicesDTO>(rotasApi.objetos.indices, { signal });
  },
};
