import type { DirecaoOrdenacao } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import type {
  AbaIndices,
  FiltroSituacaoIndice,
  FiltrosIndices,
  IndiceDTO,
  MetodoIndice,
  OrdenacaoIndices,
  RestricaoIndice,
  SituacaoIndice,
  SugestaoDeIndiceDTO,
} from '@/modelos/objetos';
import {
  formatarNumero,
  formatarQuantidade,
  formatarTamanho,
  formatarTempoRelativo,
  pluralizar,
} from '@/utilitarios/formatacao';
import { correspondeABusca, limparBusca, termosDaBusca } from './buscaConsultas';
import { lerPagina, paginaAposMudanca } from './paginacaoLocal';
import { idDoObjeto, lerEsquema } from './visoes';
import type { TomDoAviso } from './visoes';

export const PERIODO_DO_USO: PeriodoDashboard = 'ULTIMOS_30_DIAS';
export const DIAS_DE_OBSERVACAO = 30;

const MS_POR_DIA = 86_400_000;
const NOME_DE_TABELA = /^[A-Za-z_][\w$]{0,62}\.[A-Za-z_][\w$]{0,62}$/;
const ORDEM_ALFABETICA = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const NOMES_NA_FRASE = 3;

export const filtrosSituacaoIndice: FiltroSituacaoIndice[] = ['INVALIDOS', 'DUPLICADOS', 'SEM_USO'];

export const ordenacoesIndices: OrdenacaoIndices[] = ['NOME', 'TAMANHO', 'LEITURAS'];

export const abasIndices: AbaIndices[] = ['EXISTENTES', 'SUGERIDOS'];

export const rotuloMetodoIndice: Record<MetodoIndice, string> = {
  BTREE: 'B-tree',
  HASH: 'Hash',
  GIN: 'GIN',
  GIST: 'GiST',
  SPGIST: 'SP-GiST',
  BRIN: 'BRIN',
};

export const rotuloRestricaoIndice: Record<RestricaoIndice, string> = {
  CHAVE_PRIMARIA: 'Chave primária',
  UNICA: 'Restrição única',
  EXCLUSAO: 'Restrição de exclusão',
};

export const rotuloSituacaoIndice: Record<SituacaoIndice, string> = {
  INVALIDO: 'Inválido',
  DUPLICADO: 'Duplicado',
  REDUNDANTE: 'Redundante',
  SEM_USO: 'Sem uso',
  EM_OBSERVACAO: 'Em observação',
  GARANTE_UNICIDADE: 'Garante unicidade',
  EM_USO: 'Em uso',
};

export const rotuloFiltroSituacaoIndice: Record<FiltroSituacaoIndice, string> = {
  INVALIDOS: 'Inválidos',
  DUPLICADOS: 'Duplicados ou redundantes',
  SEM_USO: 'Sem uso em 30 dias',
};

export const direcaoInicialDaOrdenacaoIndices: Record<OrdenacaoIndices, DirecaoOrdenacao> = {
  NOME: 'ASC',
  TAMANHO: 'DESC',
  LEITURAS: 'ASC',
};

export const filtrosIndicesIniciais: FiltrosIndices = {
  busca: '',
  esquema: null,
  tabela: null,
  situacao: null,
  ordenacao: 'NOME',
  direcao: 'ASC',
  pagina: 1,
  aba: 'EXISTENTES',
};

export type TipoSobreposicao = 'DUPLICADO' | 'REDUNDANTE';

export interface Sobreposicao {
  tipo: TipoSobreposicao;
  cobertoPor: IndiceDTO;
}

export interface ContextoDosIndices {
  geradoEm: string;
  coletaDesde: string;
  sobreposicoes: ReadonlyMap<string, Sobreposicao>;
}

export interface AvisoDoIndice {
  tom: TomDoAviso;
  texto: string;
}

export interface ComandoDoIndice {
  rotulo: string;
  comando: string;
  explicacao: string;
}

export type TipoPontoDeAtencaoIndice = 'INVALIDO' | 'DUPLICADO' | 'REDUNDANTE' | 'SEM_USO' | 'SUGERIDOS';

export type AlvoDoPontoIndice =
  | { tipo: 'INDICE'; id: string }
  | { tipo: 'FILTRO'; situacao: FiltroSituacaoIndice }
  | { tipo: 'SUGESTOES' };

export type TomDoPontoIndice = TomDoAviso | 'info';

export interface PontoDeAtencaoIndice {
  tipo: TipoPontoDeAtencaoIndice;
  tom: TomDoPontoIndice;
  indice: Pick<IndiceDTO, 'esquema' | 'nome'> | null;
  titulo: string | null;
  texto: string;
  alvo: AlvoDoPontoIndice;
}

const maximoDePontosSeparados: Record<Exclude<TipoPontoDeAtencaoIndice, 'SUGERIDOS'>, number> = {
  INVALIDO: 2,
  DUPLICADO: 2,
  REDUNDANTE: 2,
  SEM_USO: 2,
};

const filtroDoPonto: Record<Exclude<TipoPontoDeAtencaoIndice, 'SUGERIDOS'>, FiltroSituacaoIndice> = {
  INVALIDO: 'INVALIDOS',
  DUPLICADO: 'DUPLICADOS',
  REDUNDANTE: 'DUPLICADOS',
  SEM_USO: 'SEM_USO',
};

function lerDaLista<T extends string>(lista: readonly T[], valor: unknown): T | null {
  return lista.find((item) => item === valor) ?? null;
}

export function lerTabela(valor: unknown): string | null {
  return typeof valor === 'string' && NOME_DE_TABELA.test(valor) ? valor : null;
}

export function lerFiltrosIndices(valor: unknown): FiltrosIndices {
  if (!valor || typeof valor !== 'object') return filtrosIndicesIniciais;
  const guardado = valor as Record<string, unknown>;
  const ordenacao = lerDaLista(ordenacoesIndices, guardado.ordenacao) ?? filtrosIndicesIniciais.ordenacao;

  return {
    busca: typeof guardado.busca === 'string' ? limparBusca(guardado.busca) : filtrosIndicesIniciais.busca,
    esquema: lerEsquema(guardado.esquema),
    tabela: lerTabela(guardado.tabela),
    situacao: lerDaLista(filtrosSituacaoIndice, guardado.situacao),
    ordenacao,
    direcao:
      lerDaLista<DirecaoOrdenacao>(['ASC', 'DESC'], guardado.direcao) ?? direcaoInicialDaOrdenacaoIndices[ordenacao],
    pagina: lerPagina(guardado.pagina),
    aba: lerDaLista(abasIndices, guardado.aba) ?? filtrosIndicesIniciais.aba,
  };
}

export function aplicarMudancaIndices(filtros: FiltrosIndices, mudanca: Partial<FiltrosIndices>): FiltrosIndices {
  return lerFiltrosIndices({ ...filtros, ...mudanca, pagina: paginaAposMudanca(filtros, mudanca, ['pagina', 'aba']) });
}

export function alternarOrdenacaoIndices(
  filtros: FiltrosIndices,
  ordenacao: OrdenacaoIndices,
): Pick<FiltrosIndices, 'ordenacao' | 'direcao'> {
  if (filtros.ordenacao !== ordenacao) return { ordenacao, direcao: direcaoInicialDaOrdenacaoIndices[ordenacao] };
  return { ordenacao, direcao: filtros.direcao === 'DESC' ? 'ASC' : 'DESC' };
}

export function temFiltroAtivoIndices(filtros: FiltrosIndices): boolean {
  return filtros.busca !== '' || filtros.esquema !== null || filtros.tabela !== null || filtros.situacao !== null;
}

export function semFiltrosIndices(): Pick<FiltrosIndices, 'busca' | 'esquema' | 'tabela' | 'situacao'> {
  return { busca: '', esquema: null, tabela: null, situacao: null };
}

export function idDaTabela(indice: IndiceDTO): string {
  return idDoObjeto(indice.tabela);
}

export function garanteUnicidade(indice: IndiceDTO): boolean {
  return indice.unico || indice.restricao !== null;
}

export function gravacoesNoIndice(indice: IndiceDTO): number {
  const { insercoes, atualizacoes, atualizacoesHot } = indice.tabela;
  return insercoes + Math.max(0, atualizacoes - atualizacoesHot);
}

function diasEntre(inicio: string, fim: string): number {
  return (new Date(fim).getTime() - new Date(inicio).getTime()) / MS_POR_DIA;
}

export function inicioDaObservacao(indice: IndiceDTO, contexto: Pick<ContextoDosIndices, 'coletaDesde'>): string {
  return new Date(indice.observadoDesde) > new Date(contexto.coletaDesde) ? indice.observadoDesde : contexto.coletaDesde;
}

export function observadoPorInteiro(indice: IndiceDTO, contexto: Pick<ContextoDosIndices, 'geradoEm' | 'coletaDesde'>): boolean {
  return diasEntre(inicioDaObservacao(indice, contexto), contexto.geradoEm) >= DIAS_DE_OBSERVACAO;
}

function mesmasColunas(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((coluna, posicao) => coluna === b[posicao]);
}

function comecaCom(colunas: string[], prefixo: string[]): boolean {
  return prefixo.length < colunas.length && prefixo.every((coluna, posicao) => coluna === colunas[posicao]);
}

function cobreIncluidas(coberto: IndiceDTO, cobridor: IndiceDTO): boolean {
  const disponiveis = new Set([...cobridor.colunas, ...cobridor.incluidas]);
  return coberto.incluidas.every((coluna) => disponiveis.has(coluna));
}

function comparaveis(a: IndiceDTO, b: IndiceDTO): boolean {
  return (
    a.id !== b.id &&
    a.valido &&
    b.valido &&
    idDaTabela(a) === idDaTabela(b) &&
    a.metodo === b.metodo &&
    a.predicado === b.predicado
  );
}

function sobraNoEmpate(a: IndiceDTO, b: IndiceDTO): IndiceDTO {
  if (a.leituras !== b.leituras) return a.leituras < b.leituras ? a : b;
  return ORDEM_ALFABETICA.compare(a.nome, b.nome) > 0 ? a : b;
}

function duplicadoDe(indice: IndiceDTO, outro: IndiceDTO): boolean {
  if (!comparaveis(indice, outro) || !mesmasColunas(indice.colunas, outro.colunas)) return false;
  if (!cobreIncluidas(indice, outro)) return false;
  if (garanteUnicidade(indice)) return false;
  if (garanteUnicidade(outro)) return true;
  return sobraNoEmpate(indice, outro) === indice;
}

function redundanteCom(indice: IndiceDTO, outro: IndiceDTO): boolean {
  return (
    comparaveis(indice, outro) &&
    indice.metodo === 'BTREE' &&
    !garanteUnicidade(indice) &&
    comecaCom(outro.colunas, indice.colunas) &&
    cobreIncluidas(indice, outro)
  );
}

function maisLido(indices: IndiceDTO[]): IndiceDTO | undefined {
  return [...indices].sort((a, b) => b.leituras - a.leituras || ORDEM_ALFABETICA.compare(a.nome, b.nome))[0];
}

export function sobreposicoesDosIndices(indices: IndiceDTO[]): Map<string, Sobreposicao> {
  const sobreposicoes = new Map<string, Sobreposicao>();
  for (const indice of indices) {
    const duplicado = maisLido(indices.filter((outro) => duplicadoDe(indice, outro)));
    if (duplicado) {
      sobreposicoes.set(indice.id, { tipo: 'DUPLICADO', cobertoPor: duplicado });
      continue;
    }
    const cobridor = maisLido(indices.filter((outro) => redundanteCom(indice, outro)));
    if (cobridor) sobreposicoes.set(indice.id, { tipo: 'REDUNDANTE', cobertoPor: cobridor });
  }
  return sobreposicoes;
}

export function situacaoDoIndice(indice: IndiceDTO, contexto: ContextoDosIndices): SituacaoIndice {
  if (!indice.valido) return 'INVALIDO';
  const sobreposicao = contexto.sobreposicoes.get(indice.id);
  if (sobreposicao) return sobreposicao.tipo;
  if (indice.leituras > 0) return 'EM_USO';
  if (garanteUnicidade(indice)) return 'GARANTE_UNICIDADE';
  return observadoPorInteiro(indice, contexto) ? 'SEM_USO' : 'EM_OBSERVACAO';
}

function atendeSituacao(indice: IndiceDTO, situacao: FiltroSituacaoIndice, contexto: ContextoDosIndices): boolean {
  const atual = situacaoDoIndice(indice, contexto);
  if (situacao === 'INVALIDOS') return atual === 'INVALIDO';
  if (situacao === 'DUPLICADOS') return atual === 'DUPLICADO' || atual === 'REDUNDANTE';
  return atual === 'SEM_USO';
}

export function esquemasDosIndices(indices: IndiceDTO[]): string[] {
  return [...new Set(indices.map((indice) => indice.esquema))].sort(ORDEM_ALFABETICA.compare);
}

export function tabelasDosIndices(indices: IndiceDTO[], esquema: string | null): string[] {
  const doEsquema = esquema === null ? indices : indices.filter((indice) => indice.esquema === esquema);
  return [...new Set(doEsquema.map(idDaTabela))].sort(ORDEM_ALFABETICA.compare);
}

export function rotuloDoTipoDoIndice(indice: IndiceDTO): string | null {
  if (indice.restricao) return rotuloRestricaoIndice[indice.restricao];
  if (indice.unico) return 'Único';
  if (indice.predicado) return 'Parcial';
  return null;
}

export function colunasDoIndice(indice: Pick<IndiceDTO, 'colunas'>): string {
  return indice.colunas.join(', ');
}

function compararNomes(a: IndiceDTO, b: IndiceDTO): number {
  return (
    ORDEM_ALFABETICA.compare(a.esquema, b.esquema) ||
    ORDEM_ALFABETICA.compare(a.tabela.nome, b.tabela.nome) ||
    ORDEM_ALFABETICA.compare(a.nome, b.nome)
  );
}

function chaveDeOrdenacao(indice: IndiceDTO, ordenacao: Exclude<OrdenacaoIndices, 'NOME'>): number {
  return ordenacao === 'TAMANHO' ? indice.tamanhoBytes : indice.leituras;
}

export function ordenarIndices(indices: IndiceDTO[], ordenacao: OrdenacaoIndices, direcao: DirecaoOrdenacao): IndiceDTO[] {
  const sinal = direcao === 'ASC' ? 1 : -1;
  return [...indices].sort((a, b) => {
    if (ordenacao === 'NOME') return sinal * compararNomes(a, b);
    const chaveA = chaveDeOrdenacao(a, ordenacao);
    const chaveB = chaveDeOrdenacao(b, ordenacao);
    if (chaveA !== chaveB) return chaveA < chaveB ? -sinal : sinal;
    return compararNomes(a, b);
  });
}

export function filtrarIndices(indices: IndiceDTO[], filtros: FiltrosIndices, contexto: ContextoDosIndices): IndiceDTO[] {
  const termos = termosDaBusca(filtros.busca);
  const encontrados = indices.filter(
    (indice) =>
      (termos.length === 0 ||
        correspondeABusca(`${indice.id} ${idDaTabela(indice)} ${indice.colunas.join(' ')}`, termos)) &&
      (filtros.esquema === null || indice.esquema === filtros.esquema) &&
      (filtros.tabela === null || idDaTabela(indice) === filtros.tabela) &&
      (filtros.situacao === null || atendeSituacao(indice, filtros.situacao, contexto)),
  );
  return ordenarIndices(encontrados, filtros.ordenacao, filtros.direcao);
}

export function contarPorFiltro(indices: IndiceDTO[], contexto: ContextoDosIndices): Record<FiltroSituacaoIndice, number> {
  return {
    INVALIDOS: indices.filter((indice) => atendeSituacao(indice, 'INVALIDOS', contexto)).length,
    DUPLICADOS: indices.filter((indice) => atendeSituacao(indice, 'DUPLICADOS', contexto)).length,
    SEM_USO: indices.filter((indice) => atendeSituacao(indice, 'SEM_USO', contexto)).length,
  };
}

export function resumirIndices(indices: IndiceDTO[], encontrados: number, filtros: FiltrosIndices): string {
  if (indices.length === 0) return 'Nenhum índice no banco';
  const doBanco = `${formatarNumero(indices.length)} ${pluralizar(indices.length, 'índice', 'índices')}`;
  if (temFiltroAtivoIndices(filtros)) return `${formatarNumero(encontrados)} de ${doBanco}`;
  const tabelas = new Set(indices.map(idDaTabela)).size;
  return `${doBanco} em ${formatarNumero(tabelas)} ${pluralizar(tabelas, 'tabela', 'tabelas')}`;
}

export function descreverFiltrosIndices(filtros: FiltrosIndices): string[] {
  const partes: string[] = [];
  if (filtros.busca !== '') partes.push(`busca por “${filtros.busca}”`);
  if (filtros.esquema) partes.push(`esquema: ${filtros.esquema}`);
  if (filtros.tabela) partes.push(`tabela: ${filtros.tabela}`);
  if (filtros.situacao) partes.push(`situação: ${rotuloFiltroSituacaoIndice[filtros.situacao].toLowerCase()}`);
  return partes;
}

const formatadorDaData = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });

export interface TextoDaColeta {
  curto: string;
  completo: string;
  incompleta: boolean;
}

export function textoDaColeta(contexto: Pick<ContextoDosIndices, 'geradoEm' | 'coletaDesde'>): TextoDaColeta {
  const dias = Math.floor(diasEntre(contexto.coletaDesde, contexto.geradoEm));
  const data = formatadorDaData.format(new Date(contexto.coletaDesde));
  if (dias >= DIAS_DE_OBSERVACAO) {
    return {
      curto: `Uso medido desde ${data}`,
      completo: `O Orynt coleta o uso dos índices deste banco desde ${data}. As leituras da lista são as dos últimos ${DIAS_DE_OBSERVACAO} dias.`,
      incompleta: false,
    };
  }
  const desde = dias < 1 ? 'hoje' : `há ${formatarNumero(dias)} ${pluralizar(dias, 'dia', 'dias')}`;
  return {
    curto: `Uso medido desde ${data}`,
    completo: `O Orynt começou a coletar o uso dos índices deste banco ${desde}. Um índice só é marcado sem uso depois de ${DIAS_DE_OBSERVACAO} dias de coleta.`,
    incompleta: true,
  };
}

function listarNomes(indices: IndiceDTO[]): string {
  const nomes = indices.slice(0, NOMES_NA_FRASE).map((indice) => indice.nome);
  const restantes = indices.length - nomes.length;
  if (restantes > 0) return `${nomes.join(', ')} e mais ${formatarNumero(restantes)}`;
  if (nomes.length === 1) return nomes[0] ?? '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1) ?? ''}`;
}

function gravacoes(quantidade: number): string {
  return `${formatarQuantidade(quantidade)} ${pluralizar(quantidade, 'gravação', 'gravações')}`;
}

function custoDeManter(indice: IndiceDTO): string {
  const tamanho = `Ocupa ${formatarTamanho(indice.tamanhoBytes)}`;
  const quantidade = gravacoesNoIndice(indice);
  if (quantidade === 0) return `${tamanho} e não recebeu gravações nos últimos 30 dias.`;
  const condicao = indice.predicado ? ', das que atendem à condição dele,' : '';
  return `${tamanho} e é atualizado a cada gravação em ${indice.tabela.nome}${condicao}: ${gravacoes(quantidade)} nos últimos 30 dias.`;
}

function usoAnterior(indice: IndiceDTO, geradoEm: string): string {
  const anteriores = indice.usos.filter((uso) => uso.usadoAte !== null);
  const [primeiro] = anteriores;
  if (!primeiro?.usadoAte) return '';
  const quando = formatarTempoRelativo(primeiro.usadoAte, new Date(geradoEm));
  if (anteriores.length === 1) return ` A consulta que o usava trocou de plano ${quando} e passou a ler a tabela de outro jeito.`;
  return ` As ${formatarNumero(anteriores.length)} consultas que o usavam trocaram de plano; a primeira ${quando}.`;
}

function fraseDoPonto(tipo: Exclude<TipoPontoDeAtencaoIndice, 'SUGERIDOS'>, indice: IndiceDTO, contexto: ContextoDosIndices): string {
  const sobreposicao = contexto.sobreposicoes.get(indice.id);
  if (tipo === 'INVALIDO') {
    return `Está inválido: um CREATE INDEX CONCURRENTLY ou REINDEX CONCURRENTLY não terminou. O planejador não o usa, mas cada gravação em ${indice.tabela.nome} ainda o atualiza.${usoAnterior(indice, contexto.geradoEm)}`;
  }
  if (tipo === 'DUPLICADO' && sobreposicao) {
    return `Repete ${sobreposicao.cobertoPor.nome}: mesma tabela, mesmas colunas e mesmo método. ${custoDeManter(indice)}`;
  }
  if (tipo === 'REDUNDANTE' && sobreposicao) {
    return `As colunas dele são o começo de ${sobreposicao.cobertoPor.nome}, que atende às mesmas buscas. ${custoDeManter(indice)}`;
  }
  return `Nenhuma consulta o leu nos últimos 30 dias. ${custoDeManter(indice)}`;
}

const tituloDoGrupo: Record<Exclude<TipoPontoDeAtencaoIndice, 'SUGERIDOS'>, (quantidade: string) => string> = {
  INVALIDO: (quantidade) => `${quantidade} índices inválidos`,
  DUPLICADO: (quantidade) => `${quantidade} índices duplicados`,
  REDUNDANTE: (quantidade) => `${quantidade} índices redundantes`,
  SEM_USO: (quantidade) => `${quantidade} índices sem uso`,
};

function custoDoGrupo(indices: IndiceDTO[]): string {
  const tamanho = formatarTamanho(indices.reduce((soma, indice) => soma + indice.tamanhoBytes, 0));
  const quantidade = indices.reduce((soma, indice) => soma + gravacoesNoIndice(indice), 0);
  if (quantidade === 0) return `Juntos ocupam ${tamanho}.`;
  return `Juntos ocupam ${tamanho} e receberam ${gravacoes(quantidade)} nos últimos 30 dias.`;
}

const fraseDoGrupo: Record<Exclude<TipoPontoDeAtencaoIndice, 'SUGERIDOS'>, (indices: IndiceDTO[]) => string> = {
  INVALIDO: (indices) =>
    `${listarNomes(indices)} estão inválidos: o planejador não os usa, mas cada gravação nas tabelas ainda os atualiza.`,
  DUPLICADO: (indices) =>
    `${listarNomes(indices)} repetem outro índice da mesma tabela, com as mesmas colunas. ${custoDoGrupo(indices)}`,
  REDUNDANTE: (indices) =>
    `As colunas de ${listarNomes(indices)} são o começo de outro índice da mesma tabela. ${custoDoGrupo(indices)}`,
  SEM_USO: (indices) => `Nenhuma consulta leu ${listarNomes(indices)} nos últimos 30 dias. ${custoDoGrupo(indices)}`,
};

const ordemDosPontos: Exclude<TipoPontoDeAtencaoIndice, 'SUGERIDOS'>[] = ['INVALIDO', 'DUPLICADO', 'REDUNDANTE', 'SEM_USO'];

function pontoDasSugestoes(sugestoes: SugestaoDeIndiceDTO[]): PontoDeAtencaoIndice[] {
  if (sugestoes.length === 0) return [];
  const consultas = new Set(sugestoes.flatMap((sugestao) => sugestao.consultas.map((consulta) => consulta.id))).size;
  const quantidade = formatarNumero(sugestoes.length);
  return [
    {
      tipo: 'SUGERIDOS',
      tom: 'info',
      indice: null,
      titulo:
        sugestoes.length === 1 ? 'Um índice sugerido pelos planos' : `${quantidade} índices sugeridos pelos planos`,
      texto: `Os planos de execução de ${formatarNumero(consultas)} ${pluralizar(consultas, 'consulta lê', 'consultas leem')} tabelas inteiras para achar poucas linhas. O comando de cada índice está pronto para copiar na aba Sugeridos pelos planos.`,
      alvo: { tipo: 'SUGESTOES' },
    },
  ];
}

export function pontosDeAtencaoIndices(
  indices: IndiceDTO[],
  sugestoes: SugestaoDeIndiceDTO[],
  contexto: ContextoDosIndices,
): PontoDeAtencaoIndice[] {
  const porTamanho = ordenarIndices(indices, 'TAMANHO', 'DESC');

  const pontos = ordemDosPontos.flatMap((tipo): PontoDeAtencaoIndice[] => {
    const doTipo = porTamanho.filter((indice) => situacaoDoIndice(indice, contexto) === tipo);
    const tom: TomDoAviso = tipo === 'INVALIDO' ? 'erro' : 'aviso';

    if (doTipo.length > maximoDePontosSeparados[tipo]) {
      return [
        {
          tipo,
          tom,
          indice: null,
          titulo: tituloDoGrupo[tipo](formatarNumero(doTipo.length)),
          texto: fraseDoGrupo[tipo](doTipo),
          alvo: { tipo: 'FILTRO', situacao: filtroDoPonto[tipo] },
        },
      ];
    }

    return doTipo.map((indice) => ({
      tipo,
      tom,
      indice: { esquema: indice.esquema, nome: indice.nome },
      titulo: null,
      texto: fraseDoPonto(tipo, indice, contexto),
      alvo: { tipo: 'INDICE', id: indice.id },
    }));
  });

  return [...pontos, ...pontoDasSugestoes(sugestoes)];
}

export function avisosDoIndice(indice: IndiceDTO, contexto: ContextoDosIndices): AvisoDoIndice[] {
  const situacao = situacaoDoIndice(indice, contexto);
  const sobreposicao = contexto.sobreposicoes.get(indice.id);
  const geradoEm = new Date(contexto.geradoEm);

  if (situacao === 'INVALIDO') {
    return [
      {
        tom: 'erro',
        texto: `O índice está inválido: um CREATE INDEX CONCURRENTLY ou REINDEX CONCURRENTLY não terminou, e ele ficou pela metade. O planejador não o usa, mas cada gravação em ${indice.tabela.nome} ainda o atualiza.${usoAnterior(indice, contexto.geradoEm)}`,
      },
    ];
  }
  if (situacao === 'DUPLICADO' && sobreposicao) {
    return [
      {
        tom: 'aviso',
        texto: `Este índice repete ${sobreposicao.cobertoPor.nome}: mesma tabela, mesmas colunas e mesmo método. O planejador escolhe um dos dois, e o banco mantém os dois. ${custoDeManter(indice)}`,
      },
    ];
  }
  if (situacao === 'REDUNDANTE' && sobreposicao) {
    return [
      {
        tom: 'aviso',
        texto: `As colunas deste índice são o começo de ${sobreposicao.cobertoPor.nome} (${colunasDoIndice(sobreposicao.cobertoPor)}), que atende às mesmas buscas. ${custoDeManter(indice)}`,
      },
    ];
  }
  if (situacao === 'SEM_USO') {
    return [
      {
        tom: 'aviso',
        texto: `Nenhuma consulta leu este índice nos últimos 30 dias. ${custoDeManter(indice)}`,
      },
    ];
  }
  if (situacao === 'EM_OBSERVACAO') {
    const desde = formatarTempoRelativo(inicioDaObservacao(indice, contexto), geradoEm);
    return [
      {
        tom: 'aviso',
        texto: `O Orynt começou a ver este índice ${desde} e ainda não o viu ser lido. Um índice só é marcado sem uso depois de ${DIAS_DE_OBSERVACAO} dias de coleta, para um índice novo não ser tomado por esquecido.`,
      },
    ];
  }
  return [];
}

export function comandoDoIndice(indice: IndiceDTO, contexto: ContextoDosIndices): ComandoDoIndice | null {
  const situacao = situacaoDoIndice(indice, contexto);
  if (situacao === 'INVALIDO') {
    return {
      rotulo: 'Comando que refaz o índice',
      comando: `REINDEX INDEX CONCURRENTLY ${indice.id};`,
      explicacao:
        'Refaz o índice sem bloquear as gravações na tabela. Se ele não for mais necessário, DROP INDEX CONCURRENTLY o remove. O Orynt não executa nada no banco.',
    };
  }
  if (situacao === 'DUPLICADO' || situacao === 'REDUNDANTE' || situacao === 'SEM_USO') {
    return {
      rotulo: 'Comando que remove o índice',
      comando: `DROP INDEX CONCURRENTLY ${indice.id};`,
      explicacao:
        situacao === 'SEM_USO'
          ? 'Antes de remover, confira se algum processo que roda com menos frequência ainda o usa, como um relatório mensal. CONCURRENTLY não bloqueia a tabela, mas não roda dentro de uma transação. O Orynt não executa nada no banco.'
          : 'CONCURRENTLY remove o índice sem bloquear a tabela, mas não roda dentro de uma transação. O Orynt não executa nada no banco.',
    };
  }
  return null;
}

export function descreverUso(leiturasPorExecucao: number): string {
  if (leiturasPorExecucao === 1) return 'uma leitura por execução';
  return `${formatarNumero(leiturasPorExecucao)} leituras por execução`;
}

export interface LoteDeComandos {
  comandos: string[];
  rotulo: string;
  descricao: string;
}

export function loteDeComandos(indices: IndiceDTO[], contexto: ContextoDosIndices): LoteDeComandos | null {
  const comandos = indices.flatMap((indice) => comandoDoIndice(indice, contexto)?.comando ?? []);
  if (comandos.length === 0) return null;
  const quantidade = formatarNumero(comandos.length);
  return {
    comandos,
    rotulo: comandos.length === 1 ? 'Copiar o comando' : `Copiar os ${quantidade} comandos`,
    descricao:
      comandos.length === 1
        ? 'Copiar o comando do índice da lista'
        : `Copiar os comandos dos ${quantidade} índices da lista, um por linha`,
  };
}
