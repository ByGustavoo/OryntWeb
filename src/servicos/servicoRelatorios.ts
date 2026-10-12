import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type { ComparacaoRelatorio, PeriodoRelatorio, ResumoRelatorioDTO } from '@/modelos/relatorios';

export const servicoRelatorios = {
  buscarResumo(periodo: PeriodoRelatorio, signal?: AbortSignal): Promise<ResumoRelatorioDTO> {
    return clienteHttp.get<ResumoRelatorioDTO>(rotasApi.relatorios.resumo, {
      consulta: { granularidade: periodo.granularidade, inicio: periodo.inicio },
      signal,
    });
  },

  async buscarComparacao(
    periodo: PeriodoRelatorio,
    base: PeriodoRelatorio,
    signal?: AbortSignal,
  ): Promise<ComparacaoRelatorio> {
    const [principal, resumoDaBase] = await Promise.all([
      servicoRelatorios.buscarResumo(periodo, signal),
      servicoRelatorios.buscarResumo(base, signal),
    ]);
    return { principal, base: resumoDaBase };
  },
};
