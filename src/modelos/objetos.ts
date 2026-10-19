import type { ConsultaDetalhadaDTO, DirecaoOrdenacao } from './consultas';

export type TipoVisao = 'COMUM' | 'MATERIALIZADA';

export type TipoObjetoBanco = 'TABELA' | 'VISAO' | 'VISAO_MATERIALIZADA';

export interface ReferenciaObjetoDTO {
  tipo: TipoObjetoBanco;
  esquema: string;
  nome: string;
}

export interface ColunaVisaoDTO {
  nome: string;
  tipo: string;
}

export interface MaterializacaoDTO {
  populada: boolean;
  tamanhoBytes: number;
  linhas: number;
  ultimaAtualizacao: string | null;
  atualizacao: ConsultaDetalhadaDTO | null;
}

export interface VisaoDTO {
  id: string;
  tipo: TipoVisao;
  esquema: string;
  nome: string;
  dono: string;
  descricao: string | null;
  definicao: string;
  colunas: ColunaVisaoDTO[];
  dependeDe: ReferenciaObjetoDTO[];
  usadaPor: ReferenciaObjetoDTO[];
  consultas: ConsultaDetalhadaDTO[];
  materializacao: MaterializacaoDTO | null;
}

export interface ListaVisoesDTO {
  geradoEm: string;
  visoes: VisaoDTO[];
}

export type SituacaoMaterializada = 'ATUALIZADA' | 'DESATUALIZADA' | 'NAO_POPULADA';

export type FiltroSituacaoVisao = 'SEM_DADOS' | 'DESATUALIZADAS' | 'SEM_LEITURA';

export type OrdenacaoVisoes = 'NOME' | 'LEITURAS' | 'TAMANHO' | 'ATUALIZACAO';

export interface FiltrosVisoes {
  busca: string;
  tipo: TipoVisao | null;
  esquema: string | null;
  situacao: FiltroSituacaoVisao | null;
  ordenacao: OrdenacaoVisoes;
  direcao: DirecaoOrdenacao;
  pagina: number;
}

export type MetodoIndice = 'BTREE' | 'HASH' | 'GIN' | 'GIST' | 'SPGIST' | 'BRIN';

export type RestricaoIndice = 'CHAVE_PRIMARIA' | 'UNICA' | 'EXCLUSAO';

export interface TabelaDoIndiceDTO {
  tipo: Exclude<TipoObjetoBanco, 'VISAO'>;
  esquema: string;
  nome: string;
  tamanhoBytes: number;
  linhas: number;
  insercoes: number;
  atualizacoes: number;
  atualizacoesHot: number;
}

export interface UsoDoIndiceDTO {
  consulta: ConsultaDetalhadaDTO;
  etapa: string;
  leiturasPorExecucao: number;
  versao: string;
  versaoAtual: string;
  usadoAte: string | null;
}

export interface IndiceDTO {
  id: string;
  esquema: string;
  nome: string;
  tabela: TabelaDoIndiceDTO;
  metodo: MetodoIndice;
  colunas: string[];
  incluidas: string[];
  predicado: string | null;
  unico: boolean;
  restricao: RestricaoIndice | null;
  valido: boolean;
  definicao: string;
  tamanhoBytes: number;
  leituras: number;
  linhasLidas: number;
  observadoDesde: string;
  funcoes: string[];
  usos: UsoDoIndiceDTO[];
}

export interface SugestaoDeIndiceDTO {
  tabela: string;
  colunas: string[];
  comando: string;
  extensao: string | null;
  consultas: ConsultaDetalhadaDTO[];
}

export interface ListaIndicesDTO {
  geradoEm: string;
  coletaDesde: string;
  indices: IndiceDTO[];
  sugestoes: SugestaoDeIndiceDTO[];
}

export type SituacaoIndice =
  | 'INVALIDO'
  | 'DUPLICADO'
  | 'REDUNDANTE'
  | 'SEM_USO'
  | 'EM_OBSERVACAO'
  | 'GARANTE_UNICIDADE'
  | 'EM_USO';

export type FiltroSituacaoIndice = 'INVALIDOS' | 'DUPLICADOS' | 'SEM_USO';

export type OrdenacaoIndices = 'NOME' | 'TAMANHO' | 'LEITURAS';

export type AbaIndices = 'EXISTENTES' | 'SUGERIDOS';

export interface ColunaTabelaDTO {
  nome: string;
  tipo: string;
  anulavel: boolean;
  padrao: string | null;
}

export type EstrategiaParticionamento = 'RANGE' | 'LIST' | 'HASH';

export interface ParticaoDTO {
  id: string;
  esquema: string;
  nome: string;
  limites: string;
  tamanhoBytes: number;
  linhas: number;
  linhasMortas: number;
  idadeTransacoes: number;
  ultimoVacuum: string | null;
  ultimoAutovacuum: string | null;
}

export interface ParticionamentoDTO {
  estrategia: EstrategiaParticionamento;
  chave: string;
  particoes: ParticaoDTO[];
}

export interface IndiceDaTabelaDTO {
  id: string;
  nome: string;
  colunas: string[];
  restricao: RestricaoIndice | null;
  unico: boolean;
  valido: boolean;
  tamanhoBytes: number;
  leituras: number;
}

export interface LeituraDaTabelaDTO {
  consulta: ConsultaDetalhadaDTO;
  etapa: string;
  indice: string | null;
  leiturasPorExecucao: number;
}

export interface IndiceSugeridoDaTabelaDTO {
  colunas: string[];
  comando: string;
  extensao: string | null;
}

export interface AjusteAutovacuumDTO {
  parametro: string;
  valor: string;
  padrao: string;
}

export interface PontoDeCrescimentoDTO {
  dia: string;
  tamanhoBytes: number;
  linhas: number;
}

export type MomentoGatilho = 'ANTES' | 'DEPOIS' | 'EM_VEZ_DE';

export type EventoGatilho = 'INSERCAO' | 'ATUALIZACAO' | 'EXCLUSAO' | 'TRUNCAMENTO';

export type NivelGatilho = 'LINHA' | 'COMANDO';

export interface GatilhoDaTabelaDTO {
  nome: string;
  funcao: string;
  momento: MomentoGatilho;
  eventos: EventoGatilho[];
  nivel: NivelGatilho;
  ativo: boolean;
}

export interface TabelaDTO {
  id: string;
  esquema: string;
  nome: string;
  dono: string;
  descricao: string | null;
  colunas: ColunaTabelaDTO[];
  chavePrimaria: string[] | null;
  tamanhoDadosBytes: number;
  tamanhoIndicesBytes: number;
  tamanhoToastBytes: number;
  linhas: number;
  linhasMortas: number;
  alteracoesDesdeAnalyze: number;
  insercoes: number;
  atualizacoes: number;
  atualizacoesHot: number;
  exclusoes: number;
  leiturasSequenciais: number;
  linhasLidasSequencialmente: number;
  leiturasPorIndice: number;
  linhasLidasPorIndice: number;
  ultimoVacuum: string | null;
  ultimoAutovacuum: string | null;
  ultimoAnalyze: string | null;
  ultimoAutoanalyze: string | null;
  idadeTransacoes: number;
  limiteCongelamento: number;
  autovacuum: AjusteAutovacuumDTO[];
  particionamento: ParticionamentoDTO | null;
  indices: IndiceDaTabelaDTO[];
  indicesSugeridos: IndiceSugeridoDaTabelaDTO[];
  usadaPor: ReferenciaObjetoDTO[];
  gatilhos: GatilhoDaTabelaDTO[];
  leituras: LeituraDaTabelaDTO[];
  crescimento: PontoDeCrescimentoDTO[];
}

export interface ListaTabelasDTO {
  geradoEm: string;
  coletaDesde: string;
  tabelas: TabelaDTO[];
}

export type SituacaoTabela =
  | 'IDADE_ALTA'
  | 'PRECISA_VACUUM'
  | 'LIDA_INTEIRA'
  | 'ESTATISTICAS_DESATUALIZADAS'
  | 'SEM_CHAVE_PRIMARIA';

export type OrdenacaoTabelas = 'NOME' | 'LINHAS' | 'TAMANHO' | 'LEITURAS' | 'MANUTENCAO';

export interface FiltrosTabelas {
  busca: string;
  esquema: string | null;
  situacao: SituacaoTabela | null;
  ordenacao: OrdenacaoTabelas;
  direcao: DirecaoOrdenacao;
  pagina: number;
}

export type TipoFuncao = 'FUNCAO' | 'PROCEDIMENTO' | 'GATILHO';

export type VolatilidadeFuncao = 'IMUTAVEL' | 'ESTAVEL' | 'VOLATIL';

export type ModoParametro = 'IN' | 'OUT' | 'INOUT' | 'VARIADIC';

export type RastreamentoFuncoes = 'NENHUM' | 'PL' | 'TODAS';

export interface ParametroFuncaoDTO {
  nome: string | null;
  tipo: string;
  modo: ModoParametro;
  padrao: string | null;
}

export interface UsoDaFuncaoDTO {
  chamadas: number;
  tempoTotalMs: number;
  tempoProprioMs: number;
}

export interface GatilhoDaFuncaoDTO {
  nome: string;
  tabela: ReferenciaObjetoDTO;
  momento: MomentoGatilho;
  eventos: EventoGatilho[];
  nivel: NivelGatilho;
  ativo: boolean;
}

export interface IndiceDaFuncaoDTO {
  id: string;
  nome: string;
  tabela: string;
}

export interface FuncaoDTO {
  id: string;
  esquema: string;
  nome: string;
  argumentos: string;
  tipo: TipoFuncao;
  linguagem: string;
  retorno: string | null;
  parametros: ParametroFuncaoDTO[];
  volatilidade: VolatilidadeFuncao;
  estrita: boolean;
  segurancaDefinidor: boolean;
  configuracoes: string[];
  dono: string;
  descricao: string | null;
  definicao: string;
  observadaDesde: string;
  uso: UsoDaFuncaoDTO | null;
  gatilhos: GatilhoDaFuncaoDTO[];
  indices: IndiceDaFuncaoDTO[];
  visoes: ReferenciaObjetoDTO[];
  consultas: ConsultaDetalhadaDTO[];
}

export interface ListaFuncoesDTO {
  geradoEm: string;
  coletaDesde: string;
  rastreamento: RastreamentoFuncoes;
  funcoes: FuncaoDTO[];
}

export type SituacaoFuncao = 'RISCO_DE_SEGURANCA' | 'PESADA' | 'SEM_CHAMADAS';

export type OrdenacaoFuncoes = 'NOME' | 'CHAMADAS' | 'TEMPO_TOTAL' | 'TEMPO_MEDIO';

export interface FiltrosFuncoes {
  busca: string;
  tipo: TipoFuncao | null;
  esquema: string | null;
  linguagem: string | null;
  situacao: SituacaoFuncao | null;
  ordenacao: OrdenacaoFuncoes;
  direcao: DirecaoOrdenacao;
  pagina: number;
}

export interface FiltrosIndices {
  busca: string;
  esquema: string | null;
  tabela: string | null;
  situacao: FiltroSituacaoIndice | null;
  ordenacao: OrdenacaoIndices;
  direcao: DirecaoOrdenacao;
  pagina: number;
  aba: AbaIndices;
}
