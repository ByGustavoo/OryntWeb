import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type { VersaoSistemaDTO } from '@/modelos/comum';

export const servicoSistema = {
  buscarVersao(signal?: AbortSignal): Promise<VersaoSistemaDTO> {
    return clienteHttp.get<VersaoSistemaDTO>(rotasApi.sistema.versao, { signal });
  },
};
