import type { DirecaoOrdenacao } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import type {
  EventoGatilho,
  FiltrosFuncoes,
  FuncaoDTO,
  GatilhoDaFuncaoDTO,
  MomentoGatilho,
  NivelGatilho,
  OrdenacaoFuncoes,
  RastreamentoFuncoes,
  SituacaoFuncao,
  TipoFuncao,
  UsoDaFuncaoDTO,
  VolatilidadeFuncao,
} from '@/modelos/objetos';
import {
  formatarDecimal,
  formatarDuracaoExtensa,
  formatarDuracaoMs,
  formatarNumero,
  formatarQuantidade,
  pluralizar,
} from '@/utilitarios/formatacao';
import { correspondeABusca, limparBusca, termosDaBusca } from './buscaConsultas';
import { DIAS_DE_OBSERVACAO } from './indices';
import type { LoteDeComandos } from './indices';
import { lerPagina, paginaAposMudanca } from './paginacaoLocal';
import { idDoObjeto, lerEsquema } from './visoes';
import type { TomDoAviso } from './visoes';

export const PERIODO_DAS_FUNCOES: PeriodoDashboard = 'ULTIMOS_30_DIAS';
export const TEMPO_MEDIO_PESADA_MS = 100;

const MS_POR_DIA = 86_400_000;
const ORDEM_ALFABETICA = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const NOMES_NA_FRASE = 3;
const MAXIMO_DE_PONTOS_SEPARADOS = 2;
const TAMANHO_MAXIMO_DO_ID = 600;
const ID_DE_FUNCAO = /^[A-Za-z_][\w$]{0,62}\.[A-Za-z_][\w$]{0,62}\([\w$ ,.[\]()"]*\)$/;
const NOME_DE_LINGUAGEM = /^[A-Za-z_][\w$]{0,62}$/;
const LINGUAGENS_NAO_PROCEDURAIS = new Set(['sql', 'c', 'internal']);

export const tiposFuncao: TipoFuncao[] = ['FUNCAO', 'PROCEDIMENTO', 'GATILHO'];

export const situacoesFuncao: SituacaoFuncao[] = ['RISCO_DE_SEGURANCA', 'PESADA', 'SEM_CHAMADAS'];

export const ordenacoesFuncoes: OrdenacaoFuncoes[] = ['NOME', 'CHAMADAS', 'TEMPO_TOTAL', 'TEMPO_MEDIO'];

export const rotuloTipoFuncao: Record<TipoFuncao, string> = {
  FUNCAO: 'Função',
  PROCEDIMENTO: 'Procedimento',
  GATILHO: 'De gatilho',
};

export const rotuloFiltroTipoFuncao: Record<TipoFuncao, string> = {
  FUNCAO: 'Funções',
  PROCEDIMENTO: 'Procedimentos',
  GATILHO: 'De gatilho',
};

export const rotuloSituacaoFuncao: Record<SituacaoFuncao, string> = {
  RISCO_DE_SEGURANCA: 'Risco de segurança',
  PESADA: 'Pesada',
  SEM_CHAMADAS: 'Sem chamadas',
};

export const rotuloFiltroSituacaoFuncao: Record<SituacaoFuncao, string> = {
  RISCO_DE_SEGURANCA: 'Risco de segurança',
  PESADA: 'Pesadas',
  SEM_CHAMADAS: 'Sem chamadas em 30 dias',
};

export const rotuloVolatilidade: Record<VolatilidadeFuncao, string> = {
  IMUTAVEL: 'Imutável',
  ESTAVEL: 'Estável',
  VOLATIL: 'Volátil',
};

export const palavraDaVolatilidade: Record<VolatilidadeFuncao, string> = {
  IMUTAVEL: 'IMMUTABLE',
  ESTAVEL: 'STABLE',
  VOLATIL: 'VOLATILE',
};

export const efeitoDaVolatilidade: Record<VolatilidadeFuncao, string> = {
  IMUTAVEL:
    'Devolve sempre o mesmo resultado para os mesmos argumentos e não lê o banco: o planejador pode calculá-la uma vez só, e ela pode entrar num índice.',
  ESTAVEL:
    'Devolve o mesmo resultado dentro de um comando e não altera o banco: o planejador pode usá-la numa busca por índice.',
  VOLATIL:
    'Pode devolver um resultado diferente a cada chamada ou alterar o banco: o PostgreSQL a chama de novo em cada linha, sem atalho.',
};

export const direcaoInicialDaOrdenacaoFuncoes: Record<OrdenacaoFuncoes, DirecaoOrdenacao> = {
  NOME: 'ASC',
  CHAMADAS: 'DESC',
  TEMPO_TOTAL: 'DESC',
  TEMPO_MEDIO: 'DESC',
};

export const filtrosFuncoesIniciais: FiltrosFuncoes = {
  busca: '',
  tipo: null,
  esquema: null,
  linguagem: null,
  situacao: null,
  ordenacao: 'NOME',
  direcao: 'ASC',
  pagina: 1,
};

export const COMANDO_QUE_MEDE_AS_FUNCOES = "ALTER SYSTEM SET track_functions = 'pl';\nSELECT pg_reload_conf();";

export interface ContextoDasFuncoes {
  geradoEm: string;
  coletaDesde: string;
  rastreamento: RastreamentoFuncoes;
}

export interface AvisoDaFuncao {
  tom: TomDoAviso;
  texto: string;
}

export interface ComandoDaFuncao {
  situacao: SituacaoFuncao;
  rotulo: string;
  comando: string;
  explicacao: string;
}

export type EstadoDoUso = 'MEDIDA' | 'NAO_MEDIDA' | 'EM_OBSERVACAO';

function lerDaLista<T extends string>(lista: readonly T[], valor: unknown): T | null {
  return lista.find((item) => item === valor) ?? null;
}

export function idDaFuncao(funcao: Pick<FuncaoDTO, 'esquema' | 'nome' | 'argumentos'>): string {
  return `${funcao.esquema}.${funcao.nome}(${funcao.argumentos})`;
}

export function lerIdDaFuncao(valor: unknown): string | null {
  return typeof valor === 'string' && valor.length <= TAMANHO_MAXIMO_DO_ID && ID_DE_FUNCAO.test(valor) ? valor : null;
}

export function lerLinguagem(valor: unknown): string | null {
  return typeof valor === 'string' && NOME_DE_LINGUAGEM.test(valor) ? valor : null;
}

export function linguagemMedida(linguagem: string, rastreamento: RastreamentoFuncoes): boolean {
  if (rastreamento === 'TODAS') return true;
  if (rastreamento === 'NENHUM') return false;
  return !LINGUAGENS_NAO_PROCEDURAIS.has(linguagem.toLowerCase());
}

export function lerFiltrosFuncoes(valor: unknown): FiltrosFuncoes {
  if (!valor || typeof valor !== 'object') return filtrosFuncoesIniciais;
  const guardado = valor as Record<string, unknown>;
  const ordenacao = lerDaLista(ordenacoesFuncoes, guardado.ordenacao) ?? filtrosFuncoesIniciais.ordenacao;

  return {
    busca: typeof guardado.busca === 'string' ? limparBusca(guardado.busca) : filtrosFuncoesIniciais.busca,
    tipo: lerDaLista(tiposFuncao, guardado.tipo),
    esquema: lerEsquema(guardado.esquema),
    linguagem: lerLinguagem(guardado.linguagem),
    situacao: lerDaLista(situacoesFuncao, guardado.situacao),
    ordenacao,
    direcao:
      lerDaLista<DirecaoOrdenacao>(['ASC', 'DESC'], guardado.direcao) ?? direcaoInicialDaOrdenacaoFuncoes[ordenacao],
    pagina: lerPagina(guardado.pagina),
  };
}

export function aplicarMudancaFuncoes(filtros: FiltrosFuncoes, mudanca: Partial<FiltrosFuncoes>): FiltrosFuncoes {
  return lerFiltrosFuncoes({ ...filtros, ...mudanca, pagina: paginaAposMudanca(filtros, mudanca) });
}

export function alternarOrdenacaoFuncoes(
  filtros: FiltrosFuncoes,
  ordenacao: OrdenacaoFuncoes,
): Pick<FiltrosFuncoes, 'ordenacao' | 'direcao'> {
  if (filtros.ordenacao !== ordenacao) return { ordenacao, direcao: direcaoInicialDaOrdenacaoFuncoes[ordenacao] };
  return { ordenacao, direcao: filtros.direcao === 'DESC' ? 'ASC' : 'DESC' };
}

export function temFiltroAtivoFuncoes(filtros: FiltrosFuncoes): boolean {
  return (
    filtros.busca !== '' ||
    filtros.tipo !== null ||
    filtros.esquema !== null ||
    filtros.linguagem !== null ||
    filtros.situacao !== null
  );
}

export function semFiltrosFuncoes(): Pick<FiltrosFuncoes, 'busca' | 'tipo' | 'esquema' | 'linguagem' | 'situacao'> {
  return { busca: '', tipo: null, esquema: null, linguagem: null, situacao: null };
}

function diasEntre(inicio: string, fim: string): number {
  return (new Date(fim).getTime() - new Date(inicio).getTime()) / MS_POR_DIA;
}

export function inicioDaObservacaoDaFuncao(funcao: FuncaoDTO, contexto: Pick<ContextoDasFuncoes, 'coletaDesde'>): string {
  return new Date(funcao.observadaDesde) > new Date(contexto.coletaDesde) ? funcao.observadaDesde : contexto.coletaDesde;
}

export function observadaPorInteiro(funcao: FuncaoDTO, contexto: Pick<ContextoDasFuncoes, 'geradoEm' | 'coletaDesde'>): boolean {
  return diasEntre(inicioDaObservacaoDaFuncao(funcao, contexto), contexto.geradoEm) >= DIAS_DE_OBSERVACAO;
}

export function formatarTempoPorChamada(milissegundos: number): string {
  if (milissegundos >= 1) return formatarDuracaoMs(milissegundos);
  return `${formatarDecimal(milissegundos, milissegundos < 0.1 ? 3 : 2)} ms`;
}

export function tempoMedioPorChamada(uso: UsoDaFuncaoDTO | null): number | null {
  if (!uso || uso.chamadas === 0) return null;
  return uso.tempoTotalMs / uso.chamadas;
}

export function temSearchPathFixo(funcao: Pick<FuncaoDTO, 'configuracoes'>): boolean {
  return funcao.configuracoes.some((configuracao) => configuracao.trim().toLowerCase().startsWith('search_path='));
}

export function gatilhosAtivos(funcao: Pick<FuncaoDTO, 'gatilhos'>): GatilhoDaFuncaoDTO[] {
  return funcao.gatilhos.filter((gatilho) => gatilho.ativo);
}

export function temDependentes(funcao: Pick<FuncaoDTO, 'gatilhos' | 'indices' | 'visoes'>): boolean {
  return gatilhosAtivos(funcao).length > 0 || funcao.indices.length > 0 || funcao.visoes.length > 0;
}

export function estadoDoUso(funcao: FuncaoDTO, contexto: ContextoDasFuncoes): EstadoDoUso {
  if (!funcao.uso) return 'NAO_MEDIDA';
  if (funcao.uso.chamadas === 0 && !observadaPorInteiro(funcao, contexto)) return 'EM_OBSERVACAO';
  return 'MEDIDA';
}

export function situacoesDaFuncao(funcao: FuncaoDTO, contexto: ContextoDasFuncoes): SituacaoFuncao[] {
  const situacoes: SituacaoFuncao[] = [];
  if (funcao.segurancaDefinidor && !temSearchPathFixo(funcao)) situacoes.push('RISCO_DE_SEGURANCA');
  const medio = tempoMedioPorChamada(funcao.uso);
  if (medio !== null && medio >= TEMPO_MEDIO_PESADA_MS) situacoes.push('PESADA');
  if (
    funcao.uso?.chamadas === 0 &&
    observadaPorInteiro(funcao, contexto) &&
    !temDependentes(funcao)
  ) {
    situacoes.push('SEM_CHAMADAS');
  }
  return situacoes;
}

export function tomDaSituacaoFuncao(situacao: SituacaoFuncao): TomDoAviso {
  return situacao === 'RISCO_DE_SEGURANCA' ? 'erro' : 'aviso';
}

export function esquemasDasFuncoes(funcoes: FuncaoDTO[]): string[] {
  return [...new Set(funcoes.map((funcao) => funcao.esquema))].sort(ORDEM_ALFABETICA.compare);
}

export function linguagensDasFuncoes(funcoes: FuncaoDTO[]): string[] {
  return [...new Set(funcoes.map((funcao) => funcao.linguagem))].sort(ORDEM_ALFABETICA.compare);
}

function compararNomes(a: FuncaoDTO, b: FuncaoDTO): number {
  return (
    ORDEM_ALFABETICA.compare(a.esquema, b.esquema) ||
    ORDEM_ALFABETICA.compare(a.nome, b.nome) ||
    a.argumentos.length - b.argumentos.length ||
    ORDEM_ALFABETICA.compare(a.argumentos, b.argumentos)
  );
}

function chaveDeOrdenacao(funcao: FuncaoDTO, ordenacao: Exclude<OrdenacaoFuncoes, 'NOME'>): number | null {
  if (!funcao.uso) return null;
  if (ordenacao === 'CHAMADAS') return funcao.uso.chamadas;
  if (ordenacao === 'TEMPO_TOTAL') return funcao.uso.tempoTotalMs;
  return tempoMedioPorChamada(funcao.uso) ?? 0;
}

export function ordenarFuncoes(funcoes: FuncaoDTO[], ordenacao: OrdenacaoFuncoes, direcao: DirecaoOrdenacao): FuncaoDTO[] {
  const sinal = direcao === 'ASC' ? 1 : -1;
  return [...funcoes].sort((a, b) => {
    if (ordenacao === 'NOME') return sinal * compararNomes(a, b);
    const chaveA = chaveDeOrdenacao(a, ordenacao);
    const chaveB = chaveDeOrdenacao(b, ordenacao);
    if (chaveA === null || chaveB === null) {
      if (chaveA !== chaveB) return chaveA === null ? 1 : -1;
      return compararNomes(a, b);
    }
    if (chaveA !== chaveB) return chaveA < chaveB ? -sinal : sinal;
    return compararNomes(a, b);
  });
}

function textoDoNome(funcao: FuncaoDTO): string {
  return `${idDaFuncao(funcao)} ${funcao.descricao ?? ''}`;
}

export function encontradaSoNoCodigo(funcao: FuncaoDTO, busca: string): boolean {
  const termos = termosDaBusca(busca);
  if (termos.length === 0) return false;
  return !correspondeABusca(textoDoNome(funcao), termos) && correspondeABusca(`${textoDoNome(funcao)} ${funcao.definicao}`, termos);
}

export function filtrarFuncoes(funcoes: FuncaoDTO[], filtros: FiltrosFuncoes, contexto: ContextoDasFuncoes): FuncaoDTO[] {
  const termos = termosDaBusca(filtros.busca);
  const encontradas = funcoes.filter(
    (funcao) =>
      (termos.length === 0 || correspondeABusca(`${textoDoNome(funcao)} ${funcao.definicao}`, termos)) &&
      (filtros.tipo === null || funcao.tipo === filtros.tipo) &&
      (filtros.esquema === null || funcao.esquema === filtros.esquema) &&
      (filtros.linguagem === null || funcao.linguagem === filtros.linguagem) &&
      (filtros.situacao === null || situacoesDaFuncao(funcao, contexto).includes(filtros.situacao)),
  );
  return ordenarFuncoes(encontradas, filtros.ordenacao, filtros.direcao);
}

export function contarPorSituacaoFuncao(
  funcoes: FuncaoDTO[],
  contexto: ContextoDasFuncoes,
): Record<SituacaoFuncao, number> {
  const contagem = Object.fromEntries(situacoesFuncao.map((situacao) => [situacao, 0])) as Record<SituacaoFuncao, number>;
  for (const funcao of funcoes) {
    for (const situacao of situacoesDaFuncao(funcao, contexto)) contagem[situacao] += 1;
  }
  return contagem;
}

export function resumirFuncoes(funcoes: FuncaoDTO[], encontradas: number, filtros: FiltrosFuncoes): string {
  if (funcoes.length === 0) return 'Nenhuma função no banco';
  if (temFiltroAtivoFuncoes(filtros)) {
    return `${formatarNumero(encontradas)} de ${formatarNumero(funcoes.length)} ${pluralizar(funcoes.length, 'rotina', 'rotinas')}`;
  }
  const procedimentos = funcoes.filter((funcao) => funcao.tipo === 'PROCEDIMENTO').length;
  const comRetorno = funcoes.length - procedimentos;
  const partes = [
    comRetorno > 0 ? `${formatarNumero(comRetorno)} ${pluralizar(comRetorno, 'função', 'funções')}` : null,
    procedimentos > 0 ? `${formatarNumero(procedimentos)} ${pluralizar(procedimentos, 'procedimento', 'procedimentos')}` : null,
  ].filter((parte): parte is string => parte !== null);
  return partes.join(' e ');
}

export function descreverFiltrosFuncoes(filtros: FiltrosFuncoes): string[] {
  const partes: string[] = [];
  if (filtros.busca !== '') partes.push(`busca por “${filtros.busca}”`);
  if (filtros.tipo) partes.push(`tipo: ${rotuloFiltroTipoFuncao[filtros.tipo].toLowerCase()}`);
  if (filtros.esquema) partes.push(`esquema: ${filtros.esquema}`);
  if (filtros.linguagem) partes.push(`linguagem: ${filtros.linguagem}`);
  if (filtros.situacao) partes.push(`situação: ${rotuloFiltroSituacaoFuncao[filtros.situacao].toLowerCase()}`);
  return partes;
}

const formatadorDaData = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });

export interface TextoDaColetaDasFuncoes {
  curto: string;
  completo: string;
  incompleta: boolean;
}

const frasesDoRastreamento: Record<RastreamentoFuncoes, string> = {
  NENHUM: '',
  PL: ' O servidor mede só as funções em linguagens procedurais (track_functions = pl): as em SQL e em C aparecem como não medidas.',
  TODAS: ' O servidor mede todas as funções (track_functions = all).',
};

export function textoDaColetaDasFuncoes(contexto: ContextoDasFuncoes): TextoDaColetaDasFuncoes {
  if (contexto.rastreamento === 'NENHUM') {
    return {
      curto: 'O servidor não mede as chamadas',
      completo:
        'O servidor não mede as chamadas das funções (track_functions = none). Nenhuma função é marcada sem chamadas ou pesada até a medida ser ligada.',
      incompleta: true,
    };
  }
  const dias = Math.floor(diasEntre(contexto.coletaDesde, contexto.geradoEm));
  const data = formatadorDaData.format(new Date(contexto.coletaDesde));
  const rastreamento = frasesDoRastreamento[contexto.rastreamento];
  if (dias >= DIAS_DE_OBSERVACAO) {
    return {
      curto: `Uso medido desde ${data}`,
      completo: `O Orynt coleta o uso das funções deste banco desde ${data}. As chamadas e os tempos são os dos últimos ${DIAS_DE_OBSERVACAO} dias.${rastreamento}`,
      incompleta: false,
    };
  }
  const desde = dias < 1 ? 'hoje' : `há ${formatarNumero(dias)} ${pluralizar(dias, 'dia', 'dias')}`;
  return {
    curto: `Uso medido desde ${data}`,
    completo: `O Orynt começou a coletar o uso das funções deste banco ${desde}. Uma função só é marcada sem chamadas depois de ${DIAS_DE_OBSERVACAO} dias de coleta.${rastreamento}`,
    incompleta: true,
  };
}

interface Genero {
  artigo: string;
  substantivo: string;
  chamada: string;
}

function genero(funcao: Pick<FuncaoDTO, 'tipo'>): Genero {
  if (funcao.tipo === 'PROCEDIMENTO') return { artigo: 'o', substantivo: 'procedimento', chamada: 'chamado' };
  return { artigo: 'a', substantivo: 'função', chamada: 'chamada' };
}

const palavraDoEvento: Record<EventoGatilho, string> = {
  INSERCAO: 'inserção',
  ATUALIZACAO: 'atualização',
  EXCLUSAO: 'exclusão',
  TRUNCAMENTO: 'TRUNCATE',
};

const palavraDoMomento: Record<MomentoGatilho, string> = {
  ANTES: 'Antes de',
  DEPOIS: 'Depois de',
  EM_VEZ_DE: 'No lugar de',
};

const palavraDoNivel: Record<NivelGatilho, string> = {
  LINHA: 'linha a linha',
  COMANDO: 'uma vez por comando',
};

function juntarComOu(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} ou ${partes.at(-1) ?? ''}`;
}

export function descreverDisparo(gatilho: Pick<GatilhoDaFuncaoDTO, 'momento' | 'eventos' | 'nivel'>): string {
  const eventos = juntarComOu(gatilho.eventos.map((evento) => palavraDoEvento[evento]));
  return `${palavraDoMomento[gatilho.momento]} cada ${eventos}, ${palavraDoNivel[gatilho.nivel]}`;
}

function fraseDoRisco(funcao: FuncaoDTO): string {
  const { artigo, substantivo } = genero(funcao);
  return `Roda com os privilégios de ${funcao.dono} e não fixa o search_path. Quem puder criar uma tabela ou uma função num esquema do caminho de busca de quem ${artigo} chama consegue fazer ${artigo} ${substantivo} usar o objeto dele, com os privilégios de ${funcao.dono}.`;
}

function fraseDaPesada(funcao: FuncaoDTO): string {
  const uso = funcao.uso;
  const medio = tempoMedioPorChamada(uso);
  if (!uso || medio === null) return '';
  const propria = Math.round(parteDoTempoProprio(uso) * 100);
  const dentro =
    propria < 100
      ? `, ${formatarNumero(propria)}% dentro ${genero(funcao).artigo === 'a' ? 'da própria função' : 'do próprio procedimento'}`
      : '';
  const base = `Cada chamada leva ${formatarTempoPorChamada(medio)} em média${dentro}. Foram ${formatarQuantidade(uso.chamadas)} ${pluralizar(uso.chamadas, 'chamada', 'chamadas')} nos últimos 30 dias, ${formatarDuracaoExtensa(uso.tempoTotalMs)} no total.`;
  const [gatilho] = gatilhosAtivos(funcao);
  if (!gatilho) return base;
  return `${base} Ela roda dentro de cada comando que dispara o gatilho ${gatilho.nome}, em ${gatilho.tabela.nome}, e esse tempo entra no tempo do comando.`;
}

function fraseSemChamadas(funcao: FuncaoDTO): string {
  const { artigo, substantivo, chamada } = genero(funcao);
  const desativados = funcao.gatilhos.filter((gatilho) => !gatilho.ativo);
  const gatilho =
    desativados.length > 0
      ? ` ${desativados.length === 1 ? 'O gatilho que' : 'Os gatilhos que'} ${artigo} ${desativados.length === 1 ? 'chamava, ' : 'chamavam, '}${desativados.map((item) => `${item.nome} em ${item.tabela.nome}`).join(', ')}, ${desativados.length === 1 ? 'está desativado' : 'estão desativados'}.`
      : '';
  return `${artigo === 'a' ? 'A' : 'O'} ${substantivo} não foi ${chamada} nos últimos 30 dias.${gatilho} Uma rotina mensal ou anual não aparece nesse período: procure o nome no código da aplicação e nos agendamentos antes de remover.`;
}

export function fraseDaSituacaoFuncao(situacao: SituacaoFuncao, funcao: FuncaoDTO): string {
  if (situacao === 'RISCO_DE_SEGURANCA') return fraseDoRisco(funcao);
  if (situacao === 'PESADA') return fraseDaPesada(funcao);
  return fraseSemChamadas(funcao);
}

export type AlvoDoPontoFuncao = { tipo: 'FUNCAO'; id: string } | { tipo: 'FILTRO'; situacao: SituacaoFuncao };

export interface PontoDeAtencaoFuncao {
  tipo: SituacaoFuncao;
  tom: TomDoAviso;
  funcao: Pick<FuncaoDTO, 'esquema' | 'nome' | 'argumentos'> | null;
  titulo: string | null;
  texto: string;
  alvo: AlvoDoPontoFuncao;
}

function listarNomes(funcoes: FuncaoDTO[]): string {
  const nomes = funcoes.slice(0, NOMES_NA_FRASE).map((funcao) => funcao.nome);
  const restantes = funcoes.length - nomes.length;
  if (restantes > 0) return `${nomes.join(', ')} e mais ${formatarNumero(restantes)}`;
  if (nomes.length === 1) return nomes[0] ?? '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1) ?? ''}`;
}

const tituloDoGrupo: Record<SituacaoFuncao, (quantidade: string) => string> = {
  RISCO_DE_SEGURANCA: (quantidade) => `${quantidade} funções com risco de segurança`,
  PESADA: (quantidade) => `${quantidade} funções pesadas`,
  SEM_CHAMADAS: (quantidade) => `${quantidade} funções sem chamadas em 30 dias`,
};

function fraseDoGrupo(situacao: SituacaoFuncao, funcoes: FuncaoDTO[]): string {
  const nomes = listarNomes(funcoes);
  if (situacao === 'RISCO_DE_SEGURANCA') {
    return `${nomes} rodam com os privilégios do dono e não fixam o search_path: quem puder criar objetos num esquema do caminho de busca consegue fazê-las usar os objetos dele.`;
  }
  if (situacao === 'PESADA') {
    const total = funcoes.reduce((soma, funcao) => soma + (funcao.uso?.tempoTotalMs ?? 0), 0);
    return `Cada chamada de ${nomes} leva ${formatarDuracaoMs(TEMPO_MEDIO_PESADA_MS)} ou mais em média, e elas somam ${formatarDuracaoExtensa(total)} nos últimos 30 dias.`;
  }
  return `${nomes} não foram chamadas nos últimos 30 dias. Uma rotina mensal ou anual não aparece nesse período: confira o código da aplicação e os agendamentos antes de remover.`;
}

function ordenarParaOsPontos(situacao: SituacaoFuncao, funcoes: FuncaoDTO[]): FuncaoDTO[] {
  if (situacao === 'PESADA') return ordenarFuncoes(funcoes, 'TEMPO_TOTAL', 'DESC');
  return ordenarFuncoes(funcoes, 'NOME', 'ASC');
}

export function pontosDeAtencaoFuncoes(funcoes: FuncaoDTO[], contexto: ContextoDasFuncoes): PontoDeAtencaoFuncao[] {
  return situacoesFuncao.flatMap((situacao): PontoDeAtencaoFuncao[] => {
    const daSituacao = ordenarParaOsPontos(
      situacao,
      funcoes.filter((funcao) => situacoesDaFuncao(funcao, contexto).includes(situacao)),
    );
    const tom = tomDaSituacaoFuncao(situacao);

    if (daSituacao.length > MAXIMO_DE_PONTOS_SEPARADOS) {
      return [
        {
          tipo: situacao,
          tom,
          funcao: null,
          titulo: tituloDoGrupo[situacao](formatarNumero(daSituacao.length)),
          texto: fraseDoGrupo(situacao, daSituacao),
          alvo: { tipo: 'FILTRO', situacao },
        },
      ];
    }

    return daSituacao.map((funcao) => ({
      tipo: situacao,
      tom,
      funcao: { esquema: funcao.esquema, nome: funcao.nome, argumentos: funcao.argumentos },
      titulo: null,
      texto: fraseDaSituacaoFuncao(situacao, funcao),
      alvo: { tipo: 'FUNCAO', id: funcao.id },
    }));
  });
}

export function avisosDaFuncao(funcao: FuncaoDTO, contexto: ContextoDasFuncoes): AvisoDaFuncao[] {
  const avisos = situacoesDaFuncao(funcao, contexto).map((situacao) => ({
    tom: tomDaSituacaoFuncao(situacao),
    texto: fraseDaSituacaoFuncao(situacao, funcao),
  }));
  if (estadoDoUso(funcao, contexto) === 'EM_OBSERVACAO') {
    const { artigo, substantivo, chamada } = genero(funcao);
    const desde = diasEntre(inicioDaObservacaoDaFuncao(funcao, contexto), contexto.geradoEm);
    const quando = desde < 1 ? 'hoje' : `há ${formatarNumero(Math.floor(desde))} ${pluralizar(Math.floor(desde), 'dia', 'dias')}`;
    avisos.push({
      tom: 'aviso',
      texto: `O Orynt começou a ver ${artigo === 'a' ? 'esta' : 'este'} ${substantivo} ${quando} e ainda não ${artigo} viu ser ${chamada}. Uma rotina só é marcada sem chamadas depois de ${DIAS_DE_OBSERVACAO} dias de coleta, para uma rotina nova não ser tomada por esquecida.`,
    });
  }
  return avisos;
}

function palavraDoComando(funcao: Pick<FuncaoDTO, 'tipo'>): string {
  return funcao.tipo === 'PROCEDIMENTO' ? 'PROCEDURE' : 'FUNCTION';
}

export function comandoDoSearchPath(funcao: FuncaoDTO): string {
  return `ALTER ${palavraDoComando(funcao)} ${funcao.id} SET search_path = ${funcao.esquema}, pg_temp;`;
}

export function comandosDeRemocao(funcao: FuncaoDTO): string[] {
  const gatilhos = funcao.gatilhos
    .filter((gatilho) => !gatilho.ativo)
    .map((gatilho) => `DROP TRIGGER ${gatilho.nome} ON ${idDoObjeto(gatilho.tabela)};`);
  return [...gatilhos, `DROP ${palavraDoComando(funcao)} ${funcao.id};`];
}

export function comandosDaFuncao(funcao: FuncaoDTO, contexto: ContextoDasFuncoes): ComandoDaFuncao[] {
  const { artigo, substantivo } = genero(funcao);
  const situacoes = situacoesDaFuncao(funcao, contexto);
  const comandos: ComandoDaFuncao[] = [];
  if (situacoes.includes('RISCO_DE_SEGURANCA')) {
    comandos.push({
      situacao: 'RISCO_DE_SEGURANCA',
      rotulo: 'Comando que fixa o caminho de busca',
      comando: comandoDoSearchPath(funcao),
      explicacao: `Faz ${artigo} ${substantivo} procurar os objetos só no esquema ${funcao.esquema} e, por último, nos temporários. Se o código usa objetos de outro esquema sem o nome do esquema, inclua esse esquema no caminho antes de rodar. O Orynt não executa nada no banco.`,
    });
  }
  if (situacoes.includes('SEM_CHAMADAS')) {
    const desativados = funcao.gatilhos.some((gatilho) => !gatilho.ativo);
    comandos.push({
      situacao: 'SEM_CHAMADAS',
      rotulo: artigo === 'a' ? 'Comando que remove a função' : 'Comando que remove o procedimento',
      comando: comandosDeRemocao(funcao).join('\n'),
      explicacao: `${desativados ? 'Remove primeiro o gatilho desativado, que impede a remoção, e depois ' : 'Remove '}${artigo} ${substantivo}. Antes, procure o nome no código da aplicação e nos agendamentos: uma rotina mensal ou anual não aparece em 30 dias. O Orynt não executa nada no banco.`,
    });
  }
  return comandos;
}

export function comandosDaSituacaoFuncao(funcao: FuncaoDTO, situacao: SituacaoFuncao, contexto: ContextoDasFuncoes): string[] {
  const comando = comandosDaFuncao(funcao, contexto).find((candidato) => candidato.situacao === situacao);
  return comando ? comando.comando.split('\n') : [];
}

export function loteDeComandosDasFuncoes(
  funcoes: FuncaoDTO[],
  situacao: SituacaoFuncao,
  contexto: ContextoDasFuncoes,
): LoteDeComandos | null {
  const comandos = [...new Set(funcoes.flatMap((funcao) => comandosDaSituacaoFuncao(funcao, situacao, contexto)))];
  if (comandos.length === 0) return null;
  const quantidade = formatarNumero(comandos.length);
  return {
    comandos,
    rotulo: comandos.length === 1 ? 'Copiar o comando' : `Copiar os ${quantidade} comandos`,
    descricao:
      comandos.length === 1
        ? 'Copiar o comando da função da lista'
        : `Copiar os ${quantidade} comandos das funções da lista, um por linha`,
  };
}

export const loteQueMedeAsFuncoes: LoteDeComandos = {
  comandos: COMANDO_QUE_MEDE_AS_FUNCOES.split('\n'),
  rotulo: 'Copiar os comandos',
  descricao: 'Copiar os dois comandos que ligam a medida das funções, um por linha',
};

export function parteDoTempoProprio(uso: UsoDaFuncaoDTO): number {
  return uso.tempoTotalMs > 0 ? uso.tempoProprioMs / uso.tempoTotalMs : 1;
}

export function descreverConfiguracao(configuracao: string): { parametro: string; valor: string } {
  const [parametro = configuracao, ...resto] = configuracao.split('=');
  return { parametro: parametro.trim(), valor: resto.join('=').trim() };
}
