import type { ExecucaoBackupDTO } from '@/modelos/backup';
import { formatarNumero, formatarTamanho, pluralizar } from '@/utilitarios/formatacao';
import { etapasDaExecucao, rotuloEtapaExecucao } from './backup';

export type EntregaDoArquivo = 'AGUARDANDO' | 'RECEBENDO' | 'PARA_BAIXAR' | 'BAIXADO' | 'NA_PASTA' | 'NA_OUTRA_ABA' | 'SEM_ARQUIVO';

export type LocalDeSalvamento = { modo: 'NAVEGADOR' } | { modo: 'PASTA'; pasta: string };

export interface ResumoDoAcompanhamento {
  emAndamento: number;
  concluidos: number;
  comFalha: number;
}

export const TEMPO_NA_BARRA_MS = 20_000;
export const TEMPO_NA_BARRA_CANCELADO_MS = 8000;

export function emAndamento(execucao: Pick<ExecucaoBackupDTO, 'situacao'>): boolean {
  return execucao.situacao === 'EM_ANDAMENTO';
}

export function tituloDaExecucao(situacao: ExecucaoBackupDTO['situacao']): string {
  switch (situacao) {
    case 'EM_ANDAMENTO':
      return 'Backup em andamento';
    case 'CONCLUIDO':
      return 'Backup concluído!';
    case 'FALHOU':
      return 'O backup falhou';
    case 'CANCELADO':
      return 'Backup cancelado';
  }
}

export function descreverPasso(execucao: Pick<ExecucaoBackupDTO, 'etapa'>): string {
  return `Etapa ${etapasDaExecucao.indexOf(execucao.etapa) + 1} de ${etapasDaExecucao.length}: ${rotuloEtapaExecucao[execucao.etapa].toLowerCase()}`;
}

export function descreverAndamento(execucao: Pick<ExecucaoBackupDTO, 'etapa' | 'progresso'>): string {
  if (execucao.progresso === null) return descreverPasso(execucao);
  return `${execucao.progresso}% · ${rotuloEtapaExecucao[execucao.etapa].toLowerCase()}`;
}

export type SituacaoDoPasso = 'FEITO' | 'ATUAL' | 'FALHOU' | 'PENDENTE';

export function situacaoDosPassos(execucao: Pick<ExecucaoBackupDTO, 'etapa' | 'situacao'>): SituacaoDoPasso[] {
  const atual = etapasDaExecucao.indexOf(execucao.etapa);
  return etapasDaExecucao.map((_, indice) => {
    if (execucao.situacao === 'CONCLUIDO' || indice < atual) return 'FEITO';
    if (indice > atual) return 'PENDENTE';
    return execucao.situacao === 'EM_ANDAMENTO' ? 'ATUAL' : 'FALHOU';
  });
}

export function descreverLocal(local: LocalDeSalvamento): string {
  return local.modo === 'PASTA' ? `Pasta ${local.pasta}, no seu computador` : 'Pasta de downloads do navegador, no seu computador';
}

export function descreverEntrega(entrega: EntregaDoArquivo, local: LocalDeSalvamento | null): string {
  switch (entrega) {
    case 'AGUARDANDO':
      return local ? `Vai para: ${descreverLocal(local)}.` : 'O arquivo vai para o computador de quem iniciou o backup.';
    case 'RECEBENDO':
      return 'Recebendo o arquivo neste navegador…';
    case 'PARA_BAIXAR':
      return 'Pronto para baixar. Fica disponível enquanto esta aba estiver aberta.';
    case 'BAIXADO':
      return 'Enviado à pasta de downloads do navegador.';
    case 'NA_PASTA':
      return local?.modo === 'PASTA' ? `Salvo na pasta ${local.pasta}.` : 'Salvo na pasta escolhida.';
    case 'NA_OUTRA_ABA':
      return 'O arquivo foi entregue à aba que iniciou o backup.';
    case 'SEM_ARQUIVO':
      return 'Nenhum arquivo foi salvo.';
  }
}

export function descreverResultado(execucao: Pick<ExecucaoBackupDTO, 'banco' | 'situacao' | 'motivoDaFalha' | 'tamanhoBytes'>): string {
  switch (execucao.situacao) {
    case 'EM_ANDAMENTO':
      return '';
    case 'CONCLUIDO':
      return `O backup do banco ${execucao.banco} foi concluído com sucesso${execucao.tamanhoBytes !== null ? `, com ${formatarTamanho(execucao.tamanhoBytes)}` : ''}.`;
    case 'FALHOU':
      return execucao.motivoDaFalha ?? 'O backup foi interrompido antes de terminar.';
    case 'CANCELADO':
      return 'A transferência parou e o arquivo parcial foi descartado.';
  }
}

export function resumirDesfecho(
  execucao: Pick<ExecucaoBackupDTO, 'situacao' | 'motivoDaFalha' | 'tamanhoBytes'>,
  entrega: EntregaDoArquivo,
  local: LocalDeSalvamento | null,
): string {
  if (execucao.situacao === 'EM_ANDAMENTO') return '';
  if (execucao.situacao === 'FALHOU') return `Falhou. ${execucao.motivoDaFalha ?? 'O backup foi interrompido antes de terminar.'}`;
  if (execucao.situacao === 'CANCELADO') return 'Cancelado. Nenhum arquivo foi salvo.';
  const tamanho = execucao.tamanhoBytes !== null ? ` · ${formatarTamanho(execucao.tamanhoBytes)}` : '';
  switch (entrega) {
    case 'RECEBENDO':
      return 'Recebendo o arquivo neste navegador…';
    case 'PARA_BAIXAR':
      return `Pronto para baixar${tamanho}`;
    case 'BAIXADO':
      return `Enviado à pasta de downloads${tamanho}`;
    case 'NA_PASTA':
      return `Salvo na pasta ${local?.modo === 'PASTA' ? local.pasta : 'escolhida'}${tamanho}`;
    case 'NA_OUTRA_ABA':
      return 'Entregue à aba que iniciou o backup';
    default:
      return `Concluído${tamanho}`;
  }
}

export function resumirAcompanhamento(execucoes: readonly Pick<ExecucaoBackupDTO, 'situacao'>[]): ResumoDoAcompanhamento {
  return {
    emAndamento: execucoes.filter(emAndamento).length,
    concluidos: execucoes.filter((execucao) => execucao.situacao === 'CONCLUIDO').length,
    comFalha: execucoes.filter((execucao) => execucao.situacao === 'FALHOU').length,
  };
}

export function fraseDoResumo(resumo: ResumoDoAcompanhamento, lembretes: number): string {
  const partes = [
    resumo.emAndamento > 0 ? `${formatarNumero(resumo.emAndamento)} ${pluralizar(resumo.emAndamento, 'backup em andamento', 'backups em andamento')}` : null,
    resumo.concluidos > 0 ? `${formatarNumero(resumo.concluidos)} ${pluralizar(resumo.concluidos, 'concluído', 'concluídos')}` : null,
    resumo.comFalha > 0 ? `${formatarNumero(resumo.comFalha)} com falha` : null,
    lembretes > 0 ? `${formatarNumero(lembretes)} ${pluralizar(lembretes, 'lembrete', 'lembretes')}` : null,
  ].flatMap((parte) => (parte ? [parte] : []));
  return partes.length > 0 ? partes.join(' · ') : 'Backups';
}

export function tempoNaBarraMs(execucao: Pick<ExecucaoBackupDTO, 'situacao'>, entrega: EntregaDoArquivo): number | null {
  if (execucao.situacao === 'CANCELADO') return TEMPO_NA_BARRA_CANCELADO_MS;
  if (execucao.situacao !== 'CONCLUIDO') return null;
  return entrega === 'BAIXADO' || entrega === 'NA_PASTA' || entrega === 'NA_OUTRA_ABA' ? TEMPO_NA_BARRA_MS : null;
}

export function pedeConfirmacaoAoSair(execucao: Pick<ExecucaoBackupDTO, 'situacao'>, entrega: EntregaDoArquivo, daOutraAba: boolean): boolean {
  if (daOutraAba) return false;
  return emAndamento(execucao) || entrega === 'RECEBENDO' || entrega === 'PARA_BAIXAR';
}
