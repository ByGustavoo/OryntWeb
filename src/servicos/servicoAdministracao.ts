import { clienteHttp } from '@/api/clienteHttp';
import { rotasApi } from '@/api/rotasApi';
import type {
  ContaDTO,
  EdicaoContaDTO,
  FiltrosAuditoria,
  ListaContasDTO,
  NovaContaDTO,
  PaginaAuditoriaDTO,
  PermissoesContaDTO,
} from '@/modelos/administracao';

export const servicoAdministracao = {
  listarContas(signal?: AbortSignal): Promise<ListaContasDTO> {
    return clienteHttp.get<ListaContasDTO>(rotasApi.administracao.contas, { signal });
  },
  criarConta(conta: NovaContaDTO, signal?: AbortSignal): Promise<ContaDTO> {
    return clienteHttp.post<ContaDTO>(rotasApi.administracao.contas, conta, { signal });
  },
  editarConta(id: string, edicao: EdicaoContaDTO, signal?: AbortSignal): Promise<ContaDTO> {
    return clienteHttp.patch<ContaDTO>(rotasApi.administracao.conta(id), edicao, { signal });
  },
  mudarPermissoes(id: string, permissoes: PermissoesContaDTO, signal?: AbortSignal): Promise<ContaDTO> {
    return clienteHttp.put<ContaDTO>(rotasApi.administracao.permissoes(id), permissoes, { signal });
  },
  excluirConta(id: string, signal?: AbortSignal): Promise<void> {
    return clienteHttp.delete<void>(rotasApi.administracao.conta(id), { signal });
  },
  reenviarConvite(id: string, signal?: AbortSignal): Promise<ContaDTO> {
    return clienteHttp.post<ContaDTO>(rotasApi.administracao.convite(id), undefined, { signal });
  },
  encerrarSessoes(id: string, signal?: AbortSignal): Promise<ContaDTO> {
    return clienteHttp.delete<ContaDTO>(rotasApi.administracao.sessoes(id), { signal });
  },
  desbloquearConta(id: string, signal?: AbortSignal): Promise<ContaDTO> {
    return clienteHttp.delete<ContaDTO>(rotasApi.administracao.bloqueio(id), { signal });
  },
  listarAuditoria(filtros: FiltrosAuditoria, signal?: AbortSignal): Promise<PaginaAuditoriaDTO> {
    return clienteHttp.get<PaginaAuditoriaDTO>(rotasApi.auditoria.eventos, {
      signal,
      consulta: {
        busca: filtros.busca || undefined,
        conta: filtros.conta ?? undefined,
        categoria: filtros.categoria ?? undefined,
        modulo: filtros.modulo ?? undefined,
        resultado: filtros.resultado ?? undefined,
        periodo: filtros.periodo ?? undefined,
        pagina: filtros.pagina,
      },
    });
  },
  registrarAcesso(tela: string, signal?: AbortSignal): Promise<void> {
    return clienteHttp.post<void>(rotasApi.auditoria.acessos, { tela }, { signal });
  },
};
