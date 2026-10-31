import type {
  AlertaBackupDTO,
  DadosAgendamentoDTO,
  ExecucaoBackupDTO,
  FiltrosHistoricoBackup,
  FrequenciaBackup,
  ImpactoNaConexaoDTO,
  NovaExecucaoDTO,
  AgendamentoBackupDTO,
  EtapaExecucao,
  PeriodoHistoricoBackup,
  SelecaoObjetos,
  SituacaoAgendamento,
  SituacaoExecucao,
  TipoBackup,
  TipoFrequencia,
  UnidadeIntervalo,
} from '@/modelos/backup';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { INTERVALO_MAXIMO, horarioValido } from './frequenciaBackup';
import { lerPagina, paginaAposMudanca } from './paginacaoLocal';

export const EXECUCOES_POR_PAGINA = 15;
export const TAMANHO_MAXIMO_NOME_BACKUP = 80;
export const PROXIMAS_NA_PREVIA = 3;

export const tiposBackup: TipoBackup[] = ['COMPLETO', 'ESTRUTURA', 'DADOS'];

export const rotuloTipoBackup: Record<TipoBackup, string> = {
  COMPLETO: 'Completo',
  ESTRUTURA: 'Só estrutura',
  DADOS: 'Só dados',
};

export const descricaoTipoBackup: Record<TipoBackup, string> = {
  COMPLETO: 'A estrutura e os dados. É o que permite recuperar o banco por inteiro.',
  ESTRUTURA: 'Tabelas, views e funções, sem nenhuma linha. Leve, serve para recriar o banco vazio.',
  DADOS: 'Só as linhas das tabelas e os valores das sequências. A estrutura precisa já existir ao restaurar.',
};

export const descricaoBancoInteiro: Record<TipoBackup, string> = {
  COMPLETO: 'O backup leva o banco como ele estiver na hora de rodar, então o que for criado até lá também entra. Índices, gatilhos e restrições vão junto com as tabelas.',
  ESTRUTURA: 'O backup leva a estrutura como ela estiver na hora de rodar, então o que for criado até lá também entra. Índices, gatilhos e restrições vão junto com as tabelas.',
  DADOS: 'O backup leva as linhas das tabelas e os valores das sequências como estiverem na hora de rodar, então o que for criado até lá também entra.',
};

export const situacoesExecucao: SituacaoExecucao[] = ['CONCLUIDO', 'FALHOU', 'CANCELADO', 'EM_ANDAMENTO'];

export const rotuloSituacaoExecucao: Record<SituacaoExecucao, string> = {
  CONCLUIDO: 'Concluído',
  FALHOU: 'Falhou',
  CANCELADO: 'Cancelado',
  EM_ANDAMENTO: 'Em andamento',
};

export const rotuloSituacaoAgendamento: Record<SituacaoAgendamento, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  ATRASADO: 'Atrasado',
  SEM_CONEXAO: 'Sem conexão',
};

export const periodosHistoricoBackup: PeriodoHistoricoBackup[] = ['ULTIMAS_24_HORAS', 'ULTIMOS_7_DIAS', 'ULTIMOS_30_DIAS'];

export const rotuloPeriodoHistoricoBackup: Record<PeriodoHistoricoBackup, string> = {
  ULTIMAS_24_HORAS: 'Últimas 24 horas',
  ULTIMOS_7_DIAS: 'Últimos 7 dias',
  ULTIMOS_30_DIAS: 'Últimos 30 dias',
};

const duracaoDoPeriodoMs: Record<PeriodoHistoricoBackup, number> = {
  ULTIMAS_24_HORAS: 86_400_000,
  ULTIMOS_7_DIAS: 7 * 86_400_000,
  ULTIMOS_30_DIAS: 30 * 86_400_000,
};

export const filtrosHistoricoIniciais: FiltrosHistoricoBackup = { periodo: null, banco: null, situacao: null, pagina: 1 };

export function lerFiltrosHistorico(valor: unknown): FiltrosHistoricoBackup {
  if (!valor || typeof valor !== 'object') return filtrosHistoricoIniciais;
  const guardado = valor as Record<string, unknown>;
  return {
    periodo: periodosHistoricoBackup.find((item) => item === guardado.periodo) ?? null,
    banco: typeof guardado.banco === 'string' && guardado.banco !== '' ? guardado.banco : null,
    situacao: situacoesExecucao.find((item) => item === guardado.situacao) ?? null,
    pagina: lerPagina(guardado.pagina),
  };
}

export function aplicarMudancaHistorico(filtros: FiltrosHistoricoBackup, mudanca: Partial<FiltrosHistoricoBackup>): FiltrosHistoricoBackup {
  return lerFiltrosHistorico({ ...filtros, ...mudanca, pagina: paginaAposMudanca(filtros, mudanca) });
}

export function temFiltroAtivoHistorico(filtros: FiltrosHistoricoBackup): boolean {
  return filtros.periodo !== null || filtros.banco !== null || filtros.situacao !== null;
}

export function semFiltrosHistorico(): Omit<FiltrosHistoricoBackup, 'pagina'> {
  return { periodo: null, banco: null, situacao: null };
}

export function filtrarExecucoes<T extends Pick<ExecucaoBackupDTO, 'banco' | 'iniciadaEm' | 'situacao'>>(
  execucoes: readonly T[],
  filtros: FiltrosHistoricoBackup,
  agora: Date,
): T[] {
  const limite = filtros.periodo ? agora.getTime() - duracaoDoPeriodoMs[filtros.periodo] : null;
  return execucoes.filter(
    (execucao) =>
      (filtros.banco === null || execucao.banco === filtros.banco) &&
      (filtros.situacao === null || execucao.situacao === filtros.situacao) &&
      (limite === null || new Date(execucao.iniciadaEm).getTime() >= limite),
  );
}

export function resumirHistorico(total: number, filtros: FiltrosHistoricoBackup): string {
  const contagem = `${formatarNumero(total)} ${pluralizar(total, 'backup', 'backups')}`;
  return temFiltroAtivoHistorico(filtros) ? `${contagem} nos filtros aplicados` : contagem;
}

export function descreverFiltrosHistorico(filtros: FiltrosHistoricoBackup): string[] {
  return [
    filtros.periodo ? rotuloPeriodoHistoricoBackup[filtros.periodo].toLowerCase() : null,
    filtros.banco ? `banco ${filtros.banco}` : null,
    filtros.situacao ? rotuloSituacaoExecucao[filtros.situacao].toLowerCase() : null,
  ].flatMap((parte) => (parte ? [parte] : []));
}

function carimboDoArquivo(instante: Date): string {
  const dois = (valor: number) => String(valor).padStart(2, '0');
  return `${instante.getFullYear()}-${dois(instante.getMonth() + 1)}-${dois(instante.getDate())}_${dois(instante.getHours())}${dois(instante.getMinutes())}`;
}

const sufixoDoTipo: Record<TipoBackup, string> = { COMPLETO: 'completo', ESTRUTURA: 'estrutura', DADOS: 'dados' };

export function nomeDoArquivo(banco: string, instante: Date, tipo: TipoBackup, simulado = false): string {
  return `backup_${banco}_${carimboDoArquivo(instante)}_${sufixoDoTipo[tipo]}${simulado ? '-demonstracao' : ''}.dump`;
}

export function nomeSugeridoDoBackup(banco: string, tipo: TipoBackup): string {
  return `${banco} · ${rotuloTipoBackup[tipo].toLowerCase()}`;
}

export const etapasDaExecucao: EtapaExecucao[] = ['CONECTANDO', 'LENDO_ESTRUTURA', 'EXPORTANDO', 'FINALIZANDO'];

export const rotuloEtapaExecucao: Record<EtapaExecucao, string> = {
  CONECTANDO: 'Conectando ao banco',
  LENDO_ESTRUTURA: 'Lendo a estrutura',
  EXPORTANDO: 'Exportando os objetos',
  FINALIZANDO: 'Finalizando o arquivo',
};

export type EtapaDoPlano = 'ORIGEM' | 'OBJETOS' | 'DESTINO' | 'QUANDO';

export const etapasDoPlano: EtapaDoPlano[] = ['ORIGEM', 'OBJETOS', 'DESTINO', 'QUANDO'];

export const rotuloEtapaDoPlano: Record<EtapaDoPlano, string> = {
  ORIGEM: 'Origem',
  OBJETOS: 'Objetos',
  DESTINO: 'Destino',
  QUANDO: 'Quando',
};

export type QuandoExecutar = 'AGORA' | TipoFrequencia;

export interface CamposPlano {
  nome: string;
  conexaoId: string | null;
  tipo: TipoBackup;
  selecao: SelecaoObjetos;
  quando: QuandoExecutar;
  horario: string;
  diaDaSemana: number;
  diaDoMes: string;
  intervalo: string;
  unidade: UnidadeIntervalo;
  ativo: boolean;
}

export type CampoPlano = 'nome' | 'conexaoId' | 'selecao' | 'horario' | 'diaDoMes' | 'intervalo';

export type ErrosPlano = Partial<Record<CampoPlano, string>>;

export const camposPlanoIniciais: CamposPlano = {
  nome: '',
  conexaoId: null,
  tipo: 'COMPLETO',
  selecao: { modo: 'BANCO_INTEIRO' },
  quando: 'AGORA',
  horario: '02:00',
  diaDaSemana: 0,
  diaDoMes: '1',
  intervalo: '6',
  unidade: 'HORAS',
  ativo: true,
};

function numeroInteiro(valor: string): number | null {
  const texto = valor.trim();
  return /^\d+$/.test(texto) ? Number(texto) : null;
}

function validarEntre(valor: string, minimo: number, maximo: number, mensagem: string): string | undefined {
  const numero = numeroInteiro(valor);
  return numero === null || numero < minimo || numero > maximo ? mensagem : undefined;
}

export function errosDaEtapa(etapa: EtapaDoPlano, campos: CamposPlano): ErrosPlano {
  const erros: ErrosPlano = {};
  if (etapa === 'ORIGEM' && !campos.conexaoId) erros.conexaoId = 'Escolha de qual conexão fazer o backup.';
  if (etapa === 'OBJETOS' && campos.selecao.modo === 'ESCOLHIDOS' && campos.selecao.objetos.length === 0) {
    erros.selecao = 'Marque ao menos um objeto ou escolha o banco inteiro.';
  }
  if (etapa !== 'QUANDO') return erros;

  const nome = campos.nome.trim();
  if (nome.length > TAMANHO_MAXIMO_NOME_BACKUP) erros.nome = `O nome pode ter até ${TAMANHO_MAXIMO_NOME_BACKUP} caracteres.`;
  if (campos.quando === 'AGORA') return erros;

  if (!nome) erros.nome = 'Dê um nome para reconhecer este agendamento.';
  if (!horarioValido(campos.horario)) erros.horario = 'Informe o horário no formato 00:00.';
  if (campos.quando === 'MENSAL') {
    const erro = validarEntre(campos.diaDoMes, 1, 31, 'Use um dia entre 1 e 31.');
    if (erro) erros.diaDoMes = erro;
  }
  if (campos.quando === 'PERSONALIZADA') {
    const maximo = INTERVALO_MAXIMO[campos.unidade];
    const erro = validarEntre(campos.intervalo, 1, maximo, `Use um intervalo entre 1 e ${maximo}.`);
    if (erro) erros.intervalo = erro;
  }
  return erros;
}

export function frequenciaDosCampos(campos: CamposPlano): FrequenciaBackup | null {
  const horario = campos.horario;
  if (!horarioValido(horario)) return null;
  switch (campos.quando) {
    case 'AGORA':
      return null;
    case 'DIARIA':
      return { tipo: 'DIARIA', horario };
    case 'SEMANAL':
      return { tipo: 'SEMANAL', diaDaSemana: campos.diaDaSemana, horario };
    case 'MENSAL':
      return validarEntre(campos.diaDoMes, 1, 31, 'invalido') ? null : { tipo: 'MENSAL', diaDoMes: Number(campos.diaDoMes.trim()), horario };
    case 'PERSONALIZADA':
      return validarEntre(campos.intervalo, 1, INTERVALO_MAXIMO[campos.unidade], 'invalido')
        ? null
        : { tipo: 'PERSONALIZADA', intervalo: Number(campos.intervalo.trim()), unidade: campos.unidade, horario };
  }
}

export function montarNovaExecucao(campos: CamposPlano): NovaExecucaoDTO {
  return {
    nome: campos.nome.trim() || null,
    conexaoId: campos.conexaoId ?? '',
    tipo: campos.tipo,
    selecao: campos.selecao,
  };
}

export function montarDadosAgendamento(campos: CamposPlano): DadosAgendamentoDTO | null {
  const frequencia = frequenciaDosCampos(campos);
  if (!frequencia) return null;
  return {
    nome: campos.nome.trim(),
    conexaoId: campos.conexaoId ?? '',
    tipo: campos.tipo,
    selecao: campos.selecao,
    frequencia,
    ativo: campos.ativo,
  };
}

export function camposDoAgendamento(agendamento: AgendamentoBackupDTO, nome = agendamento.nome): CamposPlano {
  const { frequencia } = agendamento;
  return {
    ...camposPlanoIniciais,
    nome,
    conexaoId: agendamento.conexaoId,
    tipo: agendamento.tipo,
    selecao: agendamento.selecao,
    quando: frequencia.tipo,
    horario: frequencia.horario,
    diaDaSemana: frequencia.tipo === 'SEMANAL' ? frequencia.diaDaSemana : camposPlanoIniciais.diaDaSemana,
    diaDoMes: frequencia.tipo === 'MENSAL' ? String(frequencia.diaDoMes) : camposPlanoIniciais.diaDoMes,
    intervalo: frequencia.tipo === 'PERSONALIZADA' ? String(frequencia.intervalo) : camposPlanoIniciais.intervalo,
    unidade: frequencia.tipo === 'PERSONALIZADA' ? frequencia.unidade : camposPlanoIniciais.unidade,
    ativo: agendamento.ativo,
  };
}

export function nomeDaCopia(nome: string): string {
  return `Cópia de ${nome}`.slice(0, TAMANHO_MAXIMO_NOME_BACKUP);
}

export function tituloDoAlerta(alerta: AlertaBackupDTO): string {
  return alerta.tipo === 'ULTIMO_BACKUP_FALHOU' ? `${alerta.nome}: o último backup falhou` : `${alerta.nome}: backup atrasado`;
}

export function textoDoAlerta(alerta: AlertaBackupDTO): string {
  if (alerta.tipo === 'ULTIMO_BACKUP_FALHOU') {
    return alerta.motivo ?? `O backup de ${alerta.banco} não terminou, e nenhum outro foi feito depois dele.`;
  }
  return `O lembrete de ${alerta.banco} passou e o backup não foi feito. Com o site fechado, nada roda sozinho.`;
}

export function descreverImpactoDaExclusao(impacto: ImpactoNaConexaoDTO | null): string | null {
  if (!impacto || impacto.agendamentos === 0) return null;
  const quantidade = impacto.agendamentos;
  const nomes = impacto.nomesDosAgendamentos.join(', ');
  return `${formatarNumero(quantidade)} ${pluralizar(quantidade, 'agendamento fica desativado e marcado', 'agendamentos ficam desativados e marcados')} como sem conexão (${nomes}). O histórico de backups é mantido, e os arquivos no seu computador não são afetados.`;
}
