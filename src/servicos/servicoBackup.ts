import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type {
  AgendamentoBackupDTO,
  ArquivoDoBackupDTO,
  DadosAgendamentoDTO,
  ExecucaoBackupDTO,
  FiltrosHistoricoBackup,
  ImpactoNaConexaoDTO,
  ListaAgendamentosDTO,
  ListaAlertasBackupDTO,
  NovaExecucaoDTO,
  ObjetosDoBancoDTO,
  PaginaExecucoesDTO,
  ResumoBackupDTO,
} from '@/modelos/backup';

export const servicoBackup = {
  buscarResumo(signal?: AbortSignal): Promise<ResumoBackupDTO> {
    return clienteHttp.get<ResumoBackupDTO>(rotasApi.backup.resumo, { signal });
  },
  listarAlertas(signal?: AbortSignal): Promise<ListaAlertasBackupDTO> {
    return clienteHttp.get<ListaAlertasBackupDTO>(rotasApi.backup.alertas, { signal });
  },
  listarImpactos(signal?: AbortSignal): Promise<ImpactoNaConexaoDTO[]> {
    return clienteHttp.get<ImpactoNaConexaoDTO[]>(rotasApi.backup.conexoes, { signal });
  },
  listarObjetos(conexaoId: string, signal?: AbortSignal): Promise<ObjetosDoBancoDTO> {
    return clienteHttp.get<ObjetosDoBancoDTO>(rotasApi.backup.objetos(conexaoId), { signal });
  },
  listarExecucoes(filtros: FiltrosHistoricoBackup, signal?: AbortSignal): Promise<PaginaExecucoesDTO> {
    return clienteHttp.get<PaginaExecucoesDTO>(rotasApi.backup.execucoes, {
      signal,
      consulta: {
        periodo: filtros.periodo ?? undefined,
        banco: filtros.banco ?? undefined,
        situacao: filtros.situacao ?? undefined,
        pagina: filtros.pagina,
      },
    });
  },
  buscarExecucao(id: string, signal?: AbortSignal): Promise<ExecucaoBackupDTO> {
    return clienteHttp.get<ExecucaoBackupDTO>(rotasApi.backup.execucao(id), { signal });
  },
  iniciarExecucao(execucao: NovaExecucaoDTO, signal?: AbortSignal): Promise<ExecucaoBackupDTO> {
    return clienteHttp.post<ExecucaoBackupDTO>(rotasApi.backup.execucoes, execucao, { signal });
  },
  iniciarDoAgendamento(id: string, signal?: AbortSignal): Promise<ExecucaoBackupDTO> {
    return clienteHttp.post<ExecucaoBackupDTO>(rotasApi.backup.execucaoDoAgendamento(id), undefined, { signal });
  },
  cancelarExecucao(id: string, signal?: AbortSignal): Promise<ExecucaoBackupDTO> {
    return clienteHttp.post<ExecucaoBackupDTO>(rotasApi.backup.cancelamentoDaExecucao(id), undefined, { signal });
  },
  buscarArquivo(id: string, signal?: AbortSignal): Promise<ArquivoDoBackupDTO> {
    return clienteHttp.get<ArquivoDoBackupDTO>(rotasApi.backup.arquivoDaExecucao(id), { signal });
  },
  excluirExecucao(id: string, signal?: AbortSignal): Promise<void> {
    return clienteHttp.delete<void>(rotasApi.backup.execucao(id), { signal });
  },
  listarAgendamentos(signal?: AbortSignal): Promise<ListaAgendamentosDTO> {
    return clienteHttp.get<ListaAgendamentosDTO>(rotasApi.backup.agendamentos, { signal });
  },
  criarAgendamento(dados: DadosAgendamentoDTO, signal?: AbortSignal): Promise<AgendamentoBackupDTO> {
    return clienteHttp.post<AgendamentoBackupDTO>(rotasApi.backup.agendamentos, dados, { signal });
  },
  editarAgendamento(id: string, dados: DadosAgendamentoDTO, signal?: AbortSignal): Promise<AgendamentoBackupDTO> {
    return clienteHttp.put<AgendamentoBackupDTO>(rotasApi.backup.agendamento(id), dados, { signal });
  },
  alternarAgendamento(id: string, ativo: boolean, signal?: AbortSignal): Promise<AgendamentoBackupDTO> {
    return clienteHttp.patch<AgendamentoBackupDTO>(rotasApi.backup.agendamento(id), { ativo }, { signal });
  },
  excluirAgendamento(id: string, signal?: AbortSignal): Promise<void> {
    return clienteHttp.delete<void>(rotasApi.backup.agendamento(id), { signal });
  },
};
