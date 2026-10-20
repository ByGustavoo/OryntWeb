import type { OperacaoDTO } from '@/modelos/alteracoes';
import type { DirecaoOrdenacao } from '@/modelos/consultas';
import type {
  AtributoPapel,
  FiltrosPapeis,
  MetodoSenha,
  ObjetoDoPapelDTO,
  OrdenacaoPapeis,
  PapelDTO,
  ParticipacaoDTO,
  SituacaoPapel,
  TipoObjetoDoPapel,
  TipoPapel,
} from '@/modelos/papeis';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { correspondeABusca, limparBusca, termosDaBusca } from './buscaConsultas';
import { descreverConfiguracao, temSearchPathFixo } from './funcoes';
import { DIAS_DE_OBSERVACAO } from './indices';
import type { LoteDeComandos } from './indices';
import { lerPagina, paginaAposMudanca } from './paginacaoLocal';
import { comandosDasOperacoes } from './sqlAlteracoes';
import type { TomDoAviso } from './visoes';

export const DIAS_ATE_VENCER = 7;
export const DIAS_DA_NOVA_VALIDADE = 90;
export const PARTE_PERTO_DO_LIMITE = 0.8;

const MS_POR_DIA = 86_400_000;
const ORDEM_ALFABETICA = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const NOMES_NA_FRASE = 3;
const MAXIMO_DE_PONTOS_SEPARADOS = 2;
const NOME_DE_PAPEL = /^[A-Za-z_][\w$.-]{0,62}$/;
const IDENTIFICADOR_SIMPLES = /^[a-z_][a-z0-9_$]*$/;
const PREFIXO_DO_SISTEMA = 'pg_';

export const tiposPapel: TipoPapel[] = ['USUARIO', 'GRUPO'];

export const atributosPapel: AtributoPapel[] = ['SUPERUSUARIO', 'CRIA_BANCOS', 'CRIA_PAPEIS', 'REPLICACAO', 'IGNORA_RLS'];

export const situacoesPapel: SituacaoPapel[] = [
  'SUPERUSUARIO',
  'VALIDADE_DA_SENHA',
  'SENHA_MD5',
  'PERTO_DO_LIMITE',
  'SEM_USO',
  'GRUPO_VAZIO',
];

export const ordenacoesPapeis: OrdenacaoPapeis[] = ['NOME', 'SESSOES', 'ULTIMO_USO', 'VALIDADE'];

export const rotuloTipoPapel: Record<TipoPapel, string> = {
  USUARIO: 'Usuário',
  GRUPO: 'Grupo',
};

export const rotuloFiltroTipoPapel: Record<TipoPapel, string> = {
  USUARIO: 'Usuários',
  GRUPO: 'Grupos',
};

export const rotuloAtributo: Record<AtributoPapel, string> = {
  SUPERUSUARIO: 'Superusuário',
  CRIA_BANCOS: 'Cria bancos',
  CRIA_PAPEIS: 'Cria papéis',
  REPLICACAO: 'Replicação',
  IGNORA_RLS: 'Ignora RLS',
};

export const palavraDoAtributo: Record<AtributoPapel, string> = {
  SUPERUSUARIO: 'SUPERUSER',
  CRIA_BANCOS: 'CREATEDB',
  CRIA_PAPEIS: 'CREATEROLE',
  REPLICACAO: 'REPLICATION',
  IGNORA_RLS: 'BYPASSRLS',
};

export const efeitoDoAtributo: Record<AtributoPapel, string> = {
  SUPERUSUARIO:
    'Passa por cima de todas as permissões e das políticas de linha, muda as configurações do servidor e lê arquivos dele.',
  CRIA_BANCOS: 'Cria bancos novos no servidor e fica dono deles.',
  CRIA_PAPEIS: 'Cria, altera e remove outros papéis, e concede a eles a participação em grupos.',
  REPLICACAO: 'Abre conexões de replicação e lê todo o fluxo de alterações do servidor, de todos os bancos.',
  IGNORA_RLS: 'Lê e grava as tabelas sem passar pelas políticas de segurança de linha.',
};

export const rotuloSituacaoPapel: Record<SituacaoPapel, string> = {
  SUPERUSUARIO: 'Superusuário',
  VALIDADE_DA_SENHA: 'Senha a vencer',
  SENHA_MD5: 'Senha em MD5',
  PERTO_DO_LIMITE: 'Perto do limite',
  SEM_USO: 'Sem uso',
  GRUPO_VAZIO: 'Grupo vazio',
};

export const rotuloFiltroSituacaoPapel: Record<SituacaoPapel, string> = {
  SUPERUSUARIO: 'Superusuários',
  VALIDADE_DA_SENHA: 'Senha vencida ou a vencer',
  SENHA_MD5: 'Senha em MD5',
  PERTO_DO_LIMITE: 'Perto do limite de conexões',
  SEM_USO: 'Sem uso em 30 dias',
  GRUPO_VAZIO: 'Grupos vazios',
};

export const rotuloMetodoSenha: Record<MetodoSenha, string> = {
  SCRAM: 'SCRAM-SHA-256',
  MD5: 'MD5',
  SEM_SENHA: 'Sem senha',
};

export const rotuloTipoObjetoDoPapel: Record<TipoObjetoDoPapel, string> = {
  TABELA: 'Tabela',
  VISAO: 'Visão',
  VISAO_MATERIALIZADA: 'Visão materializada',
  FUNCAO: 'Função',
  PROCEDIMENTO: 'Procedimento',
};

export const direcaoInicialDaOrdenacaoPapeis: Record<OrdenacaoPapeis, DirecaoOrdenacao> = {
  NOME: 'ASC',
  SESSOES: 'DESC',
  ULTIMO_USO: 'DESC',
  VALIDADE: 'ASC',
};

export const filtrosPapeisIniciais: FiltrosPapeis = {
  busca: '',
  tipo: null,
  atributo: null,
  situacao: null,
  ordenacao: 'NOME',
  direcao: 'ASC',
  pagina: 1,
};

export interface ContextoDosPapeis {
  geradoEm: string;
  coletaDesde: string;
  papelDaConexao: string | null;
}

export interface AvisoDoPapel {
  tom: TomDoAviso;
  texto: string;
}

export interface ComandoDoPapel {
  situacao: SituacaoPapel;
  rotulo: string;
  comando: string;
  explicacao: string;
  operacoes: OperacaoDTO[] | null;
}

export type EstadoDaSenha = 'SEM_SENHA' | 'SEM_VALIDADE' | 'VALIDA' | 'A_VENCER' | 'VENCIDA';

export type EstadoDoUsoDoPapel = 'GRUPO' | 'CONECTADO' | 'VISTO' | 'EM_OBSERVACAO' | 'SEM_USO';

export interface AtributoAssumivel {
  atributo: AtributoPapel;
  caminho: string[];
}

function lerDaLista<T extends string>(lista: readonly T[], valor: unknown): T | null {
  return lista.find((item) => item === valor) ?? null;
}

export function lerNomeDoPapel(valor: unknown): string | null {
  return typeof valor === 'string' && NOME_DE_PAPEL.test(valor) ? valor : null;
}

export function identificadorSql(nome: string): string {
  return IDENTIFICADOR_SIMPLES.test(nome) ? nome : `"${nome.replaceAll('"', '""')}"`;
}

export function papelDoSistema(nome: string): boolean {
  return nome.startsWith(PREFIXO_DO_SISTEMA);
}

export function lerFiltrosPapeis(valor: unknown): FiltrosPapeis {
  if (!valor || typeof valor !== 'object') return filtrosPapeisIniciais;
  const guardado = valor as Record<string, unknown>;
  const ordenacao = lerDaLista(ordenacoesPapeis, guardado.ordenacao) ?? filtrosPapeisIniciais.ordenacao;

  return {
    busca: typeof guardado.busca === 'string' ? limparBusca(guardado.busca) : filtrosPapeisIniciais.busca,
    tipo: lerDaLista(tiposPapel, guardado.tipo),
    atributo: lerDaLista(atributosPapel, guardado.atributo),
    situacao: lerDaLista(situacoesPapel, guardado.situacao),
    ordenacao,
    direcao: lerDaLista<DirecaoOrdenacao>(['ASC', 'DESC'], guardado.direcao) ?? direcaoInicialDaOrdenacaoPapeis[ordenacao],
    pagina: lerPagina(guardado.pagina),
  };
}

export function aplicarMudancaPapeis(filtros: FiltrosPapeis, mudanca: Partial<FiltrosPapeis>): FiltrosPapeis {
  return lerFiltrosPapeis({ ...filtros, ...mudanca, pagina: paginaAposMudanca(filtros, mudanca) });
}

export function alternarOrdenacaoPapeis(
  filtros: FiltrosPapeis,
  ordenacao: OrdenacaoPapeis,
): Pick<FiltrosPapeis, 'ordenacao' | 'direcao'> {
  if (filtros.ordenacao !== ordenacao) return { ordenacao, direcao: direcaoInicialDaOrdenacaoPapeis[ordenacao] };
  return { ordenacao, direcao: filtros.direcao === 'DESC' ? 'ASC' : 'DESC' };
}

export function temFiltroAtivoPapeis(filtros: FiltrosPapeis): boolean {
  return filtros.busca !== '' || filtros.tipo !== null || filtros.atributo !== null || filtros.situacao !== null;
}

export function semFiltrosPapeis(): Pick<FiltrosPapeis, 'busca' | 'tipo' | 'atributo' | 'situacao'> {
  return { busca: '', tipo: null, atributo: null, situacao: null };
}

function diasEntre(inicio: string, fim: string): number {
  return (new Date(fim).getTime() - new Date(inicio).getTime()) / MS_POR_DIA;
}

function diasInteiros(dias: number): string {
  const inteiros = Math.floor(dias);
  return `${formatarNumero(inteiros)} ${pluralizar(inteiros, 'dia', 'dias')}`;
}

const formatadorDoDia = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
const formatadorDaData = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatarDia(instante: string): string {
  return formatadorDoDia.format(new Date(instante));
}

export function formatarData(instante: string): string {
  return formatadorDaData.format(new Date(instante));
}

export function tipoDoPapel(papel: Pick<PapelDTO, 'login'>): TipoPapel {
  return papel.login ? 'USUARIO' : 'GRUPO';
}

export function atributosDoPapel(papel: PapelDTO): AtributoPapel[] {
  const ligados: Record<AtributoPapel, boolean> = {
    SUPERUSUARIO: papel.superusuario,
    CRIA_BANCOS: papel.criaBancos,
    CRIA_PAPEIS: papel.criaPapeis,
    REPLICACAO: papel.replicacao,
    IGNORA_RLS: papel.ignoraRls,
  };
  return atributosPapel.filter((atributo) => ligados[atributo]);
}

export function diasAteVencer(papel: PapelDTO, contexto: Pick<ContextoDosPapeis, 'geradoEm'>): number | null {
  if (papel.validadeSenha === null) return null;
  return diasEntre(contexto.geradoEm, papel.validadeSenha);
}

export function estadoDaSenha(papel: PapelDTO, contexto: Pick<ContextoDosPapeis, 'geradoEm'>): EstadoDaSenha {
  if (papel.metodoSenha === 'SEM_SENHA') return 'SEM_SENHA';
  const dias = diasAteVencer(papel, contexto);
  if (dias === null) return 'SEM_VALIDADE';
  if (dias <= 0) return 'VENCIDA';
  if (dias <= DIAS_ATE_VENCER) return 'A_VENCER';
  return 'VALIDA';
}

export function inicioDaObservacaoDoPapel(papel: PapelDTO, contexto: Pick<ContextoDosPapeis, 'coletaDesde'>): string {
  return new Date(papel.observadoDesde) > new Date(contexto.coletaDesde) ? papel.observadoDesde : contexto.coletaDesde;
}

export function observadoPorInteiro(papel: PapelDTO, contexto: Pick<ContextoDosPapeis, 'geradoEm' | 'coletaDesde'>): boolean {
  return diasEntre(inicioDaObservacaoDoPapel(papel, contexto), contexto.geradoEm) >= DIAS_DE_OBSERVACAO;
}

export function ultimoUso(papel: PapelDTO, contexto: Pick<ContextoDosPapeis, 'geradoEm'>): string | null {
  if (!papel.login) return null;
  if (papel.sessoes > 0) return contexto.geradoEm;
  return papel.vistoPorUltimo;
}

export function estadoDoUsoDoPapel(papel: PapelDTO, contexto: ContextoDosPapeis): EstadoDoUsoDoPapel {
  if (!papel.login) return 'GRUPO';
  if (papel.sessoes > 0) return 'CONECTADO';
  const visto = papel.vistoPorUltimo;
  if (visto !== null && diasEntre(visto, contexto.geradoEm) < DIAS_DE_OBSERVACAO) return 'VISTO';
  return observadoPorInteiro(papel, contexto) ? 'SEM_USO' : 'EM_OBSERVACAO';
}

export function pertoDoLimite(papel: PapelDTO): boolean {
  return (
    papel.login &&
    papel.limiteConexoes !== null &&
    papel.limiteConexoes > 0 &&
    papel.sessoes / papel.limiteConexoes >= PARTE_PERTO_DO_LIMITE
  );
}

export function situacoesDoPapel(papel: PapelDTO, contexto: ContextoDosPapeis): SituacaoPapel[] {
  const situacoes: SituacaoPapel[] = [];
  if (papel.login && papel.superusuario && !papel.inicial) situacoes.push('SUPERUSUARIO');
  const senha = estadoDaSenha(papel, contexto);
  if (papel.login && (senha === 'VENCIDA' || senha === 'A_VENCER')) situacoes.push('VALIDADE_DA_SENHA');
  if (papel.metodoSenha === 'MD5') situacoes.push('SENHA_MD5');
  if (pertoDoLimite(papel)) situacoes.push('PERTO_DO_LIMITE');
  if (estadoDoUsoDoPapel(papel, contexto) === 'SEM_USO') situacoes.push('SEM_USO');
  if (!papel.login && !papel.inicial && papel.membros.length === 0 && papel.objetos.length === 0) {
    situacoes.push('GRUPO_VAZIO');
  }
  return situacoes;
}

export function tomDaSituacaoPapel(situacao: SituacaoPapel, papel: PapelDTO, contexto: ContextoDosPapeis): TomDoAviso {
  if (situacao === 'SUPERUSUARIO') return 'erro';
  if (situacao === 'VALIDADE_DA_SENHA' && estadoDaSenha(papel, contexto) === 'VENCIDA') return 'erro';
  return 'aviso';
}

function quandoVence(dias: number): string {
  return dias < 1 ? 'em menos de um dia' : `em ${diasInteiros(dias)}`;
}

function haQuantoVenceu(dias: number): string {
  return -dias < 1 ? 'há menos de um dia' : `há ${diasInteiros(-dias)}`;
}

export function rotuloDaSituacaoDoPapel(situacao: SituacaoPapel, papel: PapelDTO, contexto: ContextoDosPapeis): string {
  if (situacao !== 'VALIDADE_DA_SENHA') return rotuloSituacaoPapel[situacao];
  return estadoDaSenha(papel, contexto) === 'VENCIDA' ? 'Senha vencida' : 'Senha a vencer';
}

export function participacoesComSetRole(papel: PapelDTO, papeis: PapelDTO[]): AtributoAssumivel[] {
  const porNome = new Map(papeis.map((candidato) => [candidato.nome, candidato]));
  const proprios = new Set(atributosDoPapel(papel));
  const encontrados = new Map<AtributoPapel, string[]>();
  const visitados = new Set([papel.nome]);
  const fila: { papel: PapelDTO; caminho: string[] }[] = [{ papel, caminho: [] }];

  for (let atual = fila.shift(); atual; atual = fila.shift()) {
    for (const participacao of atual.papel.membroDe) {
      if (!participacao.assume || visitados.has(participacao.papel)) continue;
      visitados.add(participacao.papel);
      const grupo = porNome.get(participacao.papel);
      if (!grupo) continue;
      const caminho = [...atual.caminho, grupo.nome];
      for (const atributo of atributosDoPapel(grupo)) {
        if (!proprios.has(atributo) && !encontrados.has(atributo)) encontrados.set(atributo, caminho);
      }
      fila.push({ papel: grupo, caminho });
    }
  }

  return atributosPapel.flatMap((atributo) => {
    const caminho = encontrados.get(atributo);
    return caminho ? [{ atributo, caminho }] : [];
  });
}

export function gruposHerdados(papel: PapelDTO, papeis: PapelDTO[]): string[] {
  const porNome = new Map(papeis.map((candidato) => [candidato.nome, candidato]));
  const herdados: string[] = [];
  const visitados = new Set([papel.nome]);
  const fila: PapelDTO[] = [papel];

  for (let atual = fila.shift(); atual; atual = fila.shift()) {
    for (const participacao of atual.membroDe) {
      if (!participacao.herda || visitados.has(participacao.papel)) continue;
      visitados.add(participacao.papel);
      herdados.push(participacao.papel);
      const grupo = porNome.get(participacao.papel);
      if (grupo) fila.push(grupo);
    }
  }

  return herdados;
}

export function descreverParticipacao(participacao: ParticipacaoDTO): string {
  const partes = [
    participacao.herda ? 'herda as permissões' : 'não herda as permissões',
    participacao.assume ? 'assume com SET ROLE' : null,
    participacao.administra ? 'concede a outros' : null,
  ].filter((parte): parte is string => parte !== null);
  const texto = partes.join(' · ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function funcoesDeRisco(papel: PapelDTO): ObjetoDoPapelDTO[] {
  return papel.objetos.filter(
    (objeto) => objeto.funcao !== null && objeto.funcao.segurancaDefinidor && !temSearchPathFixo(objeto.funcao),
  );
}

export function semLimiteDeTempo(papel: PapelDTO): boolean {
  return (
    papel.login &&
    !papel.superusuario &&
    !papel.replicacao &&
    !papel.configuracoes.some((configuracao) => descreverConfiguracao(configuracao).parametro === 'statement_timeout')
  );
}

function compararNomes(a: PapelDTO, b: PapelDTO): number {
  return ORDEM_ALFABETICA.compare(a.nome, b.nome);
}

function compararPorTipoENome(a: PapelDTO, b: PapelDTO): number {
  return Number(b.login) - Number(a.login) || compararNomes(a, b);
}

function chaveDeOrdenacao(
  papel: PapelDTO,
  ordenacao: Exclude<OrdenacaoPapeis, 'NOME'>,
  contexto: Pick<ContextoDosPapeis, 'geradoEm'>,
): number | null {
  if (!papel.login) return null;
  if (ordenacao === 'SESSOES') return papel.sessoes;
  const instante = ordenacao === 'ULTIMO_USO' ? ultimoUso(papel, contexto) : papel.validadeSenha;
  return instante === null ? null : new Date(instante).getTime();
}

export function ordenarPapeis(
  papeis: PapelDTO[],
  ordenacao: OrdenacaoPapeis,
  direcao: DirecaoOrdenacao,
  contexto: Pick<ContextoDosPapeis, 'geradoEm'>,
): PapelDTO[] {
  const sinal = direcao === 'ASC' ? 1 : -1;
  return [...papeis].sort((a, b) => {
    if (ordenacao === 'NOME') return sinal * compararPorTipoENome(a, b);
    const chaveA = chaveDeOrdenacao(a, ordenacao, contexto);
    const chaveB = chaveDeOrdenacao(b, ordenacao, contexto);
    if (chaveA === null || chaveB === null) {
      if (chaveA !== chaveB) return chaveA === null ? 1 : -1;
      return compararPorTipoENome(a, b);
    }
    if (chaveA !== chaveB) return chaveA < chaveB ? -sinal : sinal;
    return compararNomes(a, b);
  });
}

export function filtrarPapeis(papeis: PapelDTO[], filtros: FiltrosPapeis, contexto: ContextoDosPapeis): PapelDTO[] {
  const termos = termosDaBusca(filtros.busca);
  const encontrados = papeis.filter(
    (papel) =>
      (termos.length === 0 || correspondeABusca(`${papel.nome} ${papel.descricao ?? ''}`, termos)) &&
      (filtros.tipo === null || tipoDoPapel(papel) === filtros.tipo) &&
      (filtros.atributo === null || atributosDoPapel(papel).includes(filtros.atributo)) &&
      (filtros.situacao === null || situacoesDoPapel(papel, contexto).includes(filtros.situacao)),
  );
  return ordenarPapeis(encontrados, filtros.ordenacao, filtros.direcao, contexto);
}

export function contarPorSituacaoPapel(papeis: PapelDTO[], contexto: ContextoDosPapeis): Record<SituacaoPapel, number> {
  const contagem = Object.fromEntries(situacoesPapel.map((situacao) => [situacao, 0])) as Record<SituacaoPapel, number>;
  for (const papel of papeis) {
    for (const situacao of situacoesDoPapel(papel, contexto)) contagem[situacao] += 1;
  }
  return contagem;
}

export function resumirPapeis(papeis: PapelDTO[], encontrados: number, filtros: FiltrosPapeis): string {
  if (papeis.length === 0) return 'Nenhum papel no banco';
  if (temFiltroAtivoPapeis(filtros)) {
    return `${formatarNumero(encontrados)} de ${formatarNumero(papeis.length)} ${pluralizar(papeis.length, 'papel', 'papéis')}`;
  }
  const usuarios = papeis.filter((papel) => papel.login).length;
  const grupos = papeis.length - usuarios;
  const partes = [
    usuarios > 0 ? `${formatarNumero(usuarios)} ${pluralizar(usuarios, 'usuário', 'usuários')}` : null,
    grupos > 0 ? `${formatarNumero(grupos)} ${pluralizar(grupos, 'grupo', 'grupos')}` : null,
  ].filter((parte): parte is string => parte !== null);
  return partes.join(' e ');
}

export function descreverFiltrosPapeis(filtros: FiltrosPapeis): string[] {
  const partes: string[] = [];
  if (filtros.busca !== '') partes.push(`busca por “${filtros.busca}”`);
  if (filtros.tipo) partes.push(`tipo: ${rotuloFiltroTipoPapel[filtros.tipo].toLowerCase()}`);
  if (filtros.atributo) partes.push(`atributo: ${rotuloAtributo[filtros.atributo].toLowerCase()}`);
  if (filtros.situacao) partes.push(`situação: ${rotuloFiltroSituacaoPapel[filtros.situacao].toLowerCase()}`);
  return partes;
}

export interface TextoDaColetaDosPapeis {
  curto: string;
  completo: string;
  incompleta: boolean;
}

export function textoDaColetaDosPapeis(contexto: Pick<ContextoDosPapeis, 'geradoEm' | 'coletaDesde'>): TextoDaColetaDosPapeis {
  const dias = Math.floor(diasEntre(contexto.coletaDesde, contexto.geradoEm));
  const data = formatarDia(contexto.coletaDesde);
  if (dias >= DIAS_DE_OBSERVACAO) {
    return {
      curto: `Sessões acompanhadas desde ${data}`,
      completo: `O Orynt acompanha as sessões deste banco desde ${data}. O último uso de cada usuário vem dessas amostras, porque o PostgreSQL não registra o último login.`,
      incompleta: false,
    };
  }
  const desde = dias < 1 ? 'hoje' : `há ${diasInteiros(dias)}`;
  return {
    curto: `Sessões acompanhadas desde ${data}`,
    completo: `O Orynt começou a acompanhar as sessões deste banco ${desde}. Um usuário só é marcado sem uso depois de ${DIAS_DE_OBSERVACAO} dias de coleta.`,
    incompleta: true,
  };
}

export function textoDoUltimoUso(papel: PapelDTO, contexto: ContextoDosPapeis): string {
  const estado = estadoDoUsoDoPapel(papel, contexto);
  if (estado === 'GRUPO') return 'Não se aplica';
  if (estado === 'CONECTADO') return 'Agora';
  if (papel.vistoPorUltimo === null) return 'Nunca visto';
  const dias = diasEntre(papel.vistoPorUltimo, contexto.geradoEm);
  if (dias < 1) return 'Hoje';
  return `Há ${diasInteiros(dias)}`;
}

export function textoDaValidade(papel: PapelDTO, contexto: ContextoDosPapeis): string {
  const estado = estadoDaSenha(papel, contexto);
  const dias = diasAteVencer(papel, contexto);
  if (estado === 'SEM_SENHA') return 'Sem senha';
  if (estado === 'SEM_VALIDADE' || dias === null) return 'Sem validade';
  if (estado === 'VENCIDA') return `Venceu ${haQuantoVenceu(dias)}`;
  return `Vence ${quandoVence(dias)}`;
}

function fraseDoSuperusuario(): string {
  return `Faz login como superusuário: passa por cima de todas as permissões e das políticas de linha, muda as configurações do servidor e lê arquivos dele. Quem obtiver a senha deste usuário tem o servidor inteiro, não só este banco.`;
}

function fraseDaValidade(papel: PapelDTO, contexto: ContextoDosPapeis): string {
  const dias = diasAteVencer(papel, contexto) ?? 0;
  const data = papel.validadeSenha ? formatarDia(papel.validadeSenha) : '';
  if (estadoDaSenha(papel, contexto) === 'VENCIDA') {
    const visto = papel.vistoPorUltimo ? ` O Orynt o viu conectado pela última vez em ${formatarDia(papel.vistoPorUltimo)}.` : '';
    return `A senha venceu ${haQuantoVenceu(dias)}, em ${data}: o PostgreSQL recusa o login deste usuário até a validade ser renovada.${visto}`;
  }
  return `A senha vence ${quandoVence(dias)}, em ${data}. Depois disso, o PostgreSQL recusa o login de ${papel.nome}, e os serviços que usam este papel deixam de conectar.`;
}

function fraseDoMd5(): string {
  return 'A senha está guardada em MD5, que o PostgreSQL 18 marca como obsoleto: quem obtiver o hash consegue entrar sem saber a senha. Guardada em SCRAM-SHA-256, a senha não tem esse problema.';
}

function fraseDoLimite(papel: PapelDTO): string {
  const limite = papel.limiteConexoes ?? 0;
  const parte = Math.round((papel.sessoes / Math.max(1, limite)) * 100);
  return `Usa ${formatarNumero(papel.sessoes)} das ${formatarNumero(limite)} conexões que o limite do papel permite (${formatarNumero(parte)}%). No limite, a próxima conexão é recusada com “too many connections for role”.`;
}

function fraseSemUso(papel: PapelDTO, contexto: ContextoDosPapeis): string {
  const visto = papel.vistoPorUltimo
    ? `O Orynt o viu conectado pela última vez em ${formatarDia(papel.vistoPorUltimo)}.`
    : `O Orynt não o viu conectado nenhuma vez desde ${formatarDia(inicioDaObservacaoDoPapel(papel, contexto))}.`;
  return `Não abriu nenhuma sessão nos últimos ${DIAS_DE_OBSERVACAO} dias. ${visto} Um processo trimestral ou anual não aparece nesse período: confira com quem usa o papel antes de desligar o login.`;
}

function fraseDoGrupoVazio(): string {
  return 'Não tem membros e não é dono de nenhum objeto deste banco: as permissões concedidas a ele não chegam a ninguém.';
}

export function fraseDaSituacaoPapel(situacao: SituacaoPapel, papel: PapelDTO, contexto: ContextoDosPapeis): string {
  if (situacao === 'SUPERUSUARIO') return fraseDoSuperusuario();
  if (situacao === 'VALIDADE_DA_SENHA') return fraseDaValidade(papel, contexto);
  if (situacao === 'SENHA_MD5') return fraseDoMd5();
  if (situacao === 'PERTO_DO_LIMITE') return fraseDoLimite(papel);
  if (situacao === 'SEM_USO') return fraseSemUso(papel, contexto);
  return fraseDoGrupoVazio();
}

export type AlvoDoPontoPapel = { tipo: 'PAPEL'; nome: string } | { tipo: 'FILTRO'; situacao: SituacaoPapel };

export interface PontoDeAtencaoPapel {
  tipo: SituacaoPapel;
  tom: TomDoAviso;
  papel: string | null;
  titulo: string | null;
  texto: string;
  alvo: AlvoDoPontoPapel;
}

function listarNomes(papeis: PapelDTO[]): string {
  const nomes = papeis.slice(0, NOMES_NA_FRASE).map((papel) => papel.nome);
  const restantes = papeis.length - nomes.length;
  if (restantes > 0) return `${nomes.join(', ')} e mais ${formatarNumero(restantes)}`;
  if (nomes.length === 1) return nomes[0] ?? '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1) ?? ''}`;
}

const tituloDoGrupo: Record<SituacaoPapel, (quantidade: string) => string> = {
  SUPERUSUARIO: (quantidade) => `${quantidade} usuários superusuários`,
  VALIDADE_DA_SENHA: (quantidade) => `${quantidade} senhas vencidas ou a vencer`,
  SENHA_MD5: (quantidade) => `${quantidade} senhas em MD5`,
  PERTO_DO_LIMITE: (quantidade) => `${quantidade} usuários perto do limite de conexões`,
  SEM_USO: (quantidade) => `${quantidade} usuários sem uso em 30 dias`,
  GRUPO_VAZIO: (quantidade) => `${quantidade} grupos vazios`,
};

function fraseDoGrupo(situacao: SituacaoPapel, papeis: PapelDTO[]): string {
  const nomes = listarNomes(papeis);
  if (situacao === 'SUPERUSUARIO') {
    return `${nomes} fazem login como superusuários: quem obtiver a senha de um deles tem o servidor inteiro.`;
  }
  if (situacao === 'VALIDADE_DA_SENHA') {
    return `As senhas de ${nomes} venceram ou vencem em até ${DIAS_ATE_VENCER} dias: o PostgreSQL recusa o login depois da validade.`;
  }
  if (situacao === 'SENHA_MD5') {
    return `${nomes} guardam a senha em MD5, que o PostgreSQL 18 marca como obsoleto: quem obtiver o hash entra sem saber a senha.`;
  }
  if (situacao === 'PERTO_DO_LIMITE') {
    return `${nomes} usam ${formatarNumero(PARTE_PERTO_DO_LIMITE * 100)}% ou mais das conexões que o limite de cada um permite.`;
  }
  if (situacao === 'SEM_USO') {
    return `${nomes} não abriram nenhuma sessão nos últimos ${DIAS_DE_OBSERVACAO} dias. Confira com quem usa cada papel antes de desligar o login.`;
  }
  return `${nomes} não têm membros nem são donos de nenhum objeto deste banco.`;
}

function ordenarParaOsPontos(situacao: SituacaoPapel, papeis: PapelDTO[], contexto: ContextoDosPapeis): PapelDTO[] {
  if (situacao === 'VALIDADE_DA_SENHA') return ordenarPapeis(papeis, 'VALIDADE', 'ASC', contexto);
  if (situacao === 'PERTO_DO_LIMITE') return ordenarPapeis(papeis, 'SESSOES', 'DESC', contexto);
  return ordenarPapeis(papeis, 'NOME', 'ASC', contexto);
}

export function pontosDeAtencaoPapeis(papeis: PapelDTO[], contexto: ContextoDosPapeis): PontoDeAtencaoPapel[] {
  return situacoesPapel.flatMap((situacao): PontoDeAtencaoPapel[] => {
    const daSituacao = ordenarParaOsPontos(
      situacao,
      papeis.filter((papel) => situacoesDoPapel(papel, contexto).includes(situacao)),
      contexto,
    );

    if (daSituacao.length > MAXIMO_DE_PONTOS_SEPARADOS) {
      return [
        {
          tipo: situacao,
          tom: daSituacao.some((papel) => tomDaSituacaoPapel(situacao, papel, contexto) === 'erro') ? 'erro' : 'aviso',
          papel: null,
          titulo: tituloDoGrupo[situacao](formatarNumero(daSituacao.length)),
          texto: fraseDoGrupo(situacao, daSituacao),
          alvo: { tipo: 'FILTRO', situacao },
        },
      ];
    }

    return daSituacao.map((papel) => ({
      tipo: situacao,
      tom: tomDaSituacaoPapel(situacao, papel, contexto),
      papel: papel.nome,
      titulo: null,
      texto: fraseDaSituacaoPapel(situacao, papel, contexto),
      alvo: { tipo: 'PAPEL', nome: papel.nome },
    }));
  });
}

export function avisosDoPapel(papel: PapelDTO, papeis: PapelDTO[], contexto: ContextoDosPapeis): AvisoDoPapel[] {
  const avisos: AvisoDoPapel[] = situacoesDoPapel(papel, contexto).map((situacao) => ({
    tom: tomDaSituacaoPapel(situacao, papel, contexto),
    texto: fraseDaSituacaoPapel(situacao, papel, contexto),
  }));

  const superusuarioAssumivel = participacoesComSetRole(papel, papeis).find((item) => item.atributo === 'SUPERUSUARIO');
  if (papel.login && superusuarioAssumivel) {
    avisos.push({
      tom: 'erro',
      texto: `Pode virar superusuário com SET ROLE ${superusuarioAssumivel.caminho.at(-1) ?? ''}, pela participação em ${superusuarioAssumivel.caminho.join(' › ')}. Na prática, é um superusuário com outro nome.`,
    });
  }

  for (const funcao of funcoesDeRisco(papel)) {
    avisos.push({
      tom: papel.superusuario ? 'erro' : 'aviso',
      texto: `É dono ${funcao.tipo === 'PROCEDIMENTO' ? 'do procedimento' : 'da função'} ${funcao.nome}, que roda com os privilégios dele (SECURITY DEFINER) e não fixa o search_path. Quem puder criar um objeto num esquema do caminho de busca de quem ${funcao.tipo === 'PROCEDIMENTO' ? 'o chama' : 'a chama'} consegue executá-lo com os privilégios de ${papel.nome}${papel.superusuario ? ', que é superusuário' : ''}.`,
    });
  }

  if (estadoDoUsoDoPapel(papel, contexto) === 'EM_OBSERVACAO') {
    const desde = diasEntre(inicioDaObservacaoDoPapel(papel, contexto), contexto.geradoEm);
    const quando = desde < 1 ? 'hoje' : `há ${diasInteiros(desde)}`;
    avisos.push({
      tom: 'aviso',
      texto: `O Orynt começou a ver este usuário ${quando} e ainda não o viu conectado. Um usuário só é marcado sem uso depois de ${DIAS_DE_OBSERVACAO} dias de coleta, para um papel novo não ser tomado por esquecido.`,
    });
  }

  return avisos;
}

function dataDaNovaValidade(contexto: Pick<ContextoDosPapeis, 'geradoEm'>): string {
  const data = new Date(new Date(contexto.geradoEm).getTime() + DIAS_DA_NOVA_VALIDADE * MS_POR_DIA);
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function novoLimiteDeConexoes(papel: PapelDTO): number {
  const limite = papel.limiteConexoes ?? 0;
  return Math.max(limite + 1, Math.ceil(limite * 1.5));
}

const NAO_EXECUTA_SEM_REVISAO = 'Nada roda sem você revisar o comando antes.';

export function comandosDoPapel(papel: PapelDTO, contexto: ContextoDosPapeis): ComandoDoPapel[] {
  const nome = identificadorSql(papel.nome);
  const situacoes = situacoesDoPapel(papel, contexto);
  const comandos: ComandoDoPapel[] = [];
  const alterar = (mudanca: Omit<Extract<OperacaoDTO, { tipo: 'ALTERAR_PAPEL' }>, 'tipo' | 'papel'>): OperacaoDTO[] => [
    { tipo: 'ALTERAR_PAPEL', papel: papel.nome, ...mudanca },
  ];
  const comOperacoes = (
    item: Omit<ComandoDoPapel, 'comando'> & { operacoes: OperacaoDTO[] },
  ): ComandoDoPapel => ({ ...item, comando: comandosDasOperacoes(item.operacoes).join('\n') });

  if (situacoes.includes('SUPERUSUARIO')) {
    comandos.push(
      comOperacoes({
        situacao: 'SUPERUSUARIO',
        rotulo: 'Comando que tira o superusuário',
        operacoes: alterar({ atributos: { superusuario: false } }),
        explicacao: `Antes de rodar, confira o que este usuário faz que exige superusuário, como criar extensões ou mudar configurações do servidor, e conceda só isso. ${NAO_EXECUTA_SEM_REVISAO}`,
      }),
    );
  }
  if (situacoes.includes('VALIDADE_DA_SENHA')) {
    comandos.push(
      comOperacoes({
        situacao: 'VALIDADE_DA_SENHA',
        rotulo: 'Comando que renova a validade',
        operacoes: alterar({ atributos: {}, validadeSenha: dataDaNovaValidade(contexto) }),
        explicacao: `Leva a validade para ${DIAS_DA_NOVA_VALIDADE} dias à frente. Se a senha também precisa mudar, troque-a em "Editar", que calcula o verificador SCRAM no navegador, ou no psql com \\password ${nome}. ${NAO_EXECUTA_SEM_REVISAO}`,
      }),
    );
  }
  if (situacoes.includes('SENHA_MD5')) {
    comandos.push({
      situacao: 'SENHA_MD5',
      rotulo: 'Comandos que passam a senha para SCRAM',
      comando: `SET password_encryption = 'scram-sha-256';\n\\password ${nome}`,
      explicacao:
        'A senha só muda de formato quando é definida de novo. "Trocar a senha" faz isso aqui, com o verificador SCRAM calculado no navegador; no psql, o \\password pede a senha sem mostrá-la. Depois, troque md5 por scram-sha-256 no pg_hba.conf.',
      operacoes: null,
    });
  }
  if (situacoes.includes('PERTO_DO_LIMITE')) {
    comandos.push(
      comOperacoes({
        situacao: 'PERTO_DO_LIMITE',
        rotulo: 'Comando que sobe o limite',
        operacoes: alterar({ atributos: {}, limiteConexoes: novoLimiteDeConexoes(papel) }),
        explicacao: `Antes de subir o limite, confira se o serviço não está deixando conexões abertas: um pool de conexões costuma resolver sem aumentar. ${NAO_EXECUTA_SEM_REVISAO}`,
      }),
    );
  }
  if (situacoes.includes('SEM_USO')) {
    comandos.push(
      comOperacoes({
        situacao: 'SEM_USO',
        rotulo: 'Comando que desliga o login',
        operacoes: alterar({ atributos: { login: false } }),
        explicacao: `Desliga o login sem apagar o papel nem as permissões: se algo parar, ALTER ROLE ${nome} LOGIN volta tudo como estava. ${NAO_EXECUTA_SEM_REVISAO}`,
      }),
    );
  }
  if (situacoes.includes('GRUPO_VAZIO')) {
    comandos.push(
      comOperacoes({
        situacao: 'GRUPO_VAZIO',
        rotulo: 'Comando que remove o grupo',
        operacoes: [{ tipo: 'EXCLUIR_PAPEL', papel: papel.nome, herdeiro: null, removerPermissoes: false, encerrarSessoes: false }],
        explicacao: `Se o grupo tiver objetos ou permissões em outros bancos do servidor, o PostgreSQL recusa a remoção até eles saírem: rode REASSIGN OWNED e DROP OWNED em cada banco antes. ${NAO_EXECUTA_SEM_REVISAO}`,
      }),
    );
  }

  return comandos;
}

export function comandosDaSituacaoPapel(papel: PapelDTO, situacao: SituacaoPapel, contexto: ContextoDosPapeis): string[] {
  const comando = comandosDoPapel(papel, contexto).find((candidato) => candidato.situacao === situacao);
  return comando ? comando.comando.split('\n') : [];
}

export function loteDeComandosDosPapeis(
  papeis: PapelDTO[],
  situacao: SituacaoPapel,
  contexto: ContextoDosPapeis,
): LoteDeComandos | null {
  const comandos = [...new Set(papeis.flatMap((papel) => comandosDaSituacaoPapel(papel, situacao, contexto)))];
  if (comandos.length === 0) return null;
  const quantidade = formatarNumero(comandos.length);
  return {
    comandos,
    rotulo: comandos.length === 1 ? 'Copiar o comando' : `Copiar os ${quantidade} comandos`,
    descricao:
      comandos.length === 1 ? 'Copiar o comando do papel da lista' : `Copiar os ${quantidade} comandos dos papéis da lista, um por linha`,
  };
}

export function operacoesDoLoteDosPapeis(
  papeis: PapelDTO[],
  situacao: SituacaoPapel,
  contexto: ContextoDosPapeis,
): OperacaoDTO[] | null {
  const comandos = papeis.flatMap((papel) => comandosDoPapel(papel, contexto).filter((comando) => comando.situacao === situacao));
  if (comandos.length === 0 || comandos.some((comando) => comando.operacoes === null)) return null;
  return comandos.flatMap((comando) => comando.operacoes ?? []);
}

export function contarObjetosPorTipo(papel: PapelDTO): { tipo: TipoObjetoDoPapel; quantidade: number }[] {
  const ordem: TipoObjetoDoPapel[] = ['TABELA', 'VISAO', 'VISAO_MATERIALIZADA', 'FUNCAO', 'PROCEDIMENTO'];
  return ordem
    .map((tipo) => ({ tipo, quantidade: papel.objetos.filter((objeto) => objeto.tipo === tipo).length }))
    .filter((item) => item.quantidade > 0);
}
