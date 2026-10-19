import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type { ListaFuncoesDTO, ListaIndicesDTO, ListaTabelasDTO, ListaVisoesDTO } from '@/modelos/objetos';

export const servicoObjetos = {
  listarVisoes(signal?: AbortSignal): Promise<ListaVisoesDTO> {
    return clienteHttp.get<ListaVisoesDTO>(rotasApi.objetos.visoes, { signal });
  },

  listarIndices(signal?: AbortSignal): Promise<ListaIndicesDTO> {
    return clienteHttp.get<ListaIndicesDTO>(rotasApi.objetos.indices, { signal });
  },

  listarTabelas(signal?: AbortSignal): Promise<ListaTabelasDTO> {
    return clienteHttp.get<ListaTabelasDTO>(rotasApi.objetos.tabelas, { signal });
  },

  listarFuncoes(signal?: AbortSignal): Promise<ListaFuncoesDTO> {
    return clienteHttp.get<ListaFuncoesDTO>(rotasApi.objetos.funcoes, { signal });
  },
};
