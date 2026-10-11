import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type { ConsultaResumoDTO, IndicadoresDashboardDTO, PeriodoDashboard, PontoAtividadeDTO } from '@/modelos/dashboard';

export const servicoDashboard = {
  buscarIndicadores(periodo: PeriodoDashboard, signal?: AbortSignal): Promise<IndicadoresDashboardDTO> {
    return clienteHttp.get<IndicadoresDashboardDTO>(rotasApi.dashboard.indicadores, { consulta: { periodo }, signal });
  },

  buscarAtividade(periodo: PeriodoDashboard, signal?: AbortSignal): Promise<PontoAtividadeDTO[]> {
    return clienteHttp.get<PontoAtividadeDTO[]>(rotasApi.dashboard.atividade, { consulta: { periodo }, signal });
  },

  buscarConsultas(periodo: PeriodoDashboard, signal?: AbortSignal): Promise<ConsultaResumoDTO[]> {
    return clienteHttp.get<ConsultaResumoDTO[]>(rotasApi.dashboard.consultas, { consulta: { periodo }, signal });
  },
};
