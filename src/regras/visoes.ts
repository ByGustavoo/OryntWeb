import type { DirecaoOrdenacao } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import type {
  FiltroSituacaoVisao,
  FiltrosVisoes,
  OrdenacaoVisoes,
  ReferenciaObjetoDTO,
  SituacaoMaterializada,
  TipoObjetoBanco,
  TipoVisao,
  VisaoDTO,
} from '@/modelos/objetos';
import { formatarDuracaoExtensa, formatarNumero, formatarTempoRelativo, pluralizar } from '@/utilitarios/formatacao';
import { correspondeABusca, limparBusca, termosDaBusca } from './buscaConsultas';
import { lerPagina, paginaAposMudanca } from './paginacaoLocal';

export const HORAS_ATE_DESATUALIZAR = 24;
export const PERIODO_DAS_LEITURAS: PeriodoDashboard = 'ULTIMOS_30_DIAS';

const MS_POR_HORA = 3_600_000;
const NOME_DE_ESQUEMA = /^[A-Za-z_][\w$]{0,62}$/;
const ORDEM_ALFABETICA = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

export const tiposVisao: TipoVisao[] = ['COMUM', 'MATERIALIZADA'];

export const filtrosSituacao: FiltroSituacaoVisao[] = ['SEM_DADOS', 'DESATUALIZADAS', 'SEM_LEITURA'];

export const ordenacoesVisoes: OrdenacaoVisoes[] = ['NOME', 'LEITURAS', 'TAMANHO', 'ATUALIZACAO'];

export const rotuloTipoVisao: Record<TipoVisao, string> = {
  COMUM: 'Comum',
  MATERIALIZADA: 'Materializada',
};

export const rotuloFiltroTipoVisao: Record<TipoVisao, string> = {
  COMUM: 'Comuns',
  MATERIALIZADA: 'Materializadas',
};

export const rotuloFiltroSituacao: Record<FiltroSituacaoVisao, string> = {
  SEM_DADOS: 'Sem dados',
  DESATUALIZADAS: 'Desatualizadas',
  SEM_LEITURA: 'Sem leitura em 30 dias',
};

export const rotuloTipoObjeto: Record<TipoObjetoBanco, string> = {
  TABELA: 'Tabela',
  VISAO: 'Visão',
  VISAO_MATERIALIZADA: 'Visão materializada',
};

export const direcaoInicialDaOrdenacao: Record<OrdenacaoVisoes, DirecaoOrdenacao> = {
  NOME: 'ASC',
  LEITURAS: 'DESC',
  TAMANHO: 'DESC',
  ATUALIZACAO: 'ASC',
};

export const filtrosVisoesIniciais: FiltrosVisoes = {
  busca: '',
  tipo: null,
  esquema: null,
  situacao: null,
  ordenacao: 'NOME',
  direcao: 'ASC',
  pagina: 1,
};

export interface ContextoDasVisoes {
  geradoEm: string;
  semLeitura: ReadonlySet<string>;
}

export type TomDoAviso = 'aviso' | 'erro';

export interface AvisoDaVisao {
  tom: TomDoAviso;
  texto: string;
}

export type TipoPontoDeAtencao = 'DESATUALIZADA_LIDA' | 'SEM_DADOS' | 'ATUALIZADA_SEM_LEITURA' | 'SEM_LEITURA';

export type AlvoDoPonto = { tipo: 'VISAO'; id: string } | { tipo: 'FILTRO'; situacao: FiltroSituacaoVisao };

export interface PontoDeAtencao {
  tipo: TipoPontoDeAtencao;
  tom: TomDoAviso;
  visao: Pick<VisaoDTO, 'esquema' | 'nome'> | null;
  titulo: string | null;
  texto: string;
  alvo: AlvoDoPonto;
}

const NOMES_NA_FRASE = 3;

const maximoDePontosSeparados: Record<TipoPontoDeAtencao, number> = {
  DESATUALIZADA_LIDA: 2,
  SEM_DADOS: 2,
  ATUALIZADA_SEM_LEITURA: 2,
  SEM_LEITURA: 1,
};

const filtroDoPonto: Record<TipoPontoDeAtencao, FiltroSituacaoVisao> = {
  DESATUALIZADA_LIDA: 'DESATUALIZADAS',
  SEM_DADOS: 'SEM_DADOS',
  ATUALIZADA_SEM_LEITURA: 'SEM_LEITURA',
  SEM_LEITURA: 'SEM_LEITURA',
};

const tituloDoGrupo: Record<TipoPontoDeAtencao, (quantidade: string) => string> = {
  DESATUALIZADA_LIDA: (quantidade) => `${quantidade} materializadas desatualizadas ainda lidas`,
  SEM_DADOS: (quantidade) => `${quantidade} materializadas sem dados`,
  ATUALIZADA_SEM_LEITURA: (quantidade) => `${quantidade} materializadas atualizadas que ninguém lê`,
  SEM_LEITURA: (quantidade) => `${quantidade} visões sem leitura`,
};

const fraseDoGrupo: Record<TipoPontoDeAtencao, (nomes: string) => string> = {
  DESATUALIZADA_LIDA: (nomes) =>
    `${nomes} foram lidas nos últimos 30 dias sem uma atualização nas últimas ${HORAS_ATE_DESATUALIZAR} horas. Quem as lê recebe dados antigos.`,
  SEM_DADOS: (nomes) => `${nomes} estão sem dados. Uma consulta que tentar lê-las recebe um erro até o próximo REFRESH.`,
  ATUALIZADA_SEM_LEITURA: (nomes) =>
    `${nomes} foram atualizadas nos últimos 30 dias, mas nenhuma consulta as leu, nem por outra visão.`,
  SEM_LEITURA: (nomes) => `Nenhuma consulta leu ${nomes} nos últimos 30 dias, nem por outra visão.`,
};

function listarNomes(visoes: VisaoDTO[]): string {
  const nomes = visoes.slice(0, NOMES_NA_FRASE).map(idDoObjeto);
  const restantes = visoes.length - nomes.length;
  if (restantes > 0) return `${nomes.join(', ')} e mais ${formatarNumero(restantes)}`;
  if (nomes.length === 1) return nomes[0] ?? '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1) ?? ''}`;
}

function lerDaLista<T extends string>(lista: readonly T[], valor: unknown): T | null {
  return lista.find((item) => item === valor) ?? null;
}

export function idDoObjeto(objeto: Pick<ReferenciaObjetoDTO, 'esquema' | 'nome'>): string {
  return `${objeto.esquema}.${objeto.nome}`;
}

export function definicaoLegivel(definicao: string): string {
  const linhas = definicao.replace(/\s+$/, '').split('\n');
  const recuo = Math.min(
    ...linhas.filter((linha) => linha.trim() !== '').map((linha) => linha.length - linha.trimStart().length),
  );
  return linhas
    .map((linha) => linha.slice(Number.isFinite(recuo) ? recuo : 0))
    .join('\n')
    .replace(/^\n+/, '');
}

export function lerEsquema(valor: unknown): string | null {
  return typeof valor === 'string' && NOME_DE_ESQUEMA.test(valor) ? valor : null;
}

export function lerFiltrosVisoes(valor: unknown): FiltrosVisoes {
  if (!valor || typeof valor !== 'object') return filtrosVisoesIniciais;
  const guardado = valor as Record<string, unknown>;
  const ordenacao = lerDaLista(ordenacoesVisoes, guardado.ordenacao) ?? filtrosVisoesIniciais.ordenacao;

  return {
    busca: typeof guardado.busca === 'string' ? limparBusca(guardado.busca) : filtrosVisoesIniciais.busca,
    tipo: lerDaLista(tiposVisao, guardado.tipo),
    esquema: lerEsquema(guardado.esquema),
    situacao: lerDaLista(filtrosSituacao, guardado.situacao),
    ordenacao,
    direcao: lerDaLista<DirecaoOrdenacao>(['ASC', 'DESC'], guardado.direcao) ?? direcaoInicialDaOrdenacao[ordenacao],
    pagina: lerPagina(guardado.pagina),
  };
}

export function aplicarMudancaVisoes(filtros: FiltrosVisoes, mudanca: Partial<FiltrosVisoes>): FiltrosVisoes {
  return lerFiltrosVisoes({ ...filtros, ...mudanca, pagina: paginaAposMudanca(filtros, mudanca) });
}

export function alternarOrdenacaoVisoes(
  filtros: FiltrosVisoes,
  ordenacao: OrdenacaoVisoes,
): Pick<FiltrosVisoes, 'ordenacao' | 'direcao'> {
  if (filtros.ordenacao !== ordenacao) return { ordenacao, direcao: direcaoInicialDaOrdenacao[ordenacao] };
  return { ordenacao, direcao: filtros.direcao === 'DESC' ? 'ASC' : 'DESC' };
}

export function temFiltroAtivoVisoes(filtros: FiltrosVisoes): boolean {
  return filtros.busca !== '' || filtros.tipo !== null || filtros.esquema !== null || filtros.situacao !== null;
}

export function semFiltrosVisoes(): Pick<FiltrosVisoes, 'busca' | 'tipo' | 'esquema' | 'situacao'> {
  return { busca: '', tipo: null, esquema: null, situacao: null };
}

export function situacaoDaMaterializada(visao: VisaoDTO, geradoEm: string): SituacaoMaterializada | null {
  const materializacao = visao.materializacao;
  if (!materializacao) return null;
  if (!materializacao.populada) return 'NAO_POPULADA';
  if (!materializacao.ultimaAtualizacao) return 'DESATUALIZADA';
  const horas = (new Date(geradoEm).getTime() - new Date(materializacao.ultimaAtualizacao).getTime()) / MS_POR_HORA;
  return horas > HORAS_ATE_DESATUALIZAR ? 'DESATUALIZADA' : 'ATUALIZADA';
}

export function leiturasDaVisao(visao: VisaoDTO): number {
  return visao.consultas.reduce((soma, consulta) => soma + consulta.quantidadeExecucoes, 0);
}

function atualizacoesNoPeriodo(visao: VisaoDTO): number {
  return visao.materializacao?.atualizacao?.quantidadeExecucoes ?? 0;
}

export function visoesSemLeitura(visoes: VisaoDTO[]): Set<string> {
  const porId = new Map(visoes.map((visao) => [visao.id, visao]));
  const conhecidas = new Map<string, boolean>();

  const foiLida = (id: string, caminho: Set<string>): boolean => {
    const conhecida = conhecidas.get(id);
    if (conhecida !== undefined) return conhecida;
    const visao = porId.get(id);
    if (!visao || caminho.has(id)) return false;

    caminho.add(id);
    const lida =
      visao.consultas.length > 0 ||
      visao.usadaPor.some((referencia) => {
        const dependente = referencia.tipo === 'TABELA' ? undefined : porId.get(idDoObjeto(referencia));
        if (!dependente) return false;
        return atualizacoesNoPeriodo(dependente) > 0 || foiLida(dependente.id, caminho);
      });
    caminho.delete(id);
    conhecidas.set(id, lida);
    return lida;
  };

  return new Set(visoes.filter((visao) => !foiLida(visao.id, new Set())).map((visao) => visao.id));
}

export function esquemasDasVisoes(visoes: VisaoDTO[]): string[] {
  return [...new Set(visoes.map((visao) => visao.esquema))].sort(ORDEM_ALFABETICA.compare);
}

function atendeSituacao(visao: VisaoDTO, situacao: FiltroSituacaoVisao, contexto: ContextoDasVisoes): boolean {
  if (situacao === 'SEM_LEITURA') return contexto.semLeitura.has(visao.id);
  const atual = situacaoDaMaterializada(visao, contexto.geradoEm);
  return situacao === 'SEM_DADOS' ? atual === 'NAO_POPULADA' : atual === 'DESATUALIZADA';
}

function chaveDeOrdenacao(visao: VisaoDTO, ordenacao: OrdenacaoVisoes): number | null {
  const materializacao = visao.materializacao;
  if (ordenacao === 'LEITURAS') return leiturasDaVisao(visao);
  if (!materializacao) return null;
  if (ordenacao === 'TAMANHO') return materializacao.tamanhoBytes;
  if (!materializacao.populada || !materializacao.ultimaAtualizacao) return Number.NEGATIVE_INFINITY;
  return new Date(materializacao.ultimaAtualizacao).getTime();
}

function compararNomes(a: VisaoDTO, b: VisaoDTO): number {
  return ORDEM_ALFABETICA.compare(a.esquema, b.esquema) || ORDEM_ALFABETICA.compare(a.nome, b.nome);
}

export function ordenarVisoes(visoes: VisaoDTO[], ordenacao: OrdenacaoVisoes, direcao: DirecaoOrdenacao): VisaoDTO[] {
  const sinal = direcao === 'ASC' ? 1 : -1;
  return [...visoes].sort((a, b) => {
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

export function filtrarVisoes(visoes: VisaoDTO[], filtros: FiltrosVisoes, contexto: ContextoDasVisoes): VisaoDTO[] {
  const termos = termosDaBusca(filtros.busca);
  const encontradas = visoes.filter(
    (visao) =>
      (termos.length === 0 || correspondeABusca(`${idDoObjeto(visao)} ${visao.descricao ?? ''}`, termos)) &&
      (filtros.tipo === null || visao.tipo === filtros.tipo) &&
      (filtros.esquema === null || visao.esquema === filtros.esquema) &&
      (filtros.situacao === null || atendeSituacao(visao, filtros.situacao, contexto)),
  );
  return ordenarVisoes(encontradas, filtros.ordenacao, filtros.direcao);
}

export function resumirVisoes(total: number, encontradas: number, filtros: FiltrosVisoes): string {
  if (total === 0) return 'Nenhuma visão no banco';
  const doBanco = `${formatarNumero(total)} ${pluralizar(total, 'visão', 'visões')}`;
  if (!temFiltroAtivoVisoes(filtros)) return doBanco;
  return `${formatarNumero(encontradas)} de ${doBanco}`;
}

export function descreverFiltrosVisoes(filtros: FiltrosVisoes): string[] {
  const partes: string[] = [];
  if (filtros.busca !== '') partes.push(`busca por “${filtros.busca}”`);
  if (filtros.tipo) partes.push(`tipo: ${rotuloFiltroTipoVisao[filtros.tipo].toLowerCase()}`);
  if (filtros.esquema) partes.push(`esquema: ${filtros.esquema}`);
  if (filtros.situacao) partes.push(`situação: ${rotuloFiltroSituacao[filtros.situacao].toLowerCase()}`);
  return partes;
}

function vezes(quantidade: number): string {
  return `${formatarNumero(quantidade)} ${pluralizar(quantidade, 'vez', 'vezes')}`;
}

function tipoDoPonto(visao: VisaoDTO, contexto: ContextoDasVisoes): TipoPontoDeAtencao | null {
  const situacao = situacaoDaMaterializada(visao, contexto.geradoEm);
  if (situacao === 'DESATUALIZADA' && leiturasDaVisao(visao) > 0) return 'DESATUALIZADA_LIDA';
  if (situacao === 'NAO_POPULADA') return 'SEM_DADOS';
  if (!contexto.semLeitura.has(visao.id)) return null;
  return atualizacoesNoPeriodo(visao) > 0 ? 'ATUALIZADA_SEM_LEITURA' : 'SEM_LEITURA';
}

function fraseDoPonto(tipo: TipoPontoDeAtencao, visao: VisaoDTO, geradoEm: string): string {
  const leituras = vezes(leiturasDaVisao(visao));
  const ultima = visao.materializacao?.ultimaAtualizacao ?? null;
  const atualizacao = visao.materializacao?.atualizacao ?? null;

  if (tipo === 'DESATUALIZADA_LIDA') {
    return ultima
      ? `Lida ${leituras} nos últimos 30 dias, mas atualizada pela última vez ${formatarTempoRelativo(ultima, new Date(geradoEm))}. Quem a lê recebe os dados daquele momento.`
      : `Lida ${leituras} nos últimos 30 dias sem nenhuma atualização registrada no período. Quem a lê recebe dados de antes disso.`;
  }
  if (tipo === 'SEM_DADOS') {
    return 'Está sem dados: foi criada ou atualizada com WITH NO DATA. Uma consulta que tentar lê-la recebe um erro até o próximo REFRESH.';
  }
  if (tipo === 'ATUALIZADA_SEM_LEITURA' && atualizacao) {
    return `Atualizada ${vezes(atualizacao.quantidadeExecucoes)} nos últimos 30 dias, num total de ${formatarDuracaoExtensa(atualizacao.tempoTotalMs)}, mas nenhuma consulta a leu, nem por outra visão.`;
  }
  return 'Nenhuma consulta a leu nos últimos 30 dias, nem diretamente nem por outra visão.';
}

const ordemDosPontos: TipoPontoDeAtencao[] = ['DESATUALIZADA_LIDA', 'SEM_DADOS', 'ATUALIZADA_SEM_LEITURA', 'SEM_LEITURA'];

export function pontosDeAtencao(visoes: VisaoDTO[], contexto: ContextoDasVisoes): PontoDeAtencao[] {
  const ordenadas = ordenarVisoes(visoes, 'LEITURAS', 'DESC');

  return ordemDosPontos.flatMap((tipo): PontoDeAtencao[] => {
    const doTipo = ordenadas.filter((visao) => tipoDoPonto(visao, contexto) === tipo);
    const tom: TomDoAviso = tipo === 'SEM_DADOS' ? 'erro' : 'aviso';

    if (doTipo.length > maximoDePontosSeparados[tipo]) {
      return [
        {
          tipo,
          tom,
          visao: null,
          titulo: tituloDoGrupo[tipo](formatarNumero(doTipo.length)),
          texto: fraseDoGrupo[tipo](listarNomes(doTipo)),
          alvo: { tipo: 'FILTRO', situacao: filtroDoPonto[tipo] },
        },
      ];
    }

    return doTipo.map((visao) => ({
      tipo,
      tom,
      visao: { esquema: visao.esquema, nome: visao.nome },
      titulo: null,
      texto: fraseDoPonto(tipo, visao, contexto.geradoEm),
      alvo: { tipo: 'VISAO', id: visao.id },
    }));
  });
}

export function avisosDaVisao(visao: VisaoDTO, contexto: ContextoDasVisoes): AvisoDaVisao[] {
  const avisos: AvisoDaVisao[] = [];
  const situacao = situacaoDaMaterializada(visao, contexto.geradoEm);
  const leituras = leiturasDaVisao(visao);
  const lidaNoPeriodo = leituras > 0 ? ` Ela foi lida ${vezes(leituras)} nos últimos 30 dias.` : '';

  if (situacao === 'NAO_POPULADA') {
    avisos.push({
      tom: 'erro',
      texto:
        'A visão está sem dados: foi criada ou atualizada com WITH NO DATA. Quem tentar lê-la recebe um erro até o próximo REFRESH.',
    });
  }

  const ultimaAtualizacao = visao.materializacao?.ultimaAtualizacao ?? null;
  if (situacao === 'DESATUALIZADA') {
    avisos.push({
      tom: 'aviso',
      texto: ultimaAtualizacao
        ? `A última atualização foi ${formatarTempoRelativo(ultimaAtualizacao, new Date(contexto.geradoEm))}, mais de ${HORAS_ATE_DESATUALIZAR} horas atrás. Quem lê a visão recebe os dados daquele momento.${lidaNoPeriodo}`
        : `O Orynt não registrou nenhuma atualização nos últimos 30 dias. Quem lê a visão recebe dados de antes disso.${lidaNoPeriodo}`,
    });
  }

  if (contexto.semLeitura.has(visao.id)) {
    const atualizacao = visao.materializacao?.atualizacao ?? null;
    avisos.push({
      tom: 'aviso',
      texto:
        atualizacao && atualizacao.quantidadeExecucoes > 0
          ? `Nenhuma consulta leu a visão nos últimos 30 dias, nem por outra visão, mas ela foi atualizada ${vezes(atualizacao.quantidadeExecucoes)}, num total de ${formatarDuracaoExtensa(atualizacao.tempoTotalMs)}.`
          : 'Nenhuma consulta leu a visão nos últimos 30 dias, nem diretamente nem por outra visão. Antes de removê-la, confira se algum processo que roda com menos frequência ainda a usa.',
    });
  }

  return avisos;
}
