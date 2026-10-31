import { PREFIXO_ARMAZENAMENTO } from '@/configuracoes/aplicacao';
import type {
  AgendamentoBackupDTO,
  AlertaBackupDTO,
  ArquivoDoBackupDTO,
  DadosAgendamentoDTO,
  EtapaExecucao,
  ExecucaoBackupDTO,
  FrequenciaBackup,
  ImpactoNaConexaoDTO,
  ObjetoBackupDTO,
  ProximoBackupDTO,
  ResumoBackupDTO,
  SelecaoObjetos,
  TipoBackup,
} from '@/modelos/backup';
import type { ConexaoSalvaDTO } from '@/modelos/conexao';
import { nomeDoArquivo, nomeSugeridoDoBackup, rotuloTipoBackup } from '@/regras/backup';
import { descreverFrequencia, lembreteDevido, ocorrenciaSeguinte, ocorrenciasEntre, situacaoDoAgendamento } from '@/regras/frequenciaBackup';
import { objetosAceitos, quantidadeNaSelecao, tamanhoDaSelecao } from '@/regras/selecaoObjetosBackup';
import { formatarTamanho } from '@/utilitarios/formatacao';
import { gerarFuncoes } from './funcoes';
import { gerarTabelas } from './tabelas';
import { gerarVisoes } from './visoes';

const CHAVE_BACKUP = `${PREFIXO_ARMAZENAMENTO}simulacao:backup`;
const CHAVE_FALHAR_BACKUPS = `${PREFIXO_ARMAZENAMENTO}simulacao:falhar-backups`;

const VERSAO_DO_ESTADO = 2;
const LIMITE_DE_EXECUCOES = 800;
const DIA_MS = 86_400_000;
const DIAS_DE_HISTORICO = 30;
const DURACAO_DA_EXECUCAO_MS = 24_000;
const DURACAO_DA_ESTRUTURA_MS = 14_000;
const LIMITE_SEM_SINAL_MS = 5000;
const FRACAO_DA_FALHA = 0.6;
const FRACAO_DA_FALHA_DE_CONEXAO = 0.04;
const FIM_DA_CONEXAO = 0.06;
const FIM_DA_LEITURA = 0.18;
const FIM_DA_EXPORTACAO = 0.92;
const BYTES_POR_SEGUNDO = 18 * 1024 ** 2;
const BYTES_POR_OBJETO_NA_ESTRUTURA = 6 * 1024;
const COMPRESSAO_DOS_DADOS = 0.28;
const SEQUENCIA_DO_PADRAO = /^nextval\('([\w$.]+)'::regclass\)$/;
const PROXIMOS_NO_RESUMO = 4;
const ULTIMAS_NO_RESUMO = 6;

const MOTIVOS_DE_FALHA = [
  'O PostgreSQL encerrou a conexão enquanto a tabela public.auditoria era lida.',
  'O usuário do backup perdeu a permissão de leitura em public.pagamentos.',
  'A transferência para o navegador parou antes de o arquivo terminar.',
];

const MOTIVO_DA_INTERRUPCAO = 'A aba foi fechada ou recarregada antes de o arquivo terminar. Nenhum arquivo foi salvo.';

interface AgendamentoSimulado {
  id: string;
  nome: string;
  conexaoId: string | null;
  conexaoNome: string;
  banco: string;
  tipo: TipoBackup;
  selecao: SelecaoObjetos;
  frequencia: FrequenciaBackup;
  ativo: boolean;
  vigenteDesde: string;
  criadoEm: string;
  atualizadoEm: string;
}

type ExecucaoSimulada = Omit<ExecucaoBackupDTO, 'situacao' | 'progresso' | 'etapa' | 'objetosProcessados' | 'objetoAtual' | 'bytesTransferidos' | 'interrompida'> & {
  situacaoFinal: 'CONCLUIDO' | 'FALHOU' | 'CANCELADO';
  terminaEm: string;
  fracaoFinal: number;
  tamanhoPrevistoBytes: number;
  ultimoSinalEm: string;
  interrompida: boolean;
};

interface EstadoBackup {
  versao: number;
  semeado: boolean;
  agendamentos: AgendamentoSimulado[];
  execucoes: ExecucaoSimulada[];
}

type EstadoPorConta = Record<string, EstadoBackup>;

const ESTADO_INICIAL: EstadoBackup = { versao: VERSAO_DO_ESTADO, semeado: false, agendamentos: [], execucoes: [] };

let estadoEmMemoria: EstadoPorConta | null = null;
const execucoesDestaAba = new Set<string>();

function lerTudo(): EstadoPorConta {
  try {
    const salvo = window.localStorage.getItem(CHAVE_BACKUP);
    if (salvo === null) return estadoEmMemoria ?? {};
    const bruto: unknown = JSON.parse(salvo);
    return bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? (bruto as EstadoPorConta) : {};
  } catch {
    return estadoEmMemoria ?? {};
  }
}

function gravarTudo(todos: EstadoPorConta): void {
  estadoEmMemoria = todos;
  try {
    window.localStorage.setItem(CHAVE_BACKUP, JSON.stringify(todos));
  } catch {
    return;
  }
}

function lerEstado(conta: string): EstadoBackup {
  const salvo = lerTudo()[conta];
  return salvo?.versao === VERSAO_DO_ESTADO ? { ...ESTADO_INICIAL, ...salvo } : { ...ESTADO_INICIAL };
}

function gravarEstado(conta: string, estado: EstadoBackup): void {
  gravarTudo({ ...lerTudo(), [conta]: estado });
}

export function restaurarBackupSimulado(): void {
  estadoEmMemoria = null;
  execucoesDestaAba.clear();
  try {
    window.localStorage.removeItem(CHAVE_BACKUP);
    window.localStorage.removeItem(CHAVE_FALHAR_BACKUPS);
  } catch {
    return;
  }
}

export function esquecerExecucoesDaAba(): void {
  execucoesDestaAba.clear();
}

export function removerBackupDaConta(conta: string): void {
  const todos = lerTudo();
  delete todos[conta];
  gravarTudo(todos);
}

export function definirFalhaDosBackups(falhar: boolean): void {
  try {
    if (falhar) window.localStorage.setItem(CHAVE_FALHAR_BACKUPS, 'true');
    else window.localStorage.removeItem(CHAVE_FALHAR_BACKUPS);
  } catch {
    return;
  }
}

function backupsDevemFalhar(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_FALHAR_BACKUPS) === 'true';
  } catch {
    return false;
  }
}

function ruido(semente: string): number {
  let hash = 2166136261;
  for (const letra of semente) {
    hash ^= letra.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

let catalogo: ObjetoBackupDTO[] | null = null;

export function objetosDoBanco(agora: Date): ObjetoBackupDTO[] {
  if (catalogo) return catalogo;
  const { tabelas } = gerarTabelas(agora);
  const { visoes } = gerarVisoes(agora);
  const { funcoes } = gerarFuncoes(agora);
  const sequencias = new Map<string, ObjetoBackupDTO>();
  for (const tabela of tabelas) {
    for (const coluna of tabela.colunas) {
      const nome = SEQUENCIA_DO_PADRAO.exec(coluna.padrao ?? '')?.[1];
      if (nome) sequencias.set(nome, { id: `${tabela.esquema}.${nome}`, tipo: 'SEQUENCIA', esquema: tabela.esquema, nome, tamanhoBytes: null });
    }
  }
  catalogo = [
    ...tabelas.map(
      (tabela): ObjetoBackupDTO => ({
        id: `${tabela.esquema}.${tabela.nome}`,
        tipo: 'TABELA',
        esquema: tabela.esquema,
        nome: tabela.nome,
        tamanhoBytes: tabela.tamanhoDadosBytes + tabela.tamanhoToastBytes,
      }),
    ),
    ...visoes.map(
      (visao): ObjetoBackupDTO => ({
        id: `${visao.esquema}.${visao.nome}`,
        tipo: visao.tipo === 'MATERIALIZADA' ? 'VISAO_MATERIALIZADA' : 'VISAO',
        esquema: visao.esquema,
        nome: visao.nome,
        tamanhoBytes: null,
      }),
    ),
    ...funcoes.flatMap((funcao): ObjetoBackupDTO[] =>
      funcao.tipo === 'GATILHO'
        ? []
        : [
            {
              id: funcao.id,
              tipo: funcao.tipo === 'PROCEDIMENTO' ? 'PROCEDIMENTO' : 'FUNCAO',
              esquema: funcao.esquema,
              nome: `${funcao.nome}(${funcao.argumentos})`,
              tamanhoBytes: null,
            },
          ],
    ),
    ...sequencias.values(),
  ];
  return catalogo;
}

function medir(selecao: SelecaoObjetos, tipo: TipoBackup, semente: string, agora: Date): { tamanhoBytes: number; duracaoMs: number; objetos: number } {
  const objetos = objetosDoBanco(agora);
  const quantidade = quantidadeNaSelecao(selecao, objetos, tipo);
  const variacao = 0.97 + ruido(semente) * 0.06;
  const dados = tipo === 'ESTRUTURA' ? 0 : tamanhoDaSelecao(selecao, objetos, tipo) * COMPRESSAO_DOS_DADOS;
  const estrutura = tipo === 'DADOS' ? 0 : quantidade * BYTES_POR_OBJETO_NA_ESTRUTURA;
  const tamanhoBytes = Math.round((dados + estrutura) * variacao);
  return { tamanhoBytes, duracaoMs: Math.round(Math.max(2500, (tamanhoBytes / BYTES_POR_SEGUNDO) * 1000 * variacao)), objetos: quantidade };
}

function objetosDaExecucao(execucao: Pick<ExecucaoSimulada, 'selecao' | 'tipo'>, agora: Date): string[] {
  if (execucao.selecao.modo === 'ESCOLHIDOS') return execucao.selecao.objetos;
  return objetosAceitos(objetosDoBanco(agora), execucao.tipo).map((objeto) => objeto.id);
}

function etapaNaFracao(fracao: number): EtapaExecucao {
  if (fracao < FIM_DA_CONEXAO) return 'CONECTANDO';
  if (fracao < FIM_DA_LEITURA) return 'LENDO_ESTRUTURA';
  return fracao < FIM_DA_EXPORTACAO ? 'EXPORTANDO' : 'FINALIZANDO';
}

function andamentoNaFracao(execucao: ExecucaoSimulada, fracao: number, agora: Date) {
  const objetos = objetosDaExecucao(execucao, agora);
  const exportada = Math.min(1, Math.max(0, (fracao - FIM_DA_LEITURA) / (FIM_DA_EXPORTACAO - FIM_DA_LEITURA)));
  const processados = Math.floor(exportada * objetos.length);
  return {
    etapa: etapaNaFracao(fracao),
    objetosProcessados: processados,
    objetoAtual: fracao >= FIM_DA_LEITURA && fracao < FIM_DA_EXPORTACAO ? (objetos[processados] ?? null) : null,
    bytesTransferidos: Math.round(execucao.tamanhoPrevistoBytes * fracao),
  };
}

function paraDTO(execucao: ExecucaoSimulada, agora: Date): ExecucaoBackupDTO {
  const { situacaoFinal, terminaEm, fracaoFinal, tamanhoPrevistoBytes: _previsto, ultimoSinalEm: _sinal, ...resto } = execucao;
  const fim = new Date(terminaEm).getTime();
  if (agora.getTime() < fim) {
    const inicio = new Date(execucao.iniciadaEm).getTime();
    const fracao = ((agora.getTime() - inicio) / (fim - inicio)) * fracaoFinal;
    return {
      ...resto,
      ...andamentoNaFracao(execucao, fracao, agora),
      situacao: 'EM_ANDAMENTO',
      progresso: execucao.tipo === 'ESTRUTURA' ? null : Math.min(99, Math.max(1, Math.round(fracao * 100))),
      duracaoMs: null,
      tamanhoBytes: null,
      motivoDaFalha: null,
    };
  }
  const concluida = situacaoFinal === 'CONCLUIDO';
  return {
    ...resto,
    ...andamentoNaFracao(execucao, fracaoFinal, agora),
    objetoAtual: null,
    arquivo: concluida ? execucao.arquivo : null,
    situacao: situacaoFinal,
    progresso: concluida ? 100 : null,
  };
}

function execucaoDoAgendamento(agendamento: AgendamentoSimulado, instante: Date, agora: Date): ExecucaoSimulada {
  const semente = `${agendamento.id}-${instante.toISOString()}`;
  const falhou = ruido(`${semente}-falha`) < 0.03;
  const { tamanhoBytes, duracaoMs, objetos } = medir(agendamento.selecao, agendamento.tipo, semente, agora);
  return {
    id: `execucao-${agendamento.id}-${instante.getTime()}`,
    nome: agendamento.nome,
    origem: 'AGENDADA',
    agendamentoId: agendamento.id,
    conexaoId: agendamento.conexaoId,
    conexaoNome: agendamento.conexaoNome,
    banco: agendamento.banco,
    tipo: agendamento.tipo,
    selecao: agendamento.selecao,
    objetosIncluidos: objetos,
    arquivo: falhou ? null : nomeDoArquivo(agendamento.banco, instante, agendamento.tipo, true),
    iniciadaEm: instante.toISOString(),
    duracaoMs: falhou ? Math.round(duracaoMs * 0.4) : duracaoMs,
    tamanhoBytes: falhou ? null : tamanhoBytes,
    tamanhoPrevistoBytes: tamanhoBytes,
    motivoDaFalha: falhou ? (MOTIVOS_DE_FALHA[Math.floor(ruido(`${semente}-motivo`) * MOTIVOS_DE_FALHA.length)] ?? null) : null,
    situacaoFinal: falhou ? 'FALHOU' : 'CONCLUIDO',
    terminaEm: instante.toISOString(),
    fracaoFinal: falhou ? FRACAO_DA_FALHA : 1,
    ultimoSinalEm: instante.toISOString(),
    interrompida: false,
  };
}

function interromper(execucao: ExecucaoSimulada): ExecucaoSimulada {
  const inicio = new Date(execucao.iniciadaEm).getTime();
  const fim = new Date(execucao.terminaEm).getTime();
  const sinal = new Date(execucao.ultimoSinalEm).getTime();
  return {
    ...execucao,
    situacaoFinal: 'FALHOU',
    interrompida: true,
    arquivo: null,
    tamanhoBytes: null,
    duracaoMs: sinal - inicio,
    motivoDaFalha: MOTIVO_DA_INTERRUPCAO,
    terminaEm: execucao.ultimoSinalEm,
    fracaoFinal: ((sinal - inicio) / (fim - inicio)) * execucao.fracaoFinal,
  };
}

export function interromperExecucoesDaAba(agora: Date): void {
  const todos = lerTudo();
  for (const estado of Object.values(todos)) {
    estado.execucoes = estado.execucoes.map((execucao) =>
      execucoesDestaAba.has(execucao.id) && agora.getTime() < new Date(execucao.terminaEm).getTime()
        ? interromper({ ...execucao, ultimoSinalEm: agora.toISOString() })
        : execucao,
    );
  }
  gravarTudo(todos);
  execucoesDestaAba.clear();
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', () => interromperExecucoesDaAba(new Date()));
}

function acompanharSinais(estado: EstadoBackup, agora: Date): boolean {
  let mudou = false;
  estado.execucoes = estado.execucoes.map((execucao) => {
    const fim = new Date(execucao.terminaEm).getTime();
    const sinal = new Date(execucao.ultimoSinalEm).getTime();
    if (execucoesDestaAba.has(execucao.id)) {
      if (agora.getTime() >= fim) return execucao;
      mudou = true;
      return { ...execucao, ultimoSinalEm: agora.toISOString() };
    }
    if (fim <= sinal || sinal + LIMITE_SEM_SINAL_MS >= Math.min(agora.getTime(), fim)) return execucao;
    mudou = true;
    return interromper(execucao);
  });
  return mudou;
}

interface EsbocoDoAgendamento {
  nome: string;
  conexao: ConexaoSalvaDTO;
  tipo: TipoBackup;
  selecao: SelecaoObjetos;
  frequencia: FrequenciaBackup;
  ativo?: boolean;
  parado?: boolean;
  falhaNaUltima?: boolean;
}

function esbocosIniciais(salvas: ConexaoSalvaDTO[]): EsbocoDoAgendamento[] {
  const [primeira, segunda = primeira, terceira = segunda] = salvas;
  if (!primeira || !segunda || !terceira) return [];
  return [
    {
      nome: `${primeira.banco} diário`,
      conexao: primeira,
      tipo: 'COMPLETO',
      selecao: { modo: 'BANCO_INTEIRO' },
      frequencia: { tipo: 'DIARIA', horario: '02:00' },
    },
    {
      nome: 'Pedidos a cada 6 horas',
      conexao: segunda,
      tipo: 'DADOS',
      selecao: { modo: 'ESCOLHIDOS', objetos: ['public.pedidos', 'public.itens_pedido', 'public.pagamentos'] },
      frequencia: { tipo: 'PERSONALIZADA', intervalo: 6, unidade: 'HORAS', horario: '00:30' },
    },
    {
      nome: 'Estrutura semanal',
      conexao: primeira,
      tipo: 'ESTRUTURA',
      selecao: { modo: 'BANCO_INTEIRO' },
      frequencia: { tipo: 'SEMANAL', diaDaSemana: 0, horario: '03:00' },
      falhaNaUltima: true,
    },
    {
      nome: 'Auditoria toda madrugada',
      conexao: terceira,
      tipo: 'COMPLETO',
      selecao: { modo: 'ESCOLHIDOS', objetos: ['auditoria.acoes_recentes', 'public.auditoria'] },
      frequencia: { tipo: 'DIARIA', horario: '04:00' },
      parado: true,
    },
    {
      nome: 'Fechamento do mês',
      conexao: terceira,
      tipo: 'COMPLETO',
      selecao: { modo: 'BANCO_INTEIRO' },
      frequencia: { tipo: 'MENSAL', diaDoMes: 1, horario: '01:30' },
      ativo: false,
    },
  ];
}

function semear(estado: EstadoBackup, salvas: ConexaoSalvaDTO[], agora: Date): void {
  const inicio = new Date(agora.getTime() - DIAS_DE_HISTORICO * DIA_MS);
  const esbocos = esbocosIniciais(salvas);
  estado.agendamentos = esbocos.map((esboco, indice): AgendamentoSimulado => {
    const desde = (esboco.parado ? new Date(agora.getTime() - 5 * DIA_MS) : inicio).toISOString();
    return {
      id: `agendamento-${indice + 1}`,
      nome: esboco.nome,
      conexaoId: esboco.conexao.id,
      conexaoNome: esboco.conexao.nome,
      banco: esboco.conexao.banco,
      tipo: esboco.tipo,
      selecao: esboco.selecao,
      frequencia: esboco.frequencia,
      ativo: esboco.ativo !== false,
      vigenteDesde: desde,
      criadoEm: desde,
      atualizadoEm: desde,
    };
  });
  estado.execucoes = estado.agendamentos
    .flatMap((agendamento, indice) => {
      if (!agendamento.ativo || esbocos[indice]?.parado) return [];
      return ocorrenciasEntre(agendamento.frequencia, inicio, inicio, agora).map((instante) => execucaoDoAgendamento(agendamento, instante, agora));
    })
    .sort((a, b) => b.iniciadaEm.localeCompare(a.iniciadaEm))
    .slice(0, LIMITE_DE_EXECUCOES);
  esbocos.forEach((esboco, indice) => {
    if (!esboco.falhaNaUltima) return;
    const id = `agendamento-${indice + 1}`;
    const ultima = estado.execucoes.find((execucao) => execucao.agendamentoId === id);
    if (!ultima) return;
    ultima.situacaoFinal = 'FALHOU';
    ultima.arquivo = null;
    ultima.tamanhoBytes = null;
    ultima.fracaoFinal = FRACAO_DA_FALHA;
    ultima.motivoDaFalha = 'O PostgreSQL encerrou a conexão enquanto a estrutura do banco era lida.';
  });
  estado.semeado = true;
}

function estadoAtual(conta: string, salvas: ConexaoSalvaDTO[], agora: Date): EstadoBackup {
  const estado = lerEstado(conta);
  if (!estado.semeado) {
    if (salvas.length === 0) return estado;
    semear(estado, salvas, agora);
    gravarEstado(conta, estado);
    return estado;
  }
  if (acompanharSinais(estado, agora)) gravarEstado(conta, estado);
  return estado;
}

function ultimaDoAgendamento(estado: EstadoBackup, id: string): ExecucaoSimulada | null {
  return estado.execucoes.find((execucao) => execucao.agendamentoId === id) ?? null;
}

function agendamentoParaDTO(agendamento: AgendamentoSimulado, estado: EstadoBackup, agora: Date): AgendamentoBackupDTO {
  const ultima = ultimaDoAgendamento(estado, agendamento.id);
  const ultimaDTO = ultima ? paraDTO(ultima, agora) : null;
  const estadoDoAgendamento = { ...agendamento, ultimaExecucaoEm: ultima?.iniciadaEm ?? null };
  const situacao = situacaoDoAgendamento(estadoDoAgendamento, agora);
  const vigente = agendamento.ativo && agendamento.conexaoId !== null;
  return {
    ...agendamento,
    situacao,
    lembreteEm: lembreteDevido(estadoDoAgendamento, agora)?.toISOString() ?? null,
    proximaExecucaoEm: vigente ? ocorrenciaSeguinte(agendamento.frequencia, new Date(agendamento.vigenteDesde), agora).toISOString() : null,
    ultimaExecucao: ultimaDTO ? { id: ultimaDTO.id, situacao: ultimaDTO.situacao, iniciadaEm: ultimaDTO.iniciadaEm } : null,
  };
}

function ordenarAgendamentos(lista: AgendamentoBackupDTO[]): AgendamentoBackupDTO[] {
  return [...lista].sort((a, b) => {
    if (a.proximaExecucaoEm && b.proximaExecucaoEm) return a.proximaExecucaoEm.localeCompare(b.proximaExecucaoEm);
    if (a.proximaExecucaoEm) return -1;
    if (b.proximaExecucaoEm) return 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

export function listarAgendamentosSimulados(conta: string, salvas: ConexaoSalvaDTO[], agora: Date, vazio = false): AgendamentoBackupDTO[] {
  if (vazio) return [];
  const estado = estadoAtual(conta, salvas, agora);
  return ordenarAgendamentos(estado.agendamentos.map((agendamento) => agendamentoParaDTO(agendamento, estado, agora)));
}

export function listarExecucoesSimuladas(conta: string, salvas: ConexaoSalvaDTO[], agora: Date, vazio = false): ExecucaoBackupDTO[] {
  if (vazio) return [];
  return estadoAtual(conta, salvas, agora).execucoes.map((execucao) => paraDTO(execucao, agora));
}

function alertasDoEstado(estado: EstadoBackup, agora: Date): AlertaBackupDTO[] {
  const dosAgendamentos = estado.agendamentos.flatMap((agendamento): AlertaBackupDTO[] => {
    if (!agendamento.ativo || !agendamento.conexaoId) return [];
    const ultima = ultimaDoAgendamento(estado, agendamento.id);
    const dto = agendamentoParaDTO(agendamento, estado, agora);
    const alertas: AlertaBackupDTO[] = [];
    if (ultima && paraDTO(ultima, agora).situacao === 'FALHOU') {
      alertas.push({
        id: `falha-${agendamento.id}`,
        tipo: 'ULTIMO_BACKUP_FALHOU',
        nome: agendamento.nome,
        banco: agendamento.banco,
        ocorridoEm: ultima.iniciadaEm,
        motivo: ultima.motivoDaFalha,
        agendamentoId: agendamento.id,
        execucaoId: ultima.id,
      });
    }
    if (dto.situacao === 'ATRASADO') {
      alertas.push({
        id: `atraso-${agendamento.id}`,
        tipo: 'AGENDAMENTO_ATRASADO',
        nome: agendamento.nome,
        banco: agendamento.banco,
        ocorridoEm: ultima?.iniciadaEm ?? agendamento.vigenteDesde,
        motivo: null,
        agendamentoId: agendamento.id,
        execucaoId: null,
      });
    }
    return alertas;
  });

  const conexoesManuais = new Set<string>();
  const manuais = estado.execucoes.flatMap((execucao): AlertaBackupDTO[] => {
    if (execucao.origem !== 'MANUAL' || !execucao.conexaoId || conexoesManuais.has(execucao.conexaoId)) return [];
    conexoesManuais.add(execucao.conexaoId);
    if (paraDTO(execucao, agora).situacao !== 'FALHOU') return [];
    return [
      {
        id: `falha-${execucao.id}`,
        tipo: 'ULTIMO_BACKUP_FALHOU',
        nome: execucao.nome,
        banco: execucao.banco,
        ocorridoEm: execucao.iniciadaEm,
        motivo: execucao.motivoDaFalha,
        agendamentoId: null,
        execucaoId: execucao.id,
      },
    ];
  });

  return [...dosAgendamentos, ...manuais].sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === 'ULTIMO_BACKUP_FALHOU' ? -1 : 1;
    return b.ocorridoEm.localeCompare(a.ocorridoEm);
  });
}

export function listarAlertasSimulados(conta: string, salvas: ConexaoSalvaDTO[], agora: Date, vazio = false): AlertaBackupDTO[] {
  return vazio ? [] : alertasDoEstado(estadoAtual(conta, salvas, agora), agora);
}

export function resumoSimulado(conta: string, salvas: ConexaoSalvaDTO[], agora: Date, vazio = false): ResumoBackupDTO {
  const estado = vazio ? { ...ESTADO_INICIAL } : estadoAtual(conta, salvas, agora);
  const execucoes = estado.execucoes.map((execucao) => paraDTO(execucao, agora));
  const agendamentos = ordenarAgendamentos(estado.agendamentos.map((agendamento) => agendamentoParaDTO(agendamento, estado, agora)));
  const proximos = agendamentos.flatMap((agendamento): ProximoBackupDTO[] =>
    agendamento.proximaExecucaoEm
      ? [
          {
            agendamentoId: agendamento.id,
            nome: agendamento.nome,
            banco: agendamento.banco,
            quando: agendamento.proximaExecucaoEm,
            descricaoDaFrequencia: descreverFrequencia(agendamento.frequencia),
          },
        ]
      : [],
  );
  return {
    geradoEm: agora.toISOString(),
    totalExecucoes: execucoes.length,
    concluidas: execucoes.filter((execucao) => execucao.situacao === 'CONCLUIDO').length,
    falhas: execucoes.filter((execucao) => execucao.situacao === 'FALHOU').length,
    ultimaExecucao: execucoes[0] ?? null,
    proximosAgendamentos: proximos.slice(0, PROXIMOS_NO_RESUMO),
    ultimasExecucoes: execucoes.slice(0, ULTIMAS_NO_RESUMO),
    alertas: alertasDoEstado(estado, agora),
  };
}

interface PedidoDeExecucao {
  nome: string | null;
  tipo: TipoBackup;
  selecao: SelecaoObjetos;
  agendamentoId: string | null;
}

export function iniciarExecucaoSimulada(
  conta: string,
  salvas: ConexaoSalvaDTO[],
  conexao: ConexaoSalvaDTO,
  dados: PedidoDeExecucao,
  agora: Date,
  motivoDaFalha: string | null,
): ExecucaoBackupDTO {
  const estado = estadoAtual(conta, salvas, agora);
  const id = `execucao-manual-${crypto.randomUUID().slice(0, 8)}`;
  const falhou = motivoDaFalha !== null || backupsDevemFalhar();
  const { tamanhoBytes, objetos } = medir(dados.selecao, dados.tipo, id, agora);
  const duracaoPrevista = dados.tipo === 'ESTRUTURA' ? DURACAO_DA_ESTRUTURA_MS : DURACAO_DA_EXECUCAO_MS;
  const fracaoFinal = !falhou ? 1 : motivoDaFalha !== null ? FRACAO_DA_FALHA_DE_CONEXAO : FRACAO_DA_FALHA;
  const duracaoMs = Math.round(duracaoPrevista * fracaoFinal);
  const execucao: ExecucaoSimulada = {
    id,
    nome: dados.nome ?? nomeSugeridoDoBackup(conexao.banco, dados.tipo),
    origem: dados.agendamentoId ? 'AGENDADA' : 'MANUAL',
    agendamentoId: dados.agendamentoId,
    conexaoId: conexao.id,
    conexaoNome: conexao.nome,
    banco: conexao.banco,
    tipo: dados.tipo,
    selecao: dados.selecao,
    objetosIncluidos: objetos,
    arquivo: nomeDoArquivo(conexao.banco, agora, dados.tipo, true),
    iniciadaEm: agora.toISOString(),
    duracaoMs,
    tamanhoBytes: falhou ? null : tamanhoBytes,
    tamanhoPrevistoBytes: tamanhoBytes,
    motivoDaFalha: falhou ? (motivoDaFalha ?? MOTIVOS_DE_FALHA[0] ?? null) : null,
    situacaoFinal: falhou ? 'FALHOU' : 'CONCLUIDO',
    terminaEm: new Date(agora.getTime() + duracaoMs).toISOString(),
    fracaoFinal,
    ultimoSinalEm: agora.toISOString(),
    interrompida: false,
  };
  execucoesDestaAba.add(id);
  estado.execucoes = [execucao, ...estado.execucoes].slice(0, LIMITE_DE_EXECUCOES);
  gravarEstado(conta, estado);
  return paraDTO(execucao, agora);
}

export function buscarExecucaoSimulada(conta: string, salvas: ConexaoSalvaDTO[], id: string, agora: Date): ExecucaoBackupDTO | null {
  const execucao = estadoAtual(conta, salvas, agora).execucoes.find((item) => item.id === id);
  return execucao ? paraDTO(execucao, agora) : null;
}

export function cancelarExecucaoSimulada(conta: string, salvas: ConexaoSalvaDTO[], id: string, agora: Date): ExecucaoBackupDTO | null {
  const estado = estadoAtual(conta, salvas, agora);
  const atual = estado.execucoes.find((item) => item.id === id);
  if (!atual) return null;
  const inicio = new Date(atual.iniciadaEm).getTime();
  const fim = new Date(atual.terminaEm).getTime();
  const cancelada: ExecucaoSimulada = {
    ...atual,
    situacaoFinal: 'CANCELADO',
    arquivo: null,
    tamanhoBytes: null,
    duracaoMs: agora.getTime() - inicio,
    motivoDaFalha: null,
    terminaEm: agora.toISOString(),
    fracaoFinal: ((agora.getTime() - inicio) / (fim - inicio)) * atual.fracaoFinal,
  };
  estado.execucoes = estado.execucoes.map((item) => (item.id === id ? cancelada : item));
  gravarEstado(conta, estado);
  return paraDTO(cancelada, agora);
}

export function arquivoDaExecucaoSimulada(conta: string, salvas: ConexaoSalvaDTO[], id: string, agora: Date): ArquivoDoBackupDTO | null {
  const execucao = estadoAtual(conta, salvas, agora).execucoes.find((item) => item.id === id);
  if (!execucao || !execucao.arquivo || !execucoesDestaAba.has(id)) return null;
  if (paraDTO(execucao, agora).situacao !== 'CONCLUIDO') return null;
  const linhas = [
    '-- Orynt: arquivo de demonstração',
    '-- Origem dos dados: simulador do Orynt. Este arquivo não veio de um banco real e não serve para restaurar.',
    `-- Backup: ${execucao.nome}`,
    `-- Banco: ${execucao.banco} (${execucao.conexaoNome})`,
    `-- Tipo: ${rotuloTipoBackup[execucao.tipo]}`,
    `-- Iniciado em: ${execucao.iniciadaEm}`,
    `-- Tamanho mostrado na tela (simulado): ${formatarTamanho(execucao.tamanhoBytes ?? 0)}`,
    '-- Objetos incluídos:',
    ...objetosDaExecucao(execucao, agora).map((objeto) => `--   ${objeto}`),
    '',
  ];
  return { nome: execucao.arquivo, tipo: 'text/plain;charset=utf-8', conteudo: linhas.join('\n') };
}

export function excluirExecucaoSimulada(conta: string, id: string): void {
  const estado = lerEstado(conta);
  estado.execucoes = estado.execucoes.filter((execucao) => execucao.id !== id);
  gravarEstado(conta, estado);
}

export function criarAgendamentoSimulado(
  conta: string,
  salvas: ConexaoSalvaDTO[],
  conexao: ConexaoSalvaDTO,
  dados: DadosAgendamentoDTO,
  agora: Date,
): AgendamentoBackupDTO {
  const estado = estadoAtual(conta, salvas, agora);
  const instante = agora.toISOString();
  const novo: AgendamentoSimulado = {
    id: `agendamento-${crypto.randomUUID().slice(0, 8)}`,
    nome: dados.nome,
    conexaoId: conexao.id,
    conexaoNome: conexao.nome,
    banco: conexao.banco,
    tipo: dados.tipo,
    selecao: dados.selecao,
    frequencia: dados.frequencia,
    ativo: dados.ativo,
    vigenteDesde: instante,
    criadoEm: instante,
    atualizadoEm: instante,
  };
  estado.agendamentos = [...estado.agendamentos, novo];
  gravarEstado(conta, estado);
  return agendamentoParaDTO(novo, estado, agora);
}

export function editarAgendamentoSimulado(
  conta: string,
  salvas: ConexaoSalvaDTO[],
  id: string,
  conexao: ConexaoSalvaDTO,
  dados: DadosAgendamentoDTO,
  agora: Date,
): AgendamentoBackupDTO | null {
  const estado = estadoAtual(conta, salvas, agora);
  const atual = estado.agendamentos.find((agendamento) => agendamento.id === id);
  if (!atual) return null;
  const instante = agora.toISOString();
  const editado: AgendamentoSimulado = {
    ...atual,
    nome: dados.nome,
    conexaoId: conexao.id,
    conexaoNome: conexao.nome,
    banco: conexao.banco,
    tipo: dados.tipo,
    selecao: dados.selecao,
    frequencia: dados.frequencia,
    ativo: dados.ativo,
    vigenteDesde: instante,
    atualizadoEm: instante,
  };
  estado.agendamentos = estado.agendamentos.map((agendamento) => (agendamento.id === id ? editado : agendamento));
  gravarEstado(conta, estado);
  return agendamentoParaDTO(editado, estado, agora);
}

export function alternarAgendamentoSimulado(conta: string, salvas: ConexaoSalvaDTO[], id: string, ativo: boolean, agora: Date): AgendamentoBackupDTO | null {
  const estado = estadoAtual(conta, salvas, agora);
  const atual = estado.agendamentos.find((agendamento) => agendamento.id === id);
  if (!atual) return null;
  const instante = agora.toISOString();
  const alterado: AgendamentoSimulado = {
    ...atual,
    ativo,
    atualizadoEm: instante,
    ...(ativo ? { vigenteDesde: instante } : {}),
  };
  estado.agendamentos = estado.agendamentos.map((agendamento) => (agendamento.id === id ? alterado : agendamento));
  gravarEstado(conta, estado);
  return agendamentoParaDTO(alterado, estado, agora);
}

export function excluirAgendamentoSimulado(conta: string, id: string): void {
  const estado = lerEstado(conta);
  estado.agendamentos = estado.agendamentos.filter((agendamento) => agendamento.id !== id);
  gravarEstado(conta, estado);
}

export function impactosNasConexoes(conta: string, salvas: ConexaoSalvaDTO[], agora: Date): ImpactoNaConexaoDTO[] {
  const estado = estadoAtual(conta, salvas, agora);
  return salvas.map((salva) => {
    const agendamentos = estado.agendamentos.filter((agendamento) => agendamento.conexaoId === salva.id);
    const ultima = estado.execucoes.find((execucao) => execucao.conexaoId === salva.id);
    const dto = ultima ? paraDTO(ultima, agora) : null;
    return {
      conexaoId: salva.id,
      agendamentos: agendamentos.length,
      agendamentosAtivos: agendamentos.filter((agendamento) => agendamento.ativo).length,
      nomesDosAgendamentos: agendamentos.map((agendamento) => agendamento.nome),
      ultimaExecucao: dto ? { id: dto.id, situacao: dto.situacao, iniciadaEm: dto.iniciadaEm } : null,
    };
  });
}

export function desvincularConexaoDosAgendamentos(conta: string, conexaoId: string, agora: Date): void {
  const estado = lerEstado(conta);
  if (!estado.agendamentos.some((agendamento) => agendamento.conexaoId === conexaoId)) return;
  estado.agendamentos = estado.agendamentos.map((agendamento) =>
    agendamento.conexaoId === conexaoId ? { ...agendamento, conexaoId: null, ativo: false, atualizadoEm: agora.toISOString() } : agendamento,
  );
  gravarEstado(conta, estado);
}

export function atualizarConexaoNosAgendamentos(conta: string, conexao: Pick<ConexaoSalvaDTO, 'id' | 'nome' | 'banco'>): void {
  const estado = lerEstado(conta);
  if (!estado.agendamentos.some((agendamento) => agendamento.conexaoId === conexao.id)) return;
  estado.agendamentos = estado.agendamentos.map((agendamento) =>
    agendamento.conexaoId === conexao.id ? { ...agendamento, conexaoNome: conexao.nome, banco: conexao.banco } : agendamento,
  );
  gravarEstado(conta, estado);
}

export function objetosAceitosDaSelecao(selecao: SelecaoObjetos, tipo: TipoBackup, agora: Date): boolean {
  if (selecao.modo === 'BANCO_INTEIRO') return true;
  const aceitos = new Set(objetosAceitos(objetosDoBanco(agora), tipo).map((objeto) => objeto.id));
  return selecao.objetos.length > 0 && selecao.objetos.every((id) => aceitos.has(id));
}
