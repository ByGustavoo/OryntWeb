import type {
  ConcessaoDTO,
  FiltroDeAcesso,
  FiltroDePapel,
  FiltrosPermissoes,
  ListaPermissoesDTO,
  ModoPermissoes,
  NivelDeAcesso,
  ObjetoComPermissoesDTO,
  PapelDasPermissoesDTO,
  Privilegio,
  PrivilegioPadraoDTO,
  SituacaoPermissao,
  TipoObjetoPermissao,
  TipoPrivilegioPadrao,
} from '@/modelos/permissoes';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { correspondeABusca, limparBusca, termosDaBusca } from './buscaConsultas';
import { lerIdDaFuncao } from './funcoes';
import { lerTabela } from './indices';
import { lerPagina, paginaAposMudanca } from './paginacaoLocal';
import { identificadorSql, lerNomeDoPapel } from './papeis';
import type { TomDoAviso } from './visoes';
import { lerEsquema } from './visoes';

export const PUBLICO = 'PUBLIC';
export const MINIMO_DE_LEITURAS_DO_GRUPO = 3;
export const PARTE_MAXIMA_DE_ESCRITA = 0.25;
export const MINIMO_DE_LEITURAS_NO_ESQUEMA = 2;

const ORDEM_ALFABETICA = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const NOMES_NA_FRASE = 3;
const MAXIMO_DE_PONTOS_SEPARADOS = 2;
const PREFIXO_DO_BANCO = 'banco:';
const PREFIXO_DO_ESQUEMA = 'esquema:';
const NOME_DE_BANCO = /^[A-Za-z_][\w$-]{0,62}$/;

export const tiposObjetoPermissao: TipoObjetoPermissao[] = [
  'BANCO',
  'ESQUEMA',
  'TABELA',
  'VISAO',
  'VISAO_MATERIALIZADA',
  'SEQUENCIA',
  'FUNCAO',
  'PROCEDIMENTO',
];

export const modosPermissoes: ModoPermissoes[] = ['PAPEL', 'OBJETO', 'COMPARACAO'];

export const filtrosDeAcesso: FiltroDeAcesso[] = ['TOTAL', 'ESCRITA', 'LEITURA', 'MANUTENCAO', 'SEM_ACESSO'];

export const filtrosDePapel: FiltroDePapel[] = ['USUARIO', 'GRUPO'];

export const situacoesPermissao: SituacaoPermissao[] = [
  'DEFINIDOR_ABERTO',
  'TODOS_CRIAM',
  'ESCRITA_NA_LEITURA',
  'REPASSE',
  'SEM_USAGE',
  'SEM_PRIVILEGIO_PADRAO',
  'USAGE_SEM_OBJETOS',
];

export const rotuloModoPermissoes: Record<ModoPermissoes, string> = {
  PAPEL: 'Por papel',
  OBJETO: 'Por objeto',
  COMPARACAO: 'Comparar papéis',
};

export const rotuloTipoObjetoPermissao: Record<TipoObjetoPermissao, string> = {
  BANCO: 'Banco',
  ESQUEMA: 'Esquema',
  TABELA: 'Tabela',
  VISAO: 'Visão',
  VISAO_MATERIALIZADA: 'Visão materializada',
  SEQUENCIA: 'Sequência',
  FUNCAO: 'Função',
  PROCEDIMENTO: 'Procedimento',
};

export const rotuloFiltroTipoObjeto: Record<TipoObjetoPermissao, string> = {
  BANCO: 'O banco',
  ESQUEMA: 'Esquemas',
  TABELA: 'Tabelas',
  VISAO: 'Visões',
  VISAO_MATERIALIZADA: 'Visões materializadas',
  SEQUENCIA: 'Sequências',
  FUNCAO: 'Funções',
  PROCEDIMENTO: 'Procedimentos',
};

export const rotuloFiltroDeAcesso: Record<FiltroDeAcesso, string> = {
  TOTAL: 'Acesso total',
  ESCRITA: 'Com escrita',
  LEITURA: 'Só leitura ou uso',
  MANUTENCAO: 'Só manutenção',
  SEM_ACESSO: 'Sem acesso',
};

export const rotuloFiltroDePapel: Record<FiltroDePapel, string> = {
  USUARIO: 'Usuários',
  GRUPO: 'Grupos',
};

export const rotuloSituacaoPermissao: Record<SituacaoPermissao, string> = {
  DEFINIDOR_ABERTO: 'Aberta a todos',
  TODOS_CRIAM: 'Todos criam aqui',
  ESCRITA_NA_LEITURA: 'Escrita na leitura',
  REPASSE: 'Pode repassar',
  SEM_USAGE: 'Sem USAGE',
  SEM_PRIVILEGIO_PADRAO: 'Sem privilégio padrão',
  USAGE_SEM_OBJETOS: 'USAGE sem objetos',
};

export const rotuloFiltroSituacaoPermissao: Record<SituacaoPermissao, string> = {
  DEFINIDOR_ABERTO: 'SECURITY DEFINER aberta a todos',
  TODOS_CRIAM: 'Esquema em que todos criam',
  ESCRITA_NA_LEITURA: 'Escrita num grupo de leitura',
  REPASSE: 'Com WITH GRANT OPTION',
  SEM_USAGE: 'Sem USAGE no esquema',
  SEM_PRIVILEGIO_PADRAO: 'Sem privilégio padrão',
  USAGE_SEM_OBJETOS: 'USAGE sem objetos',
};

export const tomDaSituacaoPermissao: Record<SituacaoPermissao, TomDoAviso> = {
  DEFINIDOR_ABERTO: 'erro',
  TODOS_CRIAM: 'erro',
  ESCRITA_NA_LEITURA: 'aviso',
  REPASSE: 'aviso',
  SEM_USAGE: 'aviso',
  SEM_PRIVILEGIO_PADRAO: 'aviso',
  USAGE_SEM_OBJETOS: 'aviso',
};

export const privilegiosDoTipo: Record<TipoObjetoPermissao, Privilegio[]> = {
  BANCO: ['CONNECT', 'CREATE', 'TEMPORARY'],
  ESQUEMA: ['USAGE', 'CREATE'],
  TABELA: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'],
  VISAO: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'REFERENCES', 'TRIGGER'],
  VISAO_MATERIALIZADA: ['SELECT', 'REFERENCES', 'MAINTAIN'],
  SEQUENCIA: ['USAGE', 'SELECT', 'UPDATE'],
  FUNCAO: ['EXECUTE'],
  PROCEDIMENTO: ['EXECUTE'],
};

export type CategoriaDoPrivilegio = 'LEITURA' | 'ESCRITA' | 'MANUTENCAO';

export const categoriaDoPrivilegio: Record<Privilegio, CategoriaDoPrivilegio> = {
  CONNECT: 'LEITURA',
  TEMPORARY: 'LEITURA',
  USAGE: 'LEITURA',
  SELECT: 'LEITURA',
  EXECUTE: 'LEITURA',
  CREATE: 'ESCRITA',
  INSERT: 'ESCRITA',
  UPDATE: 'ESCRITA',
  DELETE: 'ESCRITA',
  TRUNCATE: 'ESCRITA',
  REFERENCES: 'MANUTENCAO',
  TRIGGER: 'MANUTENCAO',
  MAINTAIN: 'MANUTENCAO',
};

const ordemDoNivel: Record<NivelDeAcesso, number> = { TOTAL: 0, ESCRITA: 1, LEITURA: 2, MANUTENCAO: 3, NENHUM: 4 };

const tiposRelacao: TipoObjetoPermissao[] = ['TABELA', 'VISAO', 'VISAO_MATERIALIZADA'];

const privilegioMinimo: Record<TipoObjetoPermissao, Privilegio> = {
  BANCO: 'CONNECT',
  ESQUEMA: 'USAGE',
  TABELA: 'SELECT',
  VISAO: 'SELECT',
  VISAO_MATERIALIZADA: 'SELECT',
  SEQUENCIA: 'USAGE',
  FUNCAO: 'EXECUTE',
  PROCEDIMENTO: 'EXECUTE',
};

const palavraDoTipoSql: Record<TipoObjetoPermissao, string> = {
  BANCO: 'DATABASE',
  ESQUEMA: 'SCHEMA',
  TABELA: 'TABLE',
  VISAO: 'TABLE',
  VISAO_MATERIALIZADA: 'TABLE',
  SEQUENCIA: 'SEQUENCE',
  FUNCAO: 'FUNCTION',
  PROCEDIMENTO: 'PROCEDURE',
};

const palavraDoPadraoSql: Record<TipoPrivilegioPadrao, string> = {
  TABELAS: 'TABLES',
  SEQUENCIAS: 'SEQUENCES',
  FUNCOES: 'FUNCTIONS',
};

const textoDoPadrao: Record<TipoPrivilegioPadrao, string> = {
  TABELAS: 'As tabelas e visões',
  SEQUENCIAS: 'As sequências',
  FUNCOES: 'As funções',
};

export const filtrosPermissoesIniciais: FiltrosPermissoes = {
  modo: 'PAPEL',
  papel: null,
  objeto: null,
  comparado: null,
  busca: '',
  esquema: null,
  tipoObjeto: null,
  tipoPapel: null,
  acesso: null,
  situacao: null,
  soDiferencas: true,
  pagina: 1,
};

export type OrigemDoAcesso =
  | { tipo: 'SUPERUSUARIO' }
  | { tipo: 'DONO'; caminho: string[] }
  | { tipo: 'CONCESSAO'; caminho: string[]; concessao: ConcessaoDTO }
  | { tipo: 'PUBLICO'; concessao: ConcessaoDTO };

export interface PrivilegioEfetivo {
  privilegio: Privilegio;
  origens: OrigemDoAcesso[];
  colunas: string[] | null;
  repassavel: boolean;
}

export interface Acesso {
  sujeito: string;
  objeto: ObjetoComPermissoesDTO;
  privilegios: PrivilegioEfetivo[];
  nivel: NivelDeAcesso;
}

export interface LinhaPermissao {
  chave: string;
  acesso: Acesso;
  situacoes: SituacaoPermissao[];
}

export interface LinhaComparacao {
  chave: string;
  objeto: ObjetoComPermissoesDTO;
  a: Acesso;
  b: Acesso;
  soEmA: Privilegio[];
  soEmB: Privilegio[];
}

export interface FaltaDePrivilegioPadrao {
  grupo: string;
  esquema: string;
  criadores: string[];
  lidos: ObjetoComPermissoesDTO[];
  foraDoAlcance: ObjetoComPermissoesDTO[];
}

export interface IndiceDasPermissoes {
  dados: ListaPermissoesDTO;
  papeis: Map<string, PapelDasPermissoesDTO>;
  objetos: Map<string, ObjetoComPermissoesDTO>;
  esquemas: Map<string, ObjetoComPermissoesDTO>;
  ordenados: ObjetoComPermissoesDTO[];
  herdados: Map<string, Map<string, string[]>>;
  gruposDeLeitura: Set<string>;
  faltasDePadrao: FaltaDePrivilegioPadrao[];
  cache: Map<string, Acesso>;
}

function lerDaLista<T extends string>(lista: readonly T[], valor: unknown): T | null {
  return lista.find((item) => item === valor) ?? null;
}

export function idDoBanco(nome: string): string {
  return `${PREFIXO_DO_BANCO}${nome}`;
}

export function idDoEsquema(nome: string): string {
  return `${PREFIXO_DO_ESQUEMA}${nome}`;
}

export function lerIdDoObjetoPermissao(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  if (valor.startsWith(PREFIXO_DO_BANCO)) {
    return NOME_DE_BANCO.test(valor.slice(PREFIXO_DO_BANCO.length)) ? valor : null;
  }
  if (valor.startsWith(PREFIXO_DO_ESQUEMA)) {
    return lerEsquema(valor.slice(PREFIXO_DO_ESQUEMA.length)) ? valor : null;
  }
  return lerTabela(valor) ?? lerIdDaFuncao(valor);
}

export function lerSujeito(valor: unknown): string | null {
  if (valor === PUBLICO) return PUBLICO;
  return lerNomeDoPapel(valor);
}

export function lerFiltrosPermissoes(valor: unknown): FiltrosPermissoes {
  if (!valor || typeof valor !== 'object') return filtrosPermissoesIniciais;
  const guardado = valor as Record<string, unknown>;

  return {
    modo: lerDaLista(modosPermissoes, guardado.modo) ?? filtrosPermissoesIniciais.modo,
    papel: lerSujeito(guardado.papel),
    objeto: lerIdDoObjetoPermissao(guardado.objeto),
    comparado: lerNomeDoPapel(guardado.comparado),
    busca: typeof guardado.busca === 'string' ? limparBusca(guardado.busca) : filtrosPermissoesIniciais.busca,
    esquema: lerEsquema(guardado.esquema),
    tipoObjeto: lerDaLista(tiposObjetoPermissao, guardado.tipoObjeto),
    tipoPapel: lerDaLista(filtrosDePapel, guardado.tipoPapel),
    acesso: lerDaLista(filtrosDeAcesso, guardado.acesso),
    situacao: lerDaLista(situacoesPermissao, guardado.situacao),
    soDiferencas: typeof guardado.soDiferencas === 'boolean' ? guardado.soDiferencas : filtrosPermissoesIniciais.soDiferencas,
    pagina: lerPagina(guardado.pagina),
  };
}

export function semFiltrosPermissoes(): Pick<
  FiltrosPermissoes,
  'busca' | 'esquema' | 'tipoObjeto' | 'tipoPapel' | 'acesso' | 'situacao' | 'soDiferencas'
> {
  return { busca: '', esquema: null, tipoObjeto: null, tipoPapel: null, acesso: null, situacao: null, soDiferencas: true };
}

export function aplicarMudancaPermissoes(
  filtros: FiltrosPermissoes,
  mudanca: Partial<FiltrosPermissoes>,
): FiltrosPermissoes {
  const trocouDeModo = mudanca.modo !== undefined && mudanca.modo !== filtros.modo;
  const base = trocouDeModo ? { ...filtros, ...semFiltrosPermissoes() } : filtros;
  return lerFiltrosPermissoes({ ...base, ...mudanca, pagina: paginaAposMudanca(filtros, mudanca) });
}

export function temFiltroAtivoPermissoes(filtros: FiltrosPermissoes): boolean {
  if (filtros.busca !== '') return true;
  if (filtros.modo === 'OBJETO') return filtros.tipoPapel !== null || filtros.acesso !== null || filtros.situacao !== null;
  if (filtros.modo === 'COMPARACAO') return filtros.esquema !== null || filtros.tipoObjeto !== null || !filtros.soDiferencas;
  return filtros.esquema !== null || filtros.tipoObjeto !== null || filtros.acesso !== null || filtros.situacao !== null;
}

function compararNomes(a: string, b: string): number {
  return ORDEM_ALFABETICA.compare(a, b);
}

export function nomeCompleto(objeto: Pick<ObjetoComPermissoesDTO, 'esquema' | 'nome'>): string {
  return objeto.esquema ? `${objeto.esquema}.${objeto.nome}` : objeto.nome;
}

function compararObjetos(a: ObjetoComPermissoesDTO, b: ObjetoComPermissoesDTO): number {
  return (
    tiposObjetoPermissao.indexOf(a.tipo) - tiposObjetoPermissao.indexOf(b.tipo) ||
    compararNomes(a.esquema ?? '', b.esquema ?? '') ||
    compararNomes(a.nome, b.nome)
  );
}

function caminhosHerdados(papel: PapelDasPermissoesDTO, papeis: Map<string, PapelDasPermissoesDTO>): Map<string, string[]> {
  const herdados = new Map<string, string[]>();
  const fila: { papel: PapelDasPermissoesDTO; caminho: string[] }[] = [{ papel, caminho: [] }];
  const visitados = new Set([papel.nome]);

  for (let atual = fila.shift(); atual; atual = fila.shift()) {
    for (const participacao of atual.papel.membroDe) {
      if (!participacao.herda || visitados.has(participacao.papel)) continue;
      visitados.add(participacao.papel);
      const caminho = [...atual.caminho, participacao.papel];
      herdados.set(participacao.papel, caminho);
      const grupo = papeis.get(participacao.papel);
      if (grupo) fila.push({ papel: grupo, caminho });
    }
  }

  return herdados;
}

function concessoesDiretas(objeto: ObjetoComPermissoesDTO, beneficiario: string): ConcessaoDTO[] {
  return objeto.concessoes.filter((concessao) => concessao.beneficiario === beneficiario);
}

function leGrupo(objeto: ObjetoComPermissoesDTO, grupo: string): boolean {
  return concessoesDiretas(objeto, grupo).some((concessao) => concessao.privilegio === 'SELECT' && concessao.colunas === null);
}

function encontrarGruposDeLeitura(dados: ListaPermissoesDTO): Set<string> {
  const grupos = new Set<string>();
  for (const papel of dados.papeis) {
    if (papel.login || papel.superusuario) continue;
    const relacoes = dados.objetos.filter((objeto) => tiposRelacao.includes(objeto.tipo) && objeto.dono !== papel.nome);
    const lidas = relacoes.filter((objeto) => leGrupo(objeto, papel.nome));
    const gravadas = relacoes.filter((objeto) =>
      concessoesDiretas(objeto, papel.nome).some((concessao) => categoriaDoPrivilegio[concessao.privilegio] === 'ESCRITA'),
    );
    if (
      lidas.length >= MINIMO_DE_LEITURAS_DO_GRUPO &&
      gravadas.length > 0 &&
      gravadas.length <= Math.floor(lidas.length * PARTE_MAXIMA_DE_ESCRITA)
    ) {
      grupos.add(papel.nome);
    }
  }
  return grupos;
}

function temPadrao(
  padroes: PrivilegioPadraoDTO[],
  criador: string,
  esquema: string,
  grupo: string,
  privilegio: Privilegio,
): boolean {
  return padroes.some(
    (padrao) =>
      padrao.criador === criador &&
      (padrao.esquema === null || padrao.esquema === esquema) &&
      padrao.tipoDeObjeto === 'TABELAS' &&
      (padrao.beneficiario === grupo || padrao.beneficiario === PUBLICO) &&
      padrao.privilegios.includes(privilegio),
  );
}

function encontrarFaltasDePadrao(dados: ListaPermissoesDTO): FaltaDePrivilegioPadrao[] {
  const faltas: FaltaDePrivilegioPadrao[] = [];
  const esquemas = dados.objetos.filter((objeto) => objeto.tipo === 'ESQUEMA').map((objeto) => objeto.nome);

  for (const papel of dados.papeis) {
    if (papel.login || papel.superusuario) continue;
    for (const esquema of esquemas) {
      const relacoes = dados.objetos.filter(
        (objeto) => objeto.esquema === esquema && tiposRelacao.includes(objeto.tipo) && objeto.dono !== papel.nome,
      );
      const lidos = relacoes.filter((objeto) => leGrupo(objeto, papel.nome));
      if (lidos.length < MINIMO_DE_LEITURAS_NO_ESQUEMA) continue;
      const criadores = [...new Set(lidos.map((objeto) => objeto.dono))]
        .filter((criador) => !temPadrao(dados.privilegiosPadrao, criador, esquema, papel.nome, 'SELECT'))
        .sort(compararNomes);
      if (criadores.length === 0) continue;
      faltas.push({
        grupo: papel.nome,
        esquema,
        criadores,
        lidos,
        foraDoAlcance: relacoes.filter((objeto) => criadores.includes(objeto.dono) && !leGrupo(objeto, papel.nome)),
      });
    }
  }

  return faltas;
}

export function indexarPermissoes(dados: ListaPermissoesDTO): IndiceDasPermissoes {
  const papeis = new Map(dados.papeis.map((papel) => [papel.nome, papel]));
  const objetos = new Map(dados.objetos.map((objeto) => [objeto.id, objeto]));
  const esquemas = new Map(
    dados.objetos.filter((objeto) => objeto.tipo === 'ESQUEMA').map((objeto) => [objeto.nome, objeto] as const),
  );
  return {
    dados,
    papeis,
    objetos,
    esquemas,
    ordenados: [...dados.objetos].sort(compararObjetos),
    herdados: new Map(dados.papeis.map((papel) => [papel.nome, caminhosHerdados(papel, papeis)])),
    gruposDeLeitura: encontrarGruposDeLeitura(dados),
    faltasDePadrao: encontrarFaltasDePadrao(dados),
    cache: new Map(),
  };
}

function nivelDosPrivilegios(privilegios: PrivilegioEfetivo[]): NivelDeAcesso {
  if (privilegios.some((item) => item.origens.some((origem) => origem.tipo === 'SUPERUSUARIO' || origem.tipo === 'DONO'))) {
    return 'TOTAL';
  }
  const categorias = new Set(privilegios.map((item) => categoriaDoPrivilegio[item.privilegio]));
  if (categorias.has('ESCRITA')) return 'ESCRITA';
  if (categorias.has('LEITURA')) return 'LEITURA';
  if (categorias.has('MANUTENCAO')) return 'MANUTENCAO';
  return 'NENHUM';
}

function todosOsPrivilegios(objeto: ObjetoComPermissoesDTO, origem: OrigemDoAcesso): PrivilegioEfetivo[] {
  return privilegiosDoTipo[objeto.tipo].map((privilegio) => ({
    privilegio,
    origens: [origem],
    colunas: null,
    repassavel: true,
  }));
}

function origemDaConcessao(
  concessao: ConcessaoDTO,
  sujeito: string,
  herdados: Map<string, string[]> | undefined,
): OrigemDoAcesso | null {
  if (concessao.beneficiario === sujeito) return { tipo: 'CONCESSAO', caminho: [], concessao };
  if (concessao.beneficiario === PUBLICO) return { tipo: 'PUBLICO', concessao };
  const caminho = herdados?.get(concessao.beneficiario);
  return caminho ? { tipo: 'CONCESSAO', caminho, concessao } : null;
}

function ordemDaOrigem(origem: OrigemDoAcesso): number {
  if (origem.tipo === 'SUPERUSUARIO') return 0;
  if (origem.tipo === 'DONO') return 1;
  if (origem.tipo === 'CONCESSAO') return origem.caminho.length === 0 ? 2 : 2 + origem.caminho.length;
  return 100;
}

function calcularAcesso(sujeito: string, objeto: ObjetoComPermissoesDTO, indice: IndiceDasPermissoes): Acesso {
  const papel = indice.papeis.get(sujeito);
  const herdados = indice.herdados.get(sujeito);

  if (papel?.superusuario) {
    const privilegios = todosOsPrivilegios(objeto, { tipo: 'SUPERUSUARIO' });
    return { sujeito, objeto, privilegios, nivel: 'TOTAL' };
  }
  const caminhoDoDono = objeto.dono === sujeito ? [] : herdados?.get(objeto.dono);
  if (sujeito !== PUBLICO && caminhoDoDono) {
    const privilegios = todosOsPrivilegios(objeto, { tipo: 'DONO', caminho: caminhoDoDono });
    return { sujeito, objeto, privilegios, nivel: 'TOTAL' };
  }

  const porPrivilegio = new Map<Privilegio, PrivilegioEfetivo>();
  for (const concessao of objeto.concessoes) {
    const origem = origemDaConcessao(concessao, sujeito, herdados);
    if (!origem) continue;
    const atual = porPrivilegio.get(concessao.privilegio);
    if (!atual) {
      porPrivilegio.set(concessao.privilegio, {
        privilegio: concessao.privilegio,
        origens: [origem],
        colunas: concessao.colunas,
        repassavel: concessao.repassavel,
      });
      continue;
    }
    atual.origens.push(origem);
    atual.colunas =
      atual.colunas === null || concessao.colunas === null ? null : [...new Set([...atual.colunas, ...concessao.colunas])];
    atual.repassavel ||= concessao.repassavel;
  }

  const privilegios = privilegiosDoTipo[objeto.tipo].flatMap((privilegio) => {
    const efetivo = porPrivilegio.get(privilegio);
    if (!efetivo) return [];
    return [{ ...efetivo, origens: [...efetivo.origens].sort((a, b) => ordemDaOrigem(a) - ordemDaOrigem(b)) }];
  });
  return { sujeito, objeto, privilegios, nivel: nivelDosPrivilegios(privilegios) };
}

export function acessoDe(sujeito: string, objeto: ObjetoComPermissoesDTO, indice: IndiceDasPermissoes): Acesso {
  const chave = `${sujeito}\u0000${objeto.id}`;
  const guardado = indice.cache.get(chave);
  if (guardado) return guardado;
  const acesso = calcularAcesso(sujeito, objeto, indice);
  indice.cache.set(chave, acesso);
  return acesso;
}

export function ehSuperusuario(sujeito: string, indice: IndiceDasPermissoes): boolean {
  return indice.papeis.get(sujeito)?.superusuario ?? false;
}

function origemPropria(origem: OrigemDoAcesso): boolean {
  return origem.tipo !== 'PUBLICO';
}

export function temAcessoProprio(acesso: Acesso): boolean {
  return acesso.privilegios.some((item) => item.origens.some(origemPropria));
}

export function temPrivilegio(acesso: Acesso, privilegio: Privilegio): boolean {
  return acesso.privilegios.some((item) => item.privilegio === privilegio);
}

function usaOEsquema(sujeito: string, esquema: string, indice: IndiceDasPermissoes): boolean {
  const objeto = indice.esquemas.get(esquema);
  return objeto ? temPrivilegio(acessoDe(sujeito, objeto, indice), 'USAGE') : true;
}

function veioDePublico(acesso: Acesso, privilegio: Privilegio): boolean {
  if (acesso.sujeito === PUBLICO) return temPrivilegio(acesso, privilegio);
  return acesso.privilegios.some(
    (item) => item.privilegio === privilegio && item.origens.some((origem) => origem.tipo === 'PUBLICO'),
  );
}

export function definidorAberto(objeto: ObjetoComPermissoesDTO): boolean {
  return (
    (objeto.tipo === 'FUNCAO' || objeto.tipo === 'PROCEDIMENTO') &&
    objeto.segurancaDefinidor &&
    concessoesDiretas(objeto, PUBLICO).some((concessao) => concessao.privilegio === 'EXECUTE')
  );
}

export function todosCriam(objeto: ObjetoComPermissoesDTO): boolean {
  return (
    objeto.tipo === 'ESQUEMA' && concessoesDiretas(objeto, PUBLICO).some((concessao) => concessao.privilegio === 'CREATE')
  );
}

function concessoesDeEscritaNaLeitura(acesso: Acesso, indice: IndiceDasPermissoes): ConcessaoDTO[] {
  return acesso.privilegios.flatMap((item) =>
    categoriaDoPrivilegio[item.privilegio] !== 'ESCRITA'
      ? []
      : item.origens.flatMap((origem) =>
          origem.tipo === 'CONCESSAO' && indice.gruposDeLeitura.has(origem.concessao.beneficiario) ? [origem.concessao] : [],
        ),
  );
}

function concessoesRepassaveis(acesso: Acesso, indice: IndiceDasPermissoes): ConcessaoDTO[] {
  if (!indice.papeis.get(acesso.sujeito)?.login) return [];
  return acesso.privilegios.flatMap((item) =>
    item.origens.flatMap((origem) =>
      origem.tipo === 'CONCESSAO' && origem.caminho.length === 0 && origem.concessao.repassavel ? [origem.concessao] : [],
    ),
  );
}

function faltaUsage(acesso: Acesso, indice: IndiceDasPermissoes): boolean {
  const { sujeito, objeto } = acesso;
  if (sujeito === PUBLICO || ehSuperusuario(sujeito, indice)) return false;
  if (objeto.esquema === null || objeto.tipo === 'ESQUEMA' || objeto.tipo === 'BANCO') return false;
  return temAcessoProprio(acesso) && !usaOEsquema(sujeito, objeto.esquema, indice);
}

function usageDireto(acesso: Acesso): boolean {
  return acesso.privilegios.some(
    (item) =>
      item.privilegio === 'USAGE' &&
      item.origens.some((origem) => origem.tipo === 'CONCESSAO' && origem.caminho.length === 0),
  );
}

function usageSemObjetos(acesso: Acesso, indice: IndiceDasPermissoes): boolean {
  const { sujeito, objeto } = acesso;
  if (objeto.tipo !== 'ESQUEMA' || sujeito === PUBLICO || acesso.nivel === 'TOTAL') return false;
  if (!usageDireto(acesso) || temPrivilegio(acesso, 'CREATE')) return false;
  return !indice.dados.objetos.some(
    (candidato) => candidato.esquema === objeto.nome && temAcessoProprio(acessoDe(sujeito, candidato, indice)),
  );
}

export function faltaDePadraoDoAcesso(acesso: Acesso, indice: IndiceDasPermissoes): FaltaDePrivilegioPadrao | null {
  if (acesso.objeto.tipo !== 'ESQUEMA') return null;
  return (
    indice.faltasDePadrao.find((falta) => falta.grupo === acesso.sujeito && falta.esquema === acesso.objeto.nome) ?? null
  );
}

export function situacoesDoAcesso(acesso: Acesso, indice: IndiceDasPermissoes): SituacaoPermissao[] {
  const situacoes: SituacaoPermissao[] = [];
  if (definidorAberto(acesso.objeto) && veioDePublico(acesso, 'EXECUTE')) situacoes.push('DEFINIDOR_ABERTO');
  if (todosCriam(acesso.objeto) && veioDePublico(acesso, 'CREATE')) situacoes.push('TODOS_CRIAM');
  if (concessoesDeEscritaNaLeitura(acesso, indice).length > 0) situacoes.push('ESCRITA_NA_LEITURA');
  if (concessoesRepassaveis(acesso, indice).length > 0) situacoes.push('REPASSE');
  if (faltaUsage(acesso, indice)) situacoes.push('SEM_USAGE');
  if (faltaDePadraoDoAcesso(acesso, indice)) situacoes.push('SEM_PRIVILEGIO_PADRAO');
  if (usageSemObjetos(acesso, indice)) situacoes.push('USAGE_SEM_OBJETOS');
  return situacoes;
}

function linha(chave: string, acesso: Acesso, indice: IndiceDasPermissoes): LinhaPermissao {
  return { chave, acesso, situacoes: situacoesDoAcesso(acesso, indice) };
}

export function linhasDoPapel(sujeito: string, indice: IndiceDasPermissoes): LinhaPermissao[] {
  return indice.ordenados.map((objeto) => linha(objeto.id, acessoDe(sujeito, objeto, indice), indice));
}

function compararSujeitos(a: Acesso, b: Acesso, indice: IndiceDasPermissoes): number {
  if (a.sujeito === PUBLICO || b.sujeito === PUBLICO) return a.sujeito === PUBLICO ? -1 : 1;
  const loginA = indice.papeis.get(a.sujeito)?.login ?? false;
  const loginB = indice.papeis.get(b.sujeito)?.login ?? false;
  return (
    ordemDoNivel[a.nivel] - ordemDoNivel[b.nivel] || Number(loginB) - Number(loginA) || compararNomes(a.sujeito, b.sujeito)
  );
}

export function linhasDoObjeto(objetoId: string, indice: IndiceDasPermissoes): LinhaPermissao[] {
  const objeto = indice.objetos.get(objetoId);
  if (!objeto) return [];
  const publico = acessoDe(PUBLICO, objeto, indice);
  const acessos = [
    ...(publico.privilegios.length > 0 ? [publico] : []),
    ...indice.dados.papeis
      .map((papel) => acessoDe(papel.nome, objeto, indice))
      .filter((acesso) => acesso.nivel === 'NENHUM' || temAcessoProprio(acesso)),
  ];
  return acessos.sort((a, b) => compararSujeitos(a, b, indice)).map((acesso) => linha(acesso.sujeito, acesso, indice));
}

function correspondeAoAcesso(acesso: Acesso, filtro: FiltroDeAcesso | null): boolean {
  if (filtro === null) return acesso.nivel !== 'NENHUM';
  if (filtro === 'SEM_ACESSO') return acesso.nivel === 'NENHUM';
  return acesso.nivel === filtro;
}

function textoDoSujeitoParaBusca(sujeito: string, indice: IndiceDasPermissoes): string {
  if (sujeito === PUBLICO) return `${PUBLICO} todos os papéis`;
  return `${sujeito} ${indice.papeis.get(sujeito)?.descricao ?? ''}`;
}

function tipoDoSujeito(sujeito: string, indice: IndiceDasPermissoes): FiltroDePapel | null {
  const papel = indice.papeis.get(sujeito);
  if (!papel) return null;
  return papel.login ? 'USUARIO' : 'GRUPO';
}

export function filtrarLinhas(
  linhas: LinhaPermissao[],
  filtros: FiltrosPermissoes,
  indice: IndiceDasPermissoes,
): LinhaPermissao[] {
  const termos = termosDaBusca(filtros.busca);
  return linhas.filter(({ acesso, situacoes }) => {
    const textoDaBusca =
      filtros.modo === 'OBJETO' ? textoDoSujeitoParaBusca(acesso.sujeito, indice) : nomeCompleto(acesso.objeto);
    return (
      (termos.length === 0 || correspondeABusca(textoDaBusca, termos)) &&
      correspondeAoAcesso(acesso, filtros.acesso) &&
      (filtros.situacao === null || situacoes.includes(filtros.situacao)) &&
      (filtros.modo === 'OBJETO'
        ? filtros.tipoPapel === null || tipoDoSujeito(acesso.sujeito, indice) === filtros.tipoPapel
        : (filtros.esquema === null || acesso.objeto.esquema === filtros.esquema) &&
          (filtros.tipoObjeto === null || acesso.objeto.tipo === filtros.tipoObjeto))
    );
  });
}

export function contarPorSituacaoPermissao(linhas: LinhaPermissao[]): Record<SituacaoPermissao, number> {
  const contagem = Object.fromEntries(situacoesPermissao.map((situacao) => [situacao, 0])) as Record<
    SituacaoPermissao,
    number
  >;
  for (const item of linhas) {
    for (const situacao of item.situacoes) contagem[situacao] += 1;
  }
  return contagem;
}

export function compararPapeis(papelA: string, papelB: string, indice: IndiceDasPermissoes): LinhaComparacao[] {
  return indice.ordenados.flatMap((objeto) => {
    const a = acessoDe(papelA, objeto, indice);
    const b = acessoDe(papelB, objeto, indice);
    if (a.nivel === 'NENHUM' && b.nivel === 'NENHUM') return [];
    const deA = new Set(a.privilegios.map((item) => item.privilegio));
    const deB = new Set(b.privilegios.map((item) => item.privilegio));
    return [
      {
        chave: objeto.id,
        objeto,
        a,
        b,
        soEmA: [...deA].filter((privilegio) => !deB.has(privilegio)),
        soEmB: [...deB].filter((privilegio) => !deA.has(privilegio)),
      },
    ];
  });
}

export function filtrarComparacao(linhas: LinhaComparacao[], filtros: FiltrosPermissoes): LinhaComparacao[] {
  const termos = termosDaBusca(filtros.busca);
  return linhas.filter(
    (item) =>
      (!filtros.soDiferencas || item.soEmA.length > 0 || item.soEmB.length > 0) &&
      (termos.length === 0 || correspondeABusca(nomeCompleto(item.objeto), termos)) &&
      (filtros.esquema === null || item.objeto.esquema === filtros.esquema) &&
      (filtros.tipoObjeto === null || item.objeto.tipo === filtros.tipoObjeto),
  );
}

function assinatura(sujeito: string, indice: IndiceDasPermissoes): Set<string> {
  const chaves = new Set<string>();
  for (const objeto of indice.ordenados) {
    for (const item of acessoDe(sujeito, objeto, indice).privilegios) {
      if (item.origens.some(origemPropria)) chaves.add(`${objeto.id}\u0000${item.privilegio}`);
    }
  }
  return chaves;
}

export function papelMaisParecido(sujeito: string, indice: IndiceDasPermissoes): string | null {
  const proprio = assinatura(sujeito, indice);
  let melhor: { nome: string; semelhanca: number } | null = null;

  for (const papel of [...indice.dados.papeis].sort((a, b) => compararNomes(a.nome, b.nome))) {
    if (papel.nome === sujeito || papel.superusuario) continue;
    const outro = assinatura(papel.nome, indice);
    const comuns = [...proprio].filter((chave) => outro.has(chave)).length;
    const uniao = new Set([...proprio, ...outro]).size;
    const semelhanca = uniao === 0 ? 0 : comuns / uniao;
    if (!melhor || semelhanca > melhor.semelhanca) melhor = { nome: papel.nome, semelhanca };
  }

  return melhor?.nome ?? null;
}

export function objetoInicial(indice: IndiceDasPermissoes): ObjetoComPermissoesDTO | null {
  return indice.ordenados.find((objeto) => objeto.tipo === 'TABELA') ?? indice.ordenados[0] ?? null;
}

export function esquemasDasPermissoes(indice: IndiceDasPermissoes): string[] {
  return [...indice.esquemas.keys()].sort(compararNomes);
}

export function sujeitosDasPermissoes(indice: IndiceDasPermissoes): PapelDasPermissoesDTO[] {
  return [...indice.dados.papeis].sort(
    (a, b) => Number(b.login) - Number(a.login) || compararNomes(a.nome, b.nome),
  );
}

export function rotuloDoNivel(acesso: Pick<Acesso, 'nivel' | 'privilegios' | 'objeto'>): string {
  if (acesso.nivel === 'TOTAL') return 'Total';
  if (acesso.nivel === 'NENHUM') return 'Sem acesso';
  if (acesso.nivel === 'MANUTENCAO') return 'Manutenção';
  const leitura = acesso.privilegios.some((item) => categoriaDoPrivilegio[item.privilegio] === 'LEITURA');
  if (acesso.nivel === 'ESCRITA') return leitura ? 'Leitura e escrita' : 'Escrita';
  if (acesso.objeto.tipo === 'FUNCAO' || acesso.objeto.tipo === 'PROCEDIMENTO') return 'Execução';
  if (acesso.objeto.tipo === 'BANCO') return 'Conexão';
  if (acesso.objeto.tipo === 'ESQUEMA' || acesso.objeto.tipo === 'SEQUENCIA') return 'Uso';
  return 'Leitura';
}

function grupoDaOrigem(caminho: string[]): string {
  return caminho.at(-1) ?? '';
}

export function rotuloDaOrigem(origem: OrigemDoAcesso): string {
  if (origem.tipo === 'SUPERUSUARIO') return 'Superusuário';
  if (origem.tipo === 'PUBLICO') return PUBLICO;
  if (origem.tipo === 'DONO') return origem.caminho.length === 0 ? 'Dono' : `Dono pelo grupo ${grupoDaOrigem(origem.caminho)}`;
  return origem.caminho.length === 0 ? 'Direta' : `Pelo grupo ${grupoDaOrigem(origem.caminho)}`;
}

export function origensDistintas(acesso: Acesso): string[] {
  return [...new Set(acesso.privilegios.flatMap((item) => item.origens.map(rotuloDaOrigem)))];
}

function emMinuscula(texto: string): string {
  if (texto === PUBLICO) return texto;
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

export function resumoDasOrigens(acesso: Acesso): string {
  const origens = origensDistintas(acesso);
  const [primeira, segunda] = origens;
  if (!primeira) return 'Nenhuma';
  if (!segunda) return primeira;
  if (origens.length === 2) return `${primeira} e ${emMinuscula(segunda)}`;
  return `${formatarNumero(origens.length)} origens`;
}

export function textoDosPrivilegios(acesso: Pick<Acesso, 'privilegios'>): string {
  return acesso.privilegios
    .map((item) => (item.colunas === null ? item.privilegio : `${item.privilegio} (${item.colunas.join(', ')})`))
    .join(', ');
}

export function efeitoDoPrivilegio(privilegio: Privilegio, tipo: TipoObjetoPermissao): string {
  if (privilegio === 'CONNECT') return 'Conecta ao banco.';
  if (privilegio === 'TEMPORARY') return 'Cria tabelas temporárias, que somem no fim da sessão.';
  if (privilegio === 'CREATE') {
    return tipo === 'BANCO' ? 'Cria esquemas no banco.' : 'Cria tabelas, visões, sequências e funções no esquema.';
  }
  if (privilegio === 'USAGE') {
    return tipo === 'SEQUENCIA'
      ? 'Pega o próximo valor com nextval e lê o atual com currval.'
      : 'Enxerga os objetos do esquema e usa aqueles em que tem permissão.';
  }
  if (privilegio === 'SELECT') return tipo === 'SEQUENCIA' ? 'Lê o valor atual da sequência.' : 'Lê as linhas.';
  if (privilegio === 'INSERT') return 'Insere linhas.';
  if (privilegio === 'UPDATE') return tipo === 'SEQUENCIA' ? 'Muda o valor com setval.' : 'Altera linhas.';
  if (privilegio === 'DELETE') return 'Apaga linhas.';
  if (privilegio === 'TRUNCATE') return 'Esvazia a tabela inteira de uma vez.';
  if (privilegio === 'REFERENCES') return 'Cria chaves estrangeiras que apontam para ela.';
  if (privilegio === 'TRIGGER') return 'Cria gatilhos nela.';
  if (privilegio === 'MAINTAIN') return 'Roda VACUUM, ANALYZE, REINDEX, CLUSTER, REFRESH MATERIALIZED VIEW e LOCK TABLE.';
  return tipo === 'PROCEDIMENTO' ? 'Chama o procedimento com CALL.' : 'Chama a função.';
}

function caminhoCompleto(sujeito: string, caminho: string[]): string {
  return [sujeito, ...caminho].join(' › ');
}

function detalhesDaConcessao(concessao: ConcessaoDTO): string {
  const partes = [`concedido por ${concessao.concedente}`];
  if (concessao.repassavel) partes.push('com WITH GRANT OPTION');
  if (concessao.colunas) partes.push(`só nas colunas ${concessao.colunas.join(', ')}`);
  return partes.join(', ');
}

export function fraseDaOrigem(origem: OrigemDoAcesso, sujeito: string): string {
  if (origem.tipo === 'SUPERUSUARIO') return 'Por ser superusuário, que passa por cima de todas as permissões.';
  if (origem.tipo === 'DONO') {
    if (origem.caminho.length === 0) return 'Por ser dono do objeto.';
    return `Pelo grupo ${grupoDaOrigem(origem.caminho)}, dono do objeto (${caminhoCompleto(sujeito, origem.caminho)}).`;
  }
  if (origem.tipo === 'PUBLICO') {
    return `Por PUBLIC, que vale para todos os papéis, ${detalhesDaConcessao(origem.concessao)}.`;
  }
  if (origem.caminho.length === 0) {
    const detalhes = detalhesDaConcessao(origem.concessao);
    return `${detalhes.charAt(0).toUpperCase()}${detalhes.slice(1)}, direto a ${sujeito === PUBLICO ? 'PUBLIC' : 'ele'}.`;
  }
  return `Pelo grupo ${grupoDaOrigem(origem.caminho)} (${caminhoCompleto(sujeito, origem.caminho)}), ${detalhesDaConcessao(origem.concessao)}.`;
}

export function referenciaSql(objeto: Pick<ObjetoComPermissoesDTO, 'tipo' | 'esquema' | 'nome'>): string {
  const palavra = palavraDoTipoSql[objeto.tipo];
  if (objeto.tipo === 'BANCO' || objeto.tipo === 'ESQUEMA') return `${palavra} ${identificadorSql(objeto.nome)}`;
  const abertura = objeto.nome.indexOf('(');
  const nome = abertura >= 0 ? `${identificadorSql(objeto.nome.slice(0, abertura))}${objeto.nome.slice(abertura)}` : identificadorSql(objeto.nome);
  return `${palavra} ${objeto.esquema ? `${identificadorSql(objeto.esquema)}.` : ''}${nome}`;
}

export function beneficiarioSql(sujeito: string): string {
  return sujeito === PUBLICO ? PUBLICO : identificadorSql(sujeito);
}

function listarTextos(textos: string[]): string {
  const visiveis = textos.slice(0, NOMES_NA_FRASE);
  const restantes = textos.length - visiveis.length;
  if (restantes > 0) return `${visiveis.join(', ')} e mais ${formatarNumero(restantes)}`;
  if (visiveis.length === 1) return visiveis[0] ?? '';
  return `${visiveis.slice(0, -1).join(', ')} e ${visiveis.at(-1) ?? ''}`;
}

function artigoDoTipo(tipo: TipoObjetoPermissao): string {
  return tipo === 'PROCEDIMENTO' || tipo === 'BANCO' || tipo === 'ESQUEMA' ? 'o' : 'a';
}

function nomeDoTipo(tipo: TipoObjetoPermissao): string {
  return rotuloTipoObjetoPermissao[tipo].toLowerCase();
}

function membrosQueHerdam(grupo: string, indice: IndiceDasPermissoes): string[] {
  return indice.dados.papeis
    .filter((papel) => indice.herdados.get(papel.nome)?.has(grupo))
    .map((papel) => papel.nome)
    .sort(compararNomes);
}

function fraseDoDefinidorAberto(objeto: ObjetoComPermissoesDTO, indice: IndiceDasPermissoes): string {
  const dono = indice.papeis.get(objeto.dono);
  const tipo = objeto.tipo === 'PROCEDIMENTO' ? 'um procedimento' : 'uma função';
  return `PUBLIC executa ${nomeCompleto(objeto)}, ${tipo} SECURITY DEFINER de ${objeto.dono}${dono?.superusuario ? ', que é superusuário' : ''}: qualquer papel que conecta ao banco roda esse código com os privilégios de ${objeto.dono}.`;
}

function fraseDeTodosCriam(objeto: ObjetoComPermissoesDTO): string {
  const historico =
    objeto.nome === 'public'
      ? ' Desde o PostgreSQL 15 o esquema public nasce sem essa permissão: ela costuma sobrar de bancos atualizados de versões anteriores.'
      : '';
  return `PUBLIC pode criar objetos em ${objeto.nome}: qualquer papel que conecta cria ali tabelas e funções, inclusive uma com o nome de outra que vem depois no search_path de quem a chama.${historico}`;
}

function privilegiosDasConcessoes(concessoes: ConcessaoDTO[]): string {
  return [...new Set(concessoes.map((concessao) => concessao.privilegio))].join(', ');
}

function fraseDaEscritaNaLeitura(grupo: string, objeto: ObjetoComPermissoesDTO, indice: IndiceDasPermissoes): string {
  const concessoes = concessoesDiretas(objeto, grupo).filter(
    (concessao) => categoriaDoPrivilegio[concessao.privilegio] === 'ESCRITA',
  );
  const lidas = indice.dados.objetos.filter(
    (candidato) => candidato.id !== objeto.id && tiposRelacao.includes(candidato.tipo) && leGrupo(candidato, grupo),
  ).length;
  const membros = membrosQueHerdam(grupo, indice);
  const juntos =
    membros.length === 0
      ? ''
      : ` ${membros.length === 1 ? 'O membro dele' : `Os ${formatarNumero(membros.length)} membros dele`} (${listarTextos(membros)}) ${membros.length === 1 ? 'grava' : 'gravam'} junto.`;
  return `O grupo ${grupo}, que só lê nos outros ${formatarNumero(lidas)} objetos, pode gravar em ${nomeCompleto(objeto)} (${privilegiosDasConcessoes(concessoes)}), concedido por ${concessoes[0]?.concedente ?? objeto.dono}.${juntos}`;
}

function fraseDoRepasse(sujeito: string, acessos: Acesso[], indice: IndiceDasPermissoes): string {
  const partes = acessos.map(
    (acesso) => `${privilegiosDasConcessoes(concessoesRepassaveis(acesso, indice))} em ${nomeCompleto(acesso.objeto)}`,
  );
  return `${sujeito} pode repassar a outros papéis ${listarTextos(partes)} (WITH GRANT OPTION): concede esse acesso a quem quiser, sem passar por quem administra o banco.`;
}

function fraseSemUsage(sujeito: string, esquema: string, acessos: Acesso[]): string {
  const nomes = acessos.map((acesso) => nomeCompleto(acesso.objeto));
  const privilegios = [...new Set(acessos.flatMap((acesso) => acesso.privilegios.map((item) => item.privilegio)))].join(', ');
  return `${sujeito} tem ${privilegios} em ${listarTextos(nomes)}, mas não tem USAGE no esquema ${esquema}: o comando falha com “permission denied for schema ${esquema}”.`;
}

export function fraseDaFaltaDePadrao(falta: FaltaDePrivilegioPadrao): string {
  const criadores = listarTextos(falta.criadores);
  const fora =
    falta.foraDoAlcance.length === 0
      ? ''
      : ` ${listarTextos(falta.foraDoAlcance.map(nomeCompleto))}, ${falta.foraDoAlcance.length === 1 ? 'criada depois, já ficou' : 'criadas depois, já ficaram'} de fora.`;
  return `${falta.grupo} lê ${formatarNumero(falta.lidos.length)} objetos de ${falta.esquema}, mas o esquema não tem privilégio padrão para o grupo: o que ${criadores} criar ali não chega a ele sem um GRANT a mais.${fora}`;
}

function fraseUsageSemObjetos(sujeito: string, esquema: string): string {
  return `${sujeito} tem USAGE no esquema ${esquema}, mas nenhuma permissão nos objetos dele: a permissão só deixa ver os nomes. Costuma sobrar de um acesso que já foi retirado.`;
}

export function fraseDaSituacao(situacao: SituacaoPermissao, acesso: Acesso, indice: IndiceDasPermissoes): string {
  const { sujeito, objeto } = acesso;
  if (situacao === 'DEFINIDOR_ABERTO') return fraseDoDefinidorAberto(objeto, indice);
  if (situacao === 'TODOS_CRIAM') return fraseDeTodosCriam(objeto);
  if (situacao === 'ESCRITA_NA_LEITURA') {
    const grupo = concessoesDeEscritaNaLeitura(acesso, indice)[0]?.beneficiario ?? sujeito;
    return fraseDaEscritaNaLeitura(grupo, objeto, indice);
  }
  if (situacao === 'REPASSE') return fraseDoRepasse(sujeito, [acesso], indice);
  if (situacao === 'SEM_USAGE') return fraseSemUsage(sujeito, objeto.esquema ?? '', [acesso]);
  if (situacao === 'SEM_PRIVILEGIO_PADRAO') {
    const falta = faltaDePadraoDoAcesso(acesso, indice);
    return falta ? fraseDaFaltaDePadrao(falta) : '';
  }
  return fraseUsageSemObjetos(sujeito, objeto.nome);
}

export interface ComandoDePermissao {
  situacao: SituacaoPermissao;
  rotulo: string;
  comando: string;
  explicacao: string;
}

const NAO_EXECUTA = 'O Orynt não executa nada no banco.';

function comandoDaSituacao(situacao: SituacaoPermissao, acesso: Acesso, indice: IndiceDasPermissoes): ComandoDePermissao | null {
  const { sujeito, objeto } = acesso;
  const alvo = referenciaSql(objeto);

  if (situacao === 'DEFINIDOR_ABERTO') {
    return {
      situacao,
      rotulo: 'Comando que fecha a execução',
      comando: `REVOKE EXECUTE ON ${alvo} FROM PUBLIC;`,
      explicacao: `Antes, conceda EXECUTE pelo nome a quem precisa chamar ${artigoDoTipo(objeto.tipo)} ${nomeDoTipo(objeto.tipo)}. Fixar o search_path, em Funções, fecha o outro lado do risco. ${NAO_EXECUTA}`,
    };
  }
  if (situacao === 'TODOS_CRIAM') {
    return {
      situacao,
      rotulo: 'Comando que tira o CREATE de todos',
      comando: `REVOKE CREATE ON ${alvo} FROM PUBLIC;`,
      explicacao: `Os objetos que já existem continuam onde estão. Quem cria objetos em ${objeto.nome} de propósito, como uma ferramenta de migrações, precisa receber CREATE pelo nome. ${NAO_EXECUTA}`,
    };
  }
  if (situacao === 'ESCRITA_NA_LEITURA') {
    const concessoes = concessoesDeEscritaNaLeitura(acesso, indice);
    const grupo = concessoes[0]?.beneficiario ?? sujeito;
    return {
      situacao,
      rotulo: 'Comando que tira a escrita do grupo',
      comando: `REVOKE ${privilegiosDasConcessoes(concessoes)} ON ${alvo} FROM ${beneficiarioSql(grupo)};`,
      explicacao: `O grupo continua lendo. Se um membro precisa mesmo gravar nesse objeto, conceda a ele pelo nome. ${NAO_EXECUTA}`,
    };
  }
  if (situacao === 'REPASSE') {
    return {
      situacao,
      rotulo: 'Comando que tira o repasse',
      comando: `REVOKE GRANT OPTION FOR ${privilegiosDasConcessoes(concessoesRepassaveis(acesso, indice))} ON ${alvo} FROM ${beneficiarioSql(sujeito)};`,
      explicacao: `Tira só o poder de repassar: o acesso dele continua. Se ele já repassou a alguém, o PostgreSQL recusa o comando até ele levar CASCADE, que também tira o que foi repassado. ${NAO_EXECUTA}`,
    };
  }
  if (situacao === 'SEM_USAGE') {
    const esquema = objeto.esquema ?? '';
    return {
      situacao,
      rotulo: 'Comando que libera o esquema',
      comando: `GRANT USAGE ON SCHEMA ${identificadorSql(esquema)} TO ${beneficiarioSql(sujeito)};`,
      explicacao: `USAGE só deixa ver os nomes do esquema e usar o que ele já pode. Se ${sujeito} não deveria ler esse objeto, revogue a permissão no objeto em vez disso. ${NAO_EXECUTA}`,
    };
  }
  if (situacao === 'SEM_PRIVILEGIO_PADRAO') {
    const falta = faltaDePadraoDoAcesso(acesso, indice);
    if (!falta) return null;
    const padroes = falta.criadores.map(
      (criador) =>
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${identificadorSql(criador)} IN SCHEMA ${identificadorSql(falta.esquema)} GRANT SELECT ON TABLES TO ${beneficiarioSql(falta.grupo)};`,
    );
    const concessoes = falta.foraDoAlcance.map(
      (fora) => `GRANT SELECT ON ${referenciaSql(fora)} TO ${beneficiarioSql(falta.grupo)};`,
    );
    return {
      situacao,
      rotulo: concessoes.length > 0 ? 'Comandos que fecham a lacuna' : 'Comando que define o privilégio padrão',
      comando: [...padroes, ...concessoes].join('\n'),
      explicacao: `O privilégio padrão vale só para o que ${listarTextos(falta.criadores)} criar daqui em diante${concessoes.length > 0 ? ': os GRANT seguintes alcançam o que já ficou de fora' : ''}. ${NAO_EXECUTA}`,
    };
  }
  return {
    situacao,
    rotulo: 'Comando que tira o USAGE',
    comando: `REVOKE USAGE ON ${alvo} FROM ${beneficiarioSql(sujeito)};`,
    explicacao: `Se ${sujeito} deveria ler algo do esquema, conceda o objeto em vez de tirar o USAGE. ${NAO_EXECUTA}`,
  };
}

export function comandosDoAcesso(linhaDoAcesso: LinhaPermissao, indice: IndiceDasPermissoes): ComandoDePermissao[] {
  return linhaDoAcesso.situacoes.flatMap((situacao) => comandoDaSituacao(situacao, linhaDoAcesso.acesso, indice) ?? []);
}

export interface LoteDePermissoes {
  comandos: string[];
  rotulo: string;
  descricao: string;
}

export function loteDeComandosDasPermissoes(
  linhas: LinhaPermissao[],
  situacao: SituacaoPermissao,
  indice: IndiceDasPermissoes,
): LoteDePermissoes | null {
  const comandos = [
    ...new Set(
      linhas.flatMap((item) =>
        item.situacoes.includes(situacao) ? (comandoDaSituacao(situacao, item.acesso, indice)?.comando.split('\n') ?? []) : [],
      ),
    ),
  ];
  if (comandos.length === 0) return null;
  const quantidade = formatarNumero(comandos.length);
  return {
    comandos,
    rotulo: comandos.length === 1 ? 'Copiar o comando' : `Copiar os ${quantidade} comandos`,
    descricao:
      comandos.length === 1 ? 'Copiar o comando da lista' : `Copiar os ${quantidade} comandos da lista, um por linha`,
  };
}

export interface FormaDeTirar {
  texto: string;
  comando: string | null;
}

export function formasDeTirar(acesso: Acesso): FormaDeTirar[] {
  const { sujeito, objeto } = acesso;
  const alvo = referenciaSql(objeto);
  const formas: FormaDeTirar[] = [];
  const origens = acesso.privilegios.flatMap((item) => item.origens.map((origem) => ({ origem, privilegio: item.privilegio })));

  if (origens.some(({ origem }) => origem.tipo === 'SUPERUSUARIO')) {
    return [
      {
        texto: `${sujeito} é superusuário: nenhuma permissão o limita. Só deixa de ter este acesso sem o atributo, com ALTER ROLE ${identificadorSql(sujeito)} NOSUPERUSER.`,
        comando: null,
      },
    ];
  }
  const dono = origens.find(({ origem }) => origem.tipo === 'DONO')?.origem;
  if (dono?.tipo === 'DONO') {
    return [
      {
        texto:
          dono.caminho.length === 0
            ? `${sujeito} é dono: só deixa de ter este acesso se o objeto mudar de dono, com ALTER … OWNER TO.`
            : `O acesso vem de ser membro de ${grupoDaOrigem(dono.caminho)}, dono do objeto. Sair do grupo tira este acesso e tudo o mais que o grupo dá.`,
        comando: dono.caminho.length === 0 ? null : `REVOKE ${identificadorSql(dono.caminho[0] ?? '')} FROM ${beneficiarioSql(sujeito)};`,
      },
    ];
  }

  const diretos = [
    ...new Set(
      origens.filter(({ origem }) => origem.tipo === 'CONCESSAO' && origem.caminho.length === 0).map(({ privilegio }) => privilegio),
    ),
  ];
  if (diretos.length > 0) {
    formas.push({
      texto: `Concedido direto a ${sujeito === PUBLICO ? 'PUBLIC, o que vale para todos os papéis' : sujeito}.`,
      comando: `REVOKE ${diretos.join(', ')} ON ${alvo} FROM ${beneficiarioSql(sujeito)};`,
    });
  }

  const grupos = [
    ...new Set(
      origens.flatMap(({ origem }) => (origem.tipo === 'CONCESSAO' && origem.caminho.length > 0 ? [origem.caminho[0] ?? ''] : [])),
    ),
  ];
  for (const grupo of grupos) {
    formas.push({
      texto: `Vem da participação em ${grupo}. Sair do grupo tira este acesso e tudo o mais que o grupo dá; para tirar só deste objeto, revogue do grupo, o que vale para todos os membros.`,
      comando: `REVOKE ${identificadorSql(grupo)} FROM ${beneficiarioSql(sujeito)};`,
    });
  }

  const publicos = [
    ...new Set(origens.filter(({ origem }) => origem.tipo === 'PUBLICO').map(({ privilegio }) => privilegio)),
  ];
  if (publicos.length > 0) {
    formas.push({
      texto: `${publicos.join(', ')} vem de PUBLIC: revogar de PUBLIC tira de todos os papéis que não o recebem por outro caminho.`,
      comando: `REVOKE ${publicos.join(', ')} ON ${alvo} FROM PUBLIC;`,
    });
  }

  return formas;
}

export function comandosParaConceder(acesso: Acesso, indice: IndiceDasPermissoes): string[] {
  const { sujeito, objeto } = acesso;
  const comandos = [`GRANT ${privilegioMinimo[objeto.tipo]} ON ${referenciaSql(objeto)} TO ${beneficiarioSql(sujeito)};`];
  if (objeto.esquema && objeto.tipo !== 'ESQUEMA' && sujeito !== PUBLICO && !usaOEsquema(sujeito, objeto.esquema, indice)) {
    comandos.unshift(`GRANT USAGE ON SCHEMA ${identificadorSql(objeto.esquema)} TO ${beneficiarioSql(sujeito)};`);
  }
  return comandos;
}

export function privilegioMinimoDoTipo(tipo: TipoObjetoPermissao): Privilegio {
  return privilegioMinimo[tipo];
}

export function semUsageNoEsquema(acesso: Acesso, indice: IndiceDasPermissoes): boolean {
  if (acesso.sujeito === PUBLICO || !acesso.objeto.esquema || acesso.objeto.tipo === 'ESQUEMA') return false;
  return !usaOEsquema(acesso.sujeito, acesso.objeto.esquema, indice);
}

export type AlvoDoPontoPermissao =
  | { tipo: 'LINHA'; modo: 'PAPEL' | 'OBJETO'; selecao: string; abrir: string }
  | { tipo: 'LISTA'; papel: string; situacao: SituacaoPermissao };

export interface PontoDeAtencaoPermissao {
  chave: string;
  tipo: SituacaoPermissao;
  tom: TomDoAviso;
  objeto: { esquema: string | null; nome: string } | null;
  titulo: string | null;
  texto: string;
  alvo: AlvoDoPontoPermissao;
}

function objetoDoPonto(objeto: ObjetoComPermissoesDTO): { esquema: string | null; nome: string } {
  return { esquema: objeto.esquema, nome: objeto.nome };
}

function pontosDaSituacao(situacao: SituacaoPermissao, indice: IndiceDasPermissoes): PontoDeAtencaoPermissao[] {
  const tom = tomDaSituacaoPermissao[situacao];
  const objetos = indice.ordenados;

  if (situacao === 'DEFINIDOR_ABERTO' || situacao === 'TODOS_CRIAM') {
    return objetos
      .filter((objeto) => (situacao === 'DEFINIDOR_ABERTO' ? definidorAberto(objeto) : todosCriam(objeto)))
      .map((objeto) => ({
        chave: `${situacao}-${objeto.id}`,
        tipo: situacao,
        tom,
        objeto: objetoDoPonto(objeto),
        titulo: null,
        texto: situacao === 'DEFINIDOR_ABERTO' ? fraseDoDefinidorAberto(objeto, indice) : fraseDeTodosCriam(objeto),
        alvo: { tipo: 'LINHA', modo: 'OBJETO', selecao: objeto.id, abrir: PUBLICO },
      }));
  }

  if (situacao === 'ESCRITA_NA_LEITURA') {
    return [...indice.gruposDeLeitura].sort(compararNomes).flatMap((grupo) =>
      objetos
        .filter(
          (objeto) =>
            objeto.dono !== grupo &&
            concessoesDiretas(objeto, grupo).some((concessao) => categoriaDoPrivilegio[concessao.privilegio] === 'ESCRITA'),
        )
        .map((objeto) => ({
          chave: `${situacao}-${grupo}-${objeto.id}`,
          tipo: situacao,
          tom,
          objeto: objetoDoPonto(objeto),
          titulo: null,
          texto: fraseDaEscritaNaLeitura(grupo, objeto, indice),
          alvo: { tipo: 'LINHA', modo: 'OBJETO', selecao: objeto.id, abrir: grupo } as const,
        })),
    );
  }

  if (situacao === 'SEM_PRIVILEGIO_PADRAO') {
    return indice.faltasDePadrao.map((falta) => ({
      chave: `${situacao}-${falta.grupo}-${falta.esquema}`,
      tipo: situacao,
      tom,
      objeto: { esquema: null, nome: falta.grupo },
      titulo: null,
      texto: fraseDaFaltaDePadrao(falta),
      alvo: { tipo: 'LINHA', modo: 'PAPEL', selecao: falta.grupo, abrir: idDoEsquema(falta.esquema) },
    }));
  }

  return indice.dados.papeis
    .filter((papel) => !papel.superusuario)
    .sort((a, b) => compararNomes(a.nome, b.nome))
    .flatMap((papel): PontoDeAtencaoPermissao[] => {
      const acessos = objetos.map((objeto) => acessoDe(papel.nome, objeto, indice));
      if (situacao === 'REPASSE') {
        const repassaveis = acessos.filter((acesso) => concessoesRepassaveis(acesso, indice).length > 0);
        const [primeiro] = repassaveis;
        if (!primeiro) return [];
        return [
          {
            chave: `${situacao}-${papel.nome}`,
            tipo: situacao,
            tom,
            objeto: { esquema: null, nome: papel.nome },
            titulo: null,
            texto: fraseDoRepasse(papel.nome, repassaveis, indice),
            alvo:
              repassaveis.length === 1
                ? { tipo: 'LINHA', modo: 'PAPEL', selecao: papel.nome, abrir: primeiro.objeto.id }
                : { tipo: 'LISTA', papel: papel.nome, situacao },
          },
        ];
      }
      if (situacao === 'SEM_USAGE') {
        const porEsquema = new Map<string, Acesso[]>();
        for (const acesso of acessos) {
          const proprio = acesso.privilegios.some((item) => item.origens.some((origem) => origemPropria(origem) && origemDireta(origem)));
          if (!proprio || !faltaUsage(acesso, indice)) continue;
          const esquema = acesso.objeto.esquema ?? '';
          porEsquema.set(esquema, [...(porEsquema.get(esquema) ?? []), acesso]);
        }
        return [...porEsquema.entries()].map(([esquema, doEsquema]) => ({
          chave: `${situacao}-${papel.nome}-${esquema}`,
          tipo: situacao,
          tom,
          objeto: { esquema: null, nome: papel.nome },
          titulo: null,
          texto: fraseSemUsage(papel.nome, esquema, doEsquema),
          alvo:
            doEsquema.length === 1 && doEsquema[0]
              ? { tipo: 'LINHA', modo: 'PAPEL', selecao: papel.nome, abrir: doEsquema[0].objeto.id }
              : { tipo: 'LISTA', papel: papel.nome, situacao },
        }));
      }
      return acessos
        .filter((acesso) => usageSemObjetos(acesso, indice))
        .map((acesso) => ({
          chave: `${situacao}-${papel.nome}-${acesso.objeto.id}`,
          tipo: situacao,
          tom,
          objeto: { esquema: null, nome: papel.nome },
          titulo: null,
          texto: fraseUsageSemObjetos(papel.nome, acesso.objeto.nome),
          alvo: { tipo: 'LINHA', modo: 'PAPEL', selecao: papel.nome, abrir: acesso.objeto.id } as const,
        }));
    });
}

function origemDireta(origem: OrigemDoAcesso): boolean {
  return (origem.tipo === 'CONCESSAO' || origem.tipo === 'DONO') && origem.caminho.length === 0;
}

const tituloDoGrupoDePontos: Record<SituacaoPermissao, (quantidade: string) => string> = {
  DEFINIDOR_ABERTO: (quantidade) => `${quantidade} funções SECURITY DEFINER abertas a todos`,
  TODOS_CRIAM: (quantidade) => `${quantidade} esquemas em que todos criam`,
  ESCRITA_NA_LEITURA: (quantidade) => `${quantidade} escritas em grupos de leitura`,
  REPASSE: (quantidade) => `${quantidade} papéis que repassam acesso`,
  SEM_USAGE: (quantidade) => `${quantidade} acessos sem USAGE no esquema`,
  SEM_PRIVILEGIO_PADRAO: (quantidade) => `${quantidade} esquemas sem privilégio padrão`,
  USAGE_SEM_OBJETOS: (quantidade) => `${quantidade} USAGE sem objetos`,
};

function nomeDoPonto(ponto: PontoDeAtencaoPermissao): string {
  return ponto.objeto ? nomeCompleto(ponto.objeto) : (ponto.titulo ?? '');
}

export function pontosDeAtencaoPermissoes(indice: IndiceDasPermissoes): PontoDeAtencaoPermissao[] {
  return situacoesPermissao.flatMap((situacao) => {
    const pontos = pontosDaSituacao(situacao, indice);
    const [primeiro] = pontos;
    if (!primeiro || pontos.length <= MAXIMO_DE_PONTOS_SEPARADOS) return pontos;
    return [
      {
        chave: `${situacao}-grupo`,
        tipo: situacao,
        tom: primeiro.tom,
        objeto: null,
        titulo: tituloDoGrupoDePontos[situacao](formatarNumero(pontos.length)),
        texto: `${listarTextos(pontos.map(nomeDoPonto))}. O primeiro: ${primeiro.texto}`,
        alvo: primeiro.alvo,
      },
    ];
  });
}

export function fraseDoPrivilegioPadrao(padrao: PrivilegioPadraoDTO): string {
  const onde = padrao.esquema === null ? 'em qualquer esquema' : `em ${padrao.esquema}`;
  const quem = padrao.beneficiario === PUBLICO ? 'a todos os papéis (PUBLIC)' : `a ${padrao.beneficiario}`;
  return `${textoDoPadrao[padrao.tipoDeObjeto]} que ${padrao.criador} criar ${onde} já nascem com ${padrao.privilegios.join(', ')} ${quem}.`;
}

export function comandoDoPrivilegioPadrao(padrao: PrivilegioPadraoDTO): string {
  const onde = padrao.esquema === null ? '' : ` IN SCHEMA ${identificadorSql(padrao.esquema)}`;
  return `ALTER DEFAULT PRIVILEGES FOR ROLE ${identificadorSql(padrao.criador)}${onde} GRANT ${padrao.privilegios.join(', ')} ON ${palavraDoPadraoSql[padrao.tipoDeObjeto]} TO ${beneficiarioSql(padrao.beneficiario)};`;
}

export function padraoAlcancaSujeito(padrao: PrivilegioPadraoDTO, sujeito: string, indice: IndiceDasPermissoes): boolean {
  return padrao.beneficiario === sujeito || padrao.beneficiario === PUBLICO || (indice.herdados.get(sujeito)?.has(padrao.beneficiario) ?? false);
}

export interface AvisoDoSujeito {
  tom: 'aviso' | 'erro' | 'info';
  texto: string;
  grupo: string | null;
}

export function avisosDoSujeito(sujeito: string, indice: IndiceDasPermissoes): AvisoDoSujeito[] {
  if (sujeito === PUBLICO) {
    return [
      {
        tom: 'info',
        texto:
          'PUBLIC é o que qualquer papel recebe só por existir. Cada linha abaixo vale para todos os papéis do servidor que conectam a este banco.',
        grupo: null,
      },
    ];
  }
  const papel = indice.papeis.get(sujeito);
  if (!papel) return [];
  const avisos: AvisoDoSujeito[] = [];
  if (papel.superusuario) {
    avisos.push({
      tom: 'erro',
      texto: `${sujeito} é superusuário: passa por cima de todas as permissões abaixo e de qualquer política de linha. Nada do que está nesta tela o limita.`,
      grupo: null,
    });
  }
  for (const participacao of papel.membroDe) {
    if (participacao.herda || !indice.papeis.has(participacao.papel)) continue;
    avisos.push({
      tom: 'info',
      texto: `${sujeito} participa de ${participacao.papel} sem herdar as permissões: o que ${participacao.papel} pode só vale depois de SET ROLE ${identificadorSql(participacao.papel)}, e não entra na lista abaixo.`,
      grupo: participacao.papel,
    });
  }
  return avisos;
}

function textoDeObjetos(quantidade: number): string {
  return `${formatarNumero(quantidade)} ${pluralizar(quantidade, 'objeto', 'objetos')}`;
}

export function resumirLinhas(
  linhas: LinhaPermissao[],
  encontradas: number,
  filtros: FiltrosPermissoes,
): string {
  if (filtros.modo === 'OBJETO') {
    const papeis = linhas.filter((item) => item.acesso.sujeito !== PUBLICO && item.acesso.nivel !== 'NENHUM').length;
    const publico = linhas.some((item) => item.acesso.sujeito === PUBLICO);
    if (temFiltroAtivoPermissoes(filtros)) {
      return `${formatarNumero(encontradas)} de ${formatarNumero(linhas.length)} ${pluralizar(linhas.length, 'linha', 'linhas')}`;
    }
    const base = `${formatarNumero(papeis)} ${pluralizar(papeis, 'papel', 'papéis')} com acesso próprio`;
    return publico ? `${base}, além de PUBLIC` : base;
  }
  const comAcesso = linhas.filter((item) => item.acesso.nivel !== 'NENHUM').length;
  if (temFiltroAtivoPermissoes(filtros)) return `${formatarNumero(encontradas)} de ${textoDeObjetos(linhas.length)}`;
  return `Acesso a ${formatarNumero(comAcesso)} de ${textoDeObjetos(linhas.length)}`;
}

export function resumirComparacao(linhas: LinhaComparacao[], encontradas: number, filtros: FiltrosPermissoes): string {
  const diferentes = linhas.filter((item) => item.soEmA.length > 0 || item.soEmB.length > 0).length;
  if (filtros.busca !== '' || filtros.esquema !== null || filtros.tipoObjeto !== null) {
    return `${formatarNumero(encontradas)} de ${textoDeObjetos(linhas.length)}`;
  }
  if (diferentes === 0) return `Mesmo acesso nos ${textoDeObjetos(linhas.length)}`;
  return `${formatarNumero(diferentes)} de ${textoDeObjetos(linhas.length)} com diferença`;
}

export function descreverFiltrosPermissoes(filtros: FiltrosPermissoes): string[] {
  const partes: string[] = [];
  if (filtros.busca !== '') partes.push(`busca por “${filtros.busca}”`);
  if (filtros.modo !== 'OBJETO') {
    if (filtros.esquema) partes.push(`esquema: ${filtros.esquema}`);
    if (filtros.tipoObjeto) partes.push(`tipo: ${rotuloFiltroTipoObjeto[filtros.tipoObjeto].toLowerCase()}`);
  } else if (filtros.tipoPapel) {
    partes.push(`tipo: ${rotuloFiltroDePapel[filtros.tipoPapel].toLowerCase()}`);
  }
  if (filtros.modo !== 'COMPARACAO') {
    if (filtros.acesso) partes.push(`acesso: ${rotuloFiltroDeAcesso[filtros.acesso].toLowerCase()}`);
    if (filtros.situacao) partes.push(`situação: ${rotuloFiltroSituacaoPermissao[filtros.situacao].toLowerCase()}`);
  } else if (filtros.soDiferencas) {
    partes.push('só as diferenças');
  }
  return partes;
}

export function rotuloDoSujeito(sujeito: string): string {
  return sujeito === PUBLICO ? 'PUBLIC' : sujeito;
}
