export type TipoBackup = 'COMPLETO' | 'ESTRUTURA' | 'DADOS';

export type TipoObjetoBackup = 'TABELA' | 'VISAO' | 'VISAO_MATERIALIZADA' | 'FUNCAO' | 'PROCEDIMENTO' | 'SEQUENCIA';

export type SituacaoExecucao = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'FALHOU' | 'CANCELADO';

export type EtapaExecucao = 'CONECTANDO' | 'LENDO_ESTRUTURA' | 'EXPORTANDO' | 'FINALIZANDO';

export type OrigemExecucao = 'MANUAL' | 'AGENDADA';

export type SituacaoAgendamento = 'ATIVO' | 'INATIVO' | 'ATRASADO' | 'SEM_CONEXAO';

export type TipoFrequencia = 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'PERSONALIZADA';

export type UnidadeIntervalo = 'HORAS' | 'DIAS';

export type PeriodoHistoricoBackup = 'ULTIMAS_24_HORAS' | 'ULTIMOS_7_DIAS' | 'ULTIMOS_30_DIAS';

export type FrequenciaBackup =
  | { tipo: 'DIARIA'; horario: string }
  | { tipo: 'SEMANAL'; diaDaSemana: number; horario: string }
  | { tipo: 'MENSAL'; diaDoMes: number; horario: string }
  | { tipo: 'PERSONALIZADA'; intervalo: number; unidade: UnidadeIntervalo; horario: string };

export type SelecaoObjetos = { modo: 'BANCO_INTEIRO' } | { modo: 'ESCOLHIDOS'; objetos: string[] };

export interface ObjetoBackupDTO {
  id: string;
  tipo: TipoObjetoBackup;
  esquema: string;
  nome: string;
  tamanhoBytes: number | null;
}

export interface ObjetosDoBancoDTO {
  conexaoId: string;
  banco: string;
  objetos: ObjetoBackupDTO[];
}

export interface ExecucaoBackupDTO {
  id: string;
  nome: string;
  origem: OrigemExecucao;
  agendamentoId: string | null;
  conexaoId: string | null;
  conexaoNome: string;
  banco: string;
  tipo: TipoBackup;
  selecao: SelecaoObjetos;
  objetosIncluidos: number;
  objetosProcessados: number;
  objetoAtual: string | null;
  etapa: EtapaExecucao;
  arquivo: string | null;
  iniciadaEm: string;
  duracaoMs: number | null;
  bytesTransferidos: number;
  tamanhoBytes: number | null;
  situacao: SituacaoExecucao;
  progresso: number | null;
  interrompida: boolean;
  motivoDaFalha: string | null;
}

export interface ArquivoDoBackupDTO {
  nome: string;
  tipo: string;
  conteudo: string;
}

export interface PaginaExecucoesDTO {
  geradoEm: string;
  itens: ExecucaoBackupDTO[];
  pagina: number;
  itensPorPagina: number;
  totalItens: number;
  totalPaginas: number;
  totalRegistradas: number;
  bancos: string[];
}

export interface FiltrosHistoricoBackup {
  periodo: PeriodoHistoricoBackup | null;
  banco: string | null;
  situacao: SituacaoExecucao | null;
  pagina: number;
}

export interface ResumoUltimaExecucaoDTO {
  id: string;
  situacao: SituacaoExecucao;
  iniciadaEm: string;
}

export interface AgendamentoBackupDTO {
  id: string;
  nome: string;
  conexaoId: string | null;
  conexaoNome: string;
  banco: string;
  tipo: TipoBackup;
  selecao: SelecaoObjetos;
  frequencia: FrequenciaBackup;
  ativo: boolean;
  situacao: SituacaoAgendamento;
  vigenteDesde: string;
  proximaExecucaoEm: string | null;
  lembreteEm: string | null;
  ultimaExecucao: ResumoUltimaExecucaoDTO | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ListaAgendamentosDTO {
  geradoEm: string;
  agendamentos: AgendamentoBackupDTO[];
}

export interface DadosAgendamentoDTO {
  nome: string;
  conexaoId: string;
  tipo: TipoBackup;
  selecao: SelecaoObjetos;
  frequencia: FrequenciaBackup;
  ativo: boolean;
}

export interface NovaExecucaoDTO {
  nome: string | null;
  conexaoId: string;
  tipo: TipoBackup;
  selecao: SelecaoObjetos;
}

export type TipoAlertaBackup = 'ULTIMO_BACKUP_FALHOU' | 'AGENDAMENTO_ATRASADO';

export interface AlertaBackupDTO {
  id: string;
  tipo: TipoAlertaBackup;
  nome: string;
  banco: string;
  ocorridoEm: string;
  motivo: string | null;
  agendamentoId: string | null;
  execucaoId: string | null;
}

export interface ListaAlertasBackupDTO {
  geradoEm: string;
  alertas: AlertaBackupDTO[];
}

export interface ProximoBackupDTO {
  agendamentoId: string;
  nome: string;
  banco: string;
  quando: string;
  descricaoDaFrequencia: string;
}

export interface ResumoBackupDTO {
  geradoEm: string;
  totalExecucoes: number;
  concluidas: number;
  falhas: number;
  ultimaExecucao: ExecucaoBackupDTO | null;
  proximosAgendamentos: ProximoBackupDTO[];
  ultimasExecucoes: ExecucaoBackupDTO[];
  alertas: AlertaBackupDTO[];
}

export interface ImpactoNaConexaoDTO {
  conexaoId: string;
  agendamentos: number;
  agendamentosAtivos: number;
  nomesDosAgendamentos: string[];
  ultimaExecucao: ResumoUltimaExecucaoDTO | null;
}

export const PROBLEMAS_BACKUP = {
  execucaoEmAndamento: '/problems/backup-running',
  conexaoIndisponivel: '/problems/backup-connection-unavailable',
  arquivoIndisponivel: '/problems/backup-file-gone',
} as const;
