import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type { TelasOcultasDTO } from '@/modelos/telas';

export const servicoTelas = {
  buscarOcultas(signal?: AbortSignal): Promise<TelasOcultasDTO> {
    return clienteHttp.get<TelasOcultasDTO>(rotasApi.conta.telasOcultas, { signal });
  },

  atualizarOcultas(dados: TelasOcultasDTO): Promise<TelasOcultasDTO> {
    return clienteHttp.put<TelasOcultasDTO>(rotasApi.conta.telasOcultas, dados);
  },
};
