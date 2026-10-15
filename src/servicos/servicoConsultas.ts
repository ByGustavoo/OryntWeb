import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type { ConsultaDetalhadaDTO, FiltrosConsultas, HistoricoConsultaDTO, PaginaConsultasDTO } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import type { PlanosConsultaDTO } from '@/modelos/planos';
import { TAMANHO_DA_PAGINA, TAMANHO_MAXIMO_DA_PAGINA, filtrosIniciais } from '@/regras/filtrosConsultas';
import { QUANTIDADE_DE_SUGESTOES } from '@/regras/historicoConsulta';

function buscarPagina(
  filtros: FiltrosConsultas,
  pagina: number,
  tamanhoPagina: number,
  signal?: AbortSignal,
): Promise<PaginaConsultasDTO> {
  return clienteHttp.get<PaginaConsultasDTO>(rotasApi.consultas.lista, {
    consulta: {
      periodo: filtros.periodo,
      busca: filtros.busca,
      desempenho: filtros.desempenho,
      tipo: filtros.tipo,
      ordenacao: filtros.ordenacao,
      direcao: filtros.direcao,
      pagina,
      tamanhoPagina,
    },
    signal,
  });
}

export const servicoConsultas = {
  listar(filtros: FiltrosConsultas, signal?: AbortSignal): Promise<PaginaConsultasDTO> {
    return buscarPagina(filtros, filtros.pagina, TAMANHO_DA_PAGINA, signal);
  },

  async listarTodas(filtros: FiltrosConsultas, signal?: AbortSignal): Promise<ConsultaDetalhadaDTO[]> {
    const consultas: ConsultaDetalhadaDTO[] = [];
    let totalPaginas = 1;

    for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
      const resposta = await buscarPagina(filtros, pagina, TAMANHO_MAXIMO_DA_PAGINA, signal);
      consultas.push(...resposta.itens);
      totalPaginas = resposta.totalPaginas;
    }
    return consultas;
  },

  sugerir(periodo: PeriodoDashboard, busca: string, signal?: AbortSignal): Promise<PaginaConsultasDTO> {
    return buscarPagina({ ...filtrosIniciais, periodo, busca }, 1, QUANTIDADE_DE_SUGESTOES, signal);
  },

  async buscarMaisPesada(periodo: PeriodoDashboard, signal?: AbortSignal): Promise<ConsultaDetalhadaDTO | null> {
    const pagina = await buscarPagina({ ...filtrosIniciais, periodo }, 1, 1, signal);
    return pagina.itens[0] ?? null;
  },

  buscarHistorico(id: string, periodo: PeriodoDashboard, signal?: AbortSignal): Promise<HistoricoConsultaDTO> {
    return clienteHttp.get<HistoricoConsultaDTO>(rotasApi.consultas.historico(id), { consulta: { periodo }, signal });
  },

  buscarPlano(id: string, versao: string | null, signal?: AbortSignal): Promise<PlanosConsultaDTO> {
    return clienteHttp.get<PlanosConsultaDTO>(rotasApi.consultas.plano(id), { consulta: { versao }, signal });
  },
};
