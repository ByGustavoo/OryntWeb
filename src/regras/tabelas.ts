import type { DirecaoOrdenacao } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import type {
  AjusteAutovacuumDTO,
  FiltrosTabelas,
  OrdenacaoTabelas,
  ParticaoDTO,
  SituacaoTabela,
  TabelaDTO,
} from '@/modelos/objetos';
import {
  formatarDecimal,
  formatarNumero,
  formatarQuantidade,
  formatarTamanho,
  formatarTempoRelativo,
  iniciarComMaiuscula,
  pluralizar,
} from '@/utilitarios/formatacao';
import { correspondeABusca, limparBusca, termosDaBusca } from './buscaConsultas';
import type { LoteDeComandos } from './indices';
import { lerPagina, paginaAposMudanca } from './paginacaoLocal';
import { lerEsquema } from './visoes';
import type { TomDoAviso } from './visoes';

export const PERIODO_DAS_TABELAS: PeriodoDashboard = 'ULTIMOS_30_DIAS';
export const PARTE_MORTA_PARA_VACUUM = 0.2;
export const MINIMO_DE_LINHAS_MORTAS = 10_000;
export const PARTE_ALTERADA_PARA_ANALYZE = 0.1;
export const TAMANHO_MINIMO_LIDA_INTEIRA = 10 * 1024 * 1024;
export const PARTE_DO_LIMITE_DE_IDADE = 0.5;
export const DIAS_DO_CRESCIMENTO = 30;

const MS_POR_DIA = 86_400_000;
const ORDEM_ALFABETICA = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const NOMES_NA_FRASE = 3;

export const situacoesTabela: SituacaoTabela[] = [
  'IDADE_ALTA',
  'PRECISA_VACUUM',
  'LIDA_INTEIRA',
  'ESTATISTICAS_DESATUALIZADAS',
  'SEM_CHAVE_PRIMARIA',
];

export const ordenacoesTabelas: OrdenacaoTabelas[] = ['NOME', 'LINHAS', 'TAMANHO', 'LEITURAS', 'MANUTENCAO'];

export const rotuloSituacaoTabela: Record<SituacaoTabela, string> = {
  IDADE_ALTA: 'Idade alta',
  PRECISA_VACUUM: 'Precisa de VACUUM',
  LIDA_INTEIRA: 'Lida inteira',
  ESTATISTICAS_DESATUALIZADAS: 'Estatísticas antigas',
  SEM_CHAVE_PRIMARIA: 'Sem chave primária',
};

export const rotuloFiltroSituacaoTabela: Record<SituacaoTabela, string> = {
  IDADE_ALTA: 'Idade de transação alta',
  PRECISA_VACUUM: 'Precisam de VACUUM',
  LIDA_INTEIRA: 'Lidas inteiras',
  ESTATISTICAS_DESATUALIZADAS: 'Estatísticas desatualizadas',
  SEM_CHAVE_PRIMARIA: 'Sem chave primária',
};

export const direcaoInicialDaOrdenacaoTabelas: Record<OrdenacaoTabelas, DirecaoOrdenacao> = {
  NOME: 'ASC',
  LINHAS: 'DESC',
  TAMANHO: 'DESC',
  LEITURAS: 'DESC',
  MANUTENCAO: 'ASC',
};

export const filtrosTabelasIniciais: FiltrosTabelas = {
  busca: '',
  esquema: null,
  situacao: null,
  ordenacao: 'TAMANHO',
  direcao: 'DESC',
  pagina: 1,
};

export interface ContextoDasTabelas {
  geradoEm: string;
  coletaDesde: string;
}

export interface AvisoDaTabela {
  tom: TomDoAviso;
  texto: string;
}

export interface ComandoDaTabela {
  rotulo: string;
  comando: string;
  explicacao: string;
}

function lerDaLista<T extends string>(lista: readonly T[], valor: unknown): T | null {
  return lista.find((item) => item === valor) ?? null;
}

export function lerFiltrosTabelas(valor: unknown): FiltrosTabelas {
  if (!valor || typeof valor !== 'object') return filtrosTabelasIniciais;
  const guardado = valor as Record<string, unknown>;
  const ordenacao = lerDaLista(ordenacoesTabelas, guardado.ordenacao) ?? filtrosTabelasIniciais.ordenacao;

  return {
    busca: typeof guardado.busca === 'string' ? limparBusca(guardado.busca) : filtrosTabelasIniciais.busca,
    esquema: lerEsquema(guardado.esquema),
    situacao: lerDaLista(situacoesTabela, guardado.situacao),
    ordenacao,
    direcao:
      lerDaLista<DirecaoOrdenacao>(['ASC', 'DESC'], guardado.direcao) ?? direcaoInicialDaOrdenacaoTabelas[ordenacao],
    pagina: lerPagina(guardado.pagina),
  };
}

export function aplicarMudancaTabelas(filtros: FiltrosTabelas, mudanca: Partial<FiltrosTabelas>): FiltrosTabelas {
  return lerFiltrosTabelas({ ...filtros, ...mudanca, pagina: paginaAposMudanca(filtros, mudanca) });
}

export function alternarOrdenacaoTabelas(
  filtros: FiltrosTabelas,
  ordenacao: OrdenacaoTabelas,
): Pick<FiltrosTabelas, 'ordenacao' | 'direcao'> {
  if (filtros.ordenacao !== ordenacao) return { ordenacao, direcao: direcaoInicialDaOrdenacaoTabelas[ordenacao] };
  return { ordenacao, direcao: filtros.direcao === 'DESC' ? 'ASC' : 'DESC' };
}

export function temFiltroAtivoTabelas(filtros: FiltrosTabelas): boolean {
  return filtros.busca !== '' || filtros.esquema !== null || filtros.situacao !== null;
}

export function semFiltrosTabelas(): Pick<FiltrosTabelas, 'busca' | 'esquema' | 'situacao'> {
  return { busca: '', esquema: null, situacao: null };
}

export function tamanhoTotal(tabela: TabelaDTO): number {
  return tabela.tamanhoDadosBytes + tabela.tamanhoIndicesBytes + tabela.tamanhoToastBytes;
}

export function leiturasDaTabela(tabela: TabelaDTO): number {
  return tabela.leiturasSequenciais + tabela.leiturasPorIndice;
}

export function parteLidaInteira(tabela: TabelaDTO): number {
  const linhas = tabela.linhasLidasSequencialmente + tabela.linhasLidasPorIndice;
  return linhas === 0 ? 0 : tabela.linhasLidasSequencialmente / linhas;
}

export function linhasPorLeituraInteira(tabela: TabelaDTO): number {
  return tabela.leiturasSequenciais === 0 ? 0 : tabela.linhasLidasSequencialmente / tabela.leiturasSequenciais;
}

export function parteDoLimite(idade: number, limite: number): number {
  return limite > 0 ? idade / limite : 0;
}

export function particoesComIdadeAlta(tabela: TabelaDTO): ParticaoDTO[] {
  return (tabela.particionamento?.particoes ?? [])
    .filter((particao) => parteDoLimite(particao.idadeTransacoes, tabela.limiteCongelamento) > PARTE_DO_LIMITE_DE_IDADE)
    .sort((a, b) => b.idadeTransacoes - a.idadeTransacoes);
}

export function autovacuumDesligado(tabela: Pick<TabelaDTO, 'autovacuum'>): boolean {
  return tabela.autovacuum.some((ajuste) => ajuste.parametro === 'autovacuum_enabled' && ajuste.valor === 'false');
}

export function situacoesDaTabela(tabela: TabelaDTO): SituacaoTabela[] {
  const situacoes: SituacaoTabela[] = [];
  if (parteDoLimite(tabela.idadeTransacoes, tabela.limiteCongelamento) > PARTE_DO_LIMITE_DE_IDADE) situacoes.push('IDADE_ALTA');
  if (tabela.linhasMortas >= MINIMO_DE_LINHAS_MORTAS && tabela.linhasMortas > tabela.linhas * PARTE_MORTA_PARA_VACUUM) {
    situacoes.push('PRECISA_VACUUM');
  }
  if (
    tabela.tamanhoDadosBytes >= TAMANHO_MINIMO_LIDA_INTEIRA &&
    tabela.leiturasSequenciais > 0 &&
    parteLidaInteira(tabela) > 0.5
  ) {
    situacoes.push('LIDA_INTEIRA');
  }
  if (tabela.alteracoesDesdeAnalyze > tabela.linhas * PARTE_ALTERADA_PARA_ANALYZE) situacoes.push('ESTATISTICAS_DESATUALIZADAS');
  if (tabela.chavePrimaria === null) situacoes.push('SEM_CHAVE_PRIMARIA');
  return situacoes;
}

export function tomDaSituacao(situacao: SituacaoTabela): TomDoAviso {
  return situacao === 'IDADE_ALTA' ? 'erro' : 'aviso';
}

export interface Manutencao {
  instante: string;
  automatica: boolean;
}

export function ultimaManutencao(tabela: Pick<TabelaDTO, 'ultimoVacuum' | 'ultimoAutovacuum'>): Manutencao | null {
  const { ultimoVacuum, ultimoAutovacuum } = tabela;
  if (ultimoVacuum === null && ultimoAutovacuum === null) return null;
  if (ultimoVacuum === null) return { instante: ultimoAutovacuum ?? '', automatica: true };
  if (ultimoAutovacuum === null || ultimoVacuum >= ultimoAutovacuum) return { instante: ultimoVacuum, automatica: false };
  return { instante: ultimoAutovacuum, automatica: true };
}

export function esquemasDasTabelas(tabelas: TabelaDTO[]): string[] {
  return [...new Set(tabelas.map((tabela) => tabela.esquema))].sort(ORDEM_ALFABETICA.compare);
}

function compararNomes(a: TabelaDTO, b: TabelaDTO): number {
  return ORDEM_ALFABETICA.compare(a.esquema, b.esquema) || ORDEM_ALFABETICA.compare(a.nome, b.nome);
}

function instanteDaManutencao(tabela: TabelaDTO): number {
  const manutencao = ultimaManutencao(tabela);
  return manutencao ? new Date(manutencao.instante).getTime() : Number.NEGATIVE_INFINITY;
}

function chaveDeOrdenacao(tabela: TabelaDTO, ordenacao: Exclude<OrdenacaoTabelas, 'NOME'>): number {
  if (ordenacao === 'LINHAS') return tabela.linhas;
  if (ordenacao === 'TAMANHO') return tamanhoTotal(tabela);
  if (ordenacao === 'LEITURAS') return leiturasDaTabela(tabela);
  return instanteDaManutencao(tabela);
}

export function ordenarTabelas(tabelas: TabelaDTO[], ordenacao: OrdenacaoTabelas, direcao: DirecaoOrdenacao): TabelaDTO[] {
  const sinal = direcao === 'ASC' ? 1 : -1;
  return [...tabelas].sort((a, b) => {
    if (ordenacao === 'NOME') return sinal * compararNomes(a, b);
    const chaveA = chaveDeOrdenacao(a, ordenacao);
    const chaveB = chaveDeOrdenacao(b, ordenacao);
    if (chaveA !== chaveB) return chaveA < chaveB ? -sinal : sinal;
    return compararNomes(a, b);
  });
}

export function filtrarTabelas(tabelas: TabelaDTO[], filtros: FiltrosTabelas): TabelaDTO[] {
  const termos = termosDaBusca(filtros.busca);
  const encontradas = tabelas.filter(
    (tabela) =>
      (termos.length === 0 ||
        correspondeABusca(
          `${tabela.id} ${tabela.descricao ?? ''} ${tabela.colunas.map((coluna) => coluna.nome).join(' ')}`,
          termos,
        )) &&
      (filtros.esquema === null || tabela.esquema === filtros.esquema) &&
      (filtros.situacao === null || situacoesDaTabela(tabela).includes(filtros.situacao)),
  );
  return ordenarTabelas(encontradas, filtros.ordenacao, filtros.direcao);
}

export function contarPorSituacao(tabelas: TabelaDTO[]): Record<SituacaoTabela, number> {
  const contagem = Object.fromEntries(situacoesTabela.map((situacao) => [situacao, 0])) as Record<SituacaoTabela, number>;
  for (const tabela of tabelas) {
    for (const situacao of situacoesDaTabela(tabela)) contagem[situacao] += 1;
  }
  return contagem;
}

export function resumirTabelas(tabelas: TabelaDTO[], encontradas: number, filtros: FiltrosTabelas): string {
  if (tabelas.length === 0) return 'Nenhuma tabela no banco';
  const doBanco = `${formatarNumero(tabelas.length)} ${pluralizar(tabelas.length, 'tabela', 'tabelas')}`;
  if (temFiltroAtivoTabelas(filtros)) return `${formatarNumero(encontradas)} de ${doBanco}`;
  return `${doBanco} ocupando ${formatarTamanho(tabelas.reduce((soma, tabela) => soma + tamanhoTotal(tabela), 0))}`;
}

export function descreverFiltrosTabelas(filtros: FiltrosTabelas): string[] {
  const partes: string[] = [];
  if (filtros.busca !== '') partes.push(`busca por “${filtros.busca}”`);
  if (filtros.esquema) partes.push(`esquema: ${filtros.esquema}`);
  if (filtros.situacao) partes.push(`situação: ${rotuloFiltroSituacaoTabela[filtros.situacao].toLowerCase()}`);
  return partes;
}

const formatadorDaData = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });

export interface TextoDaColetaDasTabelas {
  curto: string;
  completo: string;
  incompleta: boolean;
}

function diasEntre(inicio: string, fim: string): number {
  return (new Date(fim).getTime() - new Date(inicio).getTime()) / MS_POR_DIA;
}

export function textoDaColetaDasTabelas(contexto: ContextoDasTabelas): TextoDaColetaDasTabelas {
  const dias = Math.floor(diasEntre(contexto.coletaDesde, contexto.geradoEm));
  const data = formatadorDaData.format(new Date(contexto.coletaDesde));
  if (dias >= DIAS_DO_CRESCIMENTO) {
    return {
      curto: `Uso medido desde ${data}`,
      completo: `O Orynt coleta o uso das tabelas deste banco desde ${data}. As leituras, as gravações e o crescimento são os dos últimos ${DIAS_DO_CRESCIMENTO} dias.`,
      incompleta: false,
    };
  }
  const desde = dias < 1 ? 'hoje' : `há ${formatarNumero(dias)} ${pluralizar(dias, 'dia', 'dias')}`;
  return {
    curto: `Uso medido desde ${data}`,
    completo: `O Orynt começou a coletar o uso das tabelas deste banco ${desde}. As leituras, as gravações e o crescimento cobrem só os dias desde então.`,
    incompleta: true,
  };
}

function percentual(parte: number): string {
  const valor = parte * 100;
  if (valor >= 10 || Number.isInteger(Math.round(valor * 10) / 10)) return `${formatarNumero(Math.round(valor))}%`;
  return `${formatarDecimal(valor, 1)}%`;
}

function linhas(quantidade: number): string {
  return `${formatarQuantidade(quantidade)} ${pluralizar(quantidade, 'linha', 'linhas')}`;
}

function quando(instante: string | null, geradoEm: string): string | null {
  return instante ? formatarTempoRelativo(instante, new Date(geradoEm)) : null;
}

function fraseDaIdade(tabela: TabelaDTO): string {
  const [particao] = particoesComIdadeAlta(tabela);
  const idade = particao?.idadeTransacoes ?? tabela.idadeTransacoes;
  const sujeito = particao ? `A partição ${particao.nome} chegou` : 'Chegou';
  return `${sujeito} a ${percentual(parteDoLimite(idade, tabela.limiteCongelamento))} do limite de congelamento (${formatarQuantidade(idade)} de ${formatarQuantidade(tabela.limiteCongelamento)} transações). No limite, o autovacuum roda um VACUUM obrigatório que lê ${particao ? 'a partição' : 'a tabela'} inteira e não pode ser interrompido, e ele pode cair na hora de mais movimento.`;
}

function fraseDoVacuum(tabela: TabelaDTO, geradoEm: string): string {
  const mortas = `Tem ${linhas(tabela.linhasMortas)} mortas, ${percentual(tabela.linhasMortas / Math.max(1, tabela.linhas))} das vivas, que ocupam espaço e deixam as leituras mais lentas.`;
  if (autovacuumDesligado(tabela)) return `${mortas} O autovacuum está desligado nesta tabela.`;
  const ultima = quando(tabela.ultimoAutovacuum, geradoEm);
  return ultima ? `${mortas} O último VACUUM automático foi ${ultima}.` : `${mortas} Não há registro de VACUUM automático.`;
}

function fraseDaLeituraInteira(tabela: TabelaDTO): string {
  const leituras = `${formatarQuantidade(tabela.leiturasSequenciais)} ${pluralizar(tabela.leiturasSequenciais, 'leitura', 'leituras')}`;
  const base = `${percentual(parteLidaInteira(tabela))} das linhas lidas nos últimos 30 dias vieram de leituras da tabela inteira: ${leituras} de ${formatarNumero(Math.round(linhasPorLeituraInteira(tabela)))} linhas cada.`;
  const sugeridos = tabela.indicesSugeridos.length;
  if (sugeridos === 0) return `${base} Os planos não sugerem índice: as consultas precisam de quase todas as linhas.`;
  return `${base} Os planos sugerem ${sugeridos === 1 ? 'um índice' : `${formatarNumero(sugeridos)} índices`}.`;
}

function fraseDasEstatisticas(tabela: TabelaDTO, geradoEm: string): string {
  const ultimo = quando(maisRecente(tabela.ultimoAnalyze, tabela.ultimoAutoanalyze), geradoEm);
  const desde = ultimo ? `desde o último ANALYZE, ${ultimo}` : 'e não há registro de ANALYZE';
  return `${iniciarComMaiuscula(linhas(tabela.alteracoesDesdeAnalyze))} mudaram ${desde}: ${percentual(tabela.alteracoesDesdeAnalyze / Math.max(1, tabela.linhas))} da tabela. Com estatísticas antigas, o planejador erra a estimativa de linhas e pode escolher um plano pior.`;
}

const FRASE_SEM_CHAVE =
  'Não tem chave primária: nada impede linhas repetidas, e a replicação lógica não consegue replicar as atualizações e as exclusões dela.';

export function maisRecente(...instantes: (string | null)[]): string | null {
  return instantes.reduce<string | null>((recente, instante) => {
    if (instante === null) return recente;
    if (recente === null || instante > recente) return instante;
    return recente;
  }, null);
}

export function fraseDaSituacao(situacao: SituacaoTabela, tabela: TabelaDTO, contexto: ContextoDasTabelas): string {
  if (situacao === 'IDADE_ALTA') return fraseDaIdade(tabela);
  if (situacao === 'PRECISA_VACUUM') return fraseDoVacuum(tabela, contexto.geradoEm);
  if (situacao === 'LIDA_INTEIRA') return fraseDaLeituraInteira(tabela);
  if (situacao === 'ESTATISTICAS_DESATUALIZADAS') return fraseDasEstatisticas(tabela, contexto.geradoEm);
  return FRASE_SEM_CHAVE;
}

export type AlvoDoPontoTabela = { tipo: 'TABELA'; id: string } | { tipo: 'FILTRO'; situacao: SituacaoTabela };

export interface PontoDeAtencaoTabela {
  tipo: SituacaoTabela;
  tom: TomDoAviso;
  tabela: Pick<TabelaDTO, 'esquema' | 'nome'> | null;
  titulo: string | null;
  texto: string;
  alvo: AlvoDoPontoTabela;
}

const MAXIMO_DE_PONTOS_SEPARADOS = 2;

function listarNomes(tabelas: TabelaDTO[]): string {
  const nomes = tabelas.slice(0, NOMES_NA_FRASE).map((tabela) => tabela.nome);
  const restantes = tabelas.length - nomes.length;
  if (restantes > 0) return `${nomes.join(', ')} e mais ${formatarNumero(restantes)}`;
  if (nomes.length === 1) return nomes[0] ?? '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1) ?? ''}`;
}

const tituloDoGrupo: Record<SituacaoTabela, (quantidade: string) => string> = {
  IDADE_ALTA: (quantidade) => `${quantidade} tabelas com idade de transação alta`,
  PRECISA_VACUUM: (quantidade) => `${quantidade} tabelas precisam de VACUUM`,
  LIDA_INTEIRA: (quantidade) => `${quantidade} tabelas lidas inteiras`,
  ESTATISTICAS_DESATUALIZADAS: (quantidade) => `${quantidade} tabelas com estatísticas desatualizadas`,
  SEM_CHAVE_PRIMARIA: (quantidade) => `${quantidade} tabelas sem chave primária`,
};

function fraseDoGrupo(situacao: SituacaoTabela, tabelas: TabelaDTO[]): string {
  const nomes = listarNomes(tabelas);
  if (situacao === 'IDADE_ALTA') {
    return `${nomes} passaram da metade do limite de congelamento. No limite, o autovacuum roda um VACUUM obrigatório em cada uma.`;
  }
  if (situacao === 'PRECISA_VACUUM') {
    const mortas = tabelas.reduce((soma, tabela) => soma + tabela.linhasMortas, 0);
    return `${nomes} somam ${linhas(mortas)} mortas, mais de ${percentual(PARTE_MORTA_PARA_VACUUM)} das vivas em cada uma.`;
  }
  if (situacao === 'LIDA_INTEIRA') {
    const comSugestao = tabelas.filter((tabela) => tabela.indicesSugeridos.length > 0).length;
    const sugestao =
      comSugestao === 0
        ? 'Os planos não sugerem índice para nenhuma delas.'
        : `Os planos sugerem índices para ${comSugestao === 1 ? 'uma delas' : `${formatarNumero(comSugestao)} delas`}.`;
    return `A maior parte das linhas lidas em ${nomes} vem de leituras da tabela inteira. ${sugestao}`;
  }
  if (situacao === 'ESTATISTICAS_DESATUALIZADAS') {
    return `Mais de ${percentual(PARTE_ALTERADA_PARA_ANALYZE)} das linhas de ${nomes} mudaram desde o último ANALYZE, e o planejador estima com números antigos.`;
  }
  return `${nomes} não têm chave primária: nada impede linhas repetidas, e a replicação lógica não replica as atualizações e as exclusões delas.`;
}

function comEstatisticasJuntas(situacao: SituacaoTabela, tabela: TabelaDTO, frase: string): string {
  if (situacao !== 'PRECISA_VACUUM' || !situacoesDaTabela(tabela).includes('ESTATISTICAS_DESATUALIZADAS')) return frase;
  return `${frase} As estatísticas também estão desatualizadas, e um VACUUM (ANALYZE) resolve as duas coisas.`;
}

export function pontosDeAtencaoTabelas(tabelas: TabelaDTO[], contexto: ContextoDasTabelas): PontoDeAtencaoTabela[] {
  const porTamanho = ordenarTabelas(tabelas, 'TAMANHO', 'DESC');

  return situacoesTabela.flatMap((situacao): PontoDeAtencaoTabela[] => {
    const daSituacao = porTamanho.filter((tabela) => {
      const situacoes = situacoesDaTabela(tabela);
      if (situacao === 'ESTATISTICAS_DESATUALIZADAS' && situacoes.includes('PRECISA_VACUUM')) return false;
      return situacoes.includes(situacao);
    });
    const tom = tomDaSituacao(situacao);

    if (daSituacao.length > MAXIMO_DE_PONTOS_SEPARADOS) {
      return [
        {
          tipo: situacao,
          tom,
          tabela: null,
          titulo: tituloDoGrupo[situacao](formatarNumero(daSituacao.length)),
          texto: fraseDoGrupo(situacao, daSituacao),
          alvo: { tipo: 'FILTRO', situacao },
        },
      ];
    }

    return daSituacao.map((tabela) => ({
      tipo: situacao,
      tom,
      tabela: { esquema: tabela.esquema, nome: tabela.nome },
      titulo: null,
      texto: comEstatisticasJuntas(situacao, tabela, fraseDaSituacao(situacao, tabela, contexto)),
      alvo: { tipo: 'TABELA', id: tabela.id },
    }));
  });
}

export function avisosDaTabela(tabela: TabelaDTO, contexto: ContextoDasTabelas): AvisoDaTabela[] {
  const avisos = situacoesDaTabela(tabela).map((situacao) => ({
    tom: tomDaSituacao(situacao),
    texto: fraseDaSituacao(situacao, tabela, contexto),
  }));
  if (autovacuumDesligado(tabela) && !situacoesDaTabela(tabela).includes('PRECISA_VACUUM')) {
    avisos.push({
      tom: 'aviso',
      texto: 'O autovacuum está desligado nesta tabela: nem o VACUUM nem o ANALYZE automáticos rodam nela.',
    });
  }
  return avisos;
}

export function comandoDaTabela(tabela: TabelaDTO): ComandoDaTabela | null {
  const situacoes = situacoesDaTabela(tabela);
  if (situacoes.includes('IDADE_ALTA')) {
    const alvos = particoesComIdadeAlta(tabela);
    const comandos = alvos.length > 0 ? alvos.map((particao) => `VACUUM (FREEZE) ${particao.id};`) : [`VACUUM (FREEZE) ${tabela.id};`];
    return {
      rotulo: alvos.length === 1 ? 'Comando que congela a partição' : 'Comando que congela a tabela',
      comando: comandos.join('\n'),
      explicacao:
        'Congela as linhas antigas agora, na hora que você escolher, e devolve a idade para perto de zero. Ele lê tudo e gera muita escrita em disco: rode fora do horário de pico. O Orynt não executa nada no banco.',
    };
  }
  if (situacoes.includes('PRECISA_VACUUM')) {
    return {
      rotulo: 'Comando que limpa a tabela',
      comando: `VACUUM (ANALYZE) ${tabela.id};`,
      explicacao: autovacuumDesligado(tabela)
        ? 'Libera o espaço das linhas mortas para novas gravações e atualiza as estatísticas, sem bloquear leituras nem gravações. Não devolve espaço ao disco. Para o autovacuum voltar a cuidar da tabela, rode também ALTER TABLE com RESET (autovacuum_enabled). O Orynt não executa nada no banco.'
        : 'Libera o espaço das linhas mortas para novas gravações e atualiza as estatísticas, sem bloquear leituras nem gravações. Não devolve espaço ao disco. O Orynt não executa nada no banco.',
    };
  }
  if (situacoes.includes('ESTATISTICAS_DESATUALIZADAS')) {
    return {
      rotulo: 'Comando que atualiza as estatísticas',
      comando: `ANALYZE ${tabela.id};`,
      explicacao:
        'Lê uma amostra da tabela e atualiza as estatísticas do planejador. É rápido e não bloqueia leituras nem gravações. O Orynt não executa nada no banco.',
    };
  }
  return null;
}

export function comandosDaSituacao(tabela: TabelaDTO, situacao: SituacaoTabela): string[] {
  if (!situacoesDaTabela(tabela).includes(situacao)) return [];
  if (situacao === 'LIDA_INTEIRA') return tabela.indicesSugeridos.map((sugestao) => sugestao.comando);
  if (situacao === 'SEM_CHAVE_PRIMARIA') return [];
  if (situacao === 'IDADE_ALTA') return comandoDaTabela(tabela)?.comando.split('\n') ?? [];
  if (situacao === 'PRECISA_VACUUM') return [`VACUUM (ANALYZE) ${tabela.id};`];
  return [situacoesDaTabela(tabela).includes('PRECISA_VACUUM') ? `VACUUM (ANALYZE) ${tabela.id};` : `ANALYZE ${tabela.id};`];
}

export function loteDeComandosDasTabelas(tabelas: TabelaDTO[], situacao: SituacaoTabela): LoteDeComandos | null {
  const comandos = [...new Set(tabelas.flatMap((tabela) => comandosDaSituacao(tabela, situacao)))];
  if (comandos.length === 0) return null;
  const quantidade = formatarNumero(comandos.length);
  return {
    comandos,
    rotulo: comandos.length === 1 ? 'Copiar o comando' : `Copiar os ${quantidade} comandos`,
    descricao:
      comandos.length === 1
        ? 'Copiar o comando da tabela da lista'
        : `Copiar os ${quantidade} comandos das tabelas da lista, um por linha`,
  };
}

export interface ResumoDoCrescimento {
  dias: number;
  tamanhoInicial: number;
  tamanhoFinal: number;
  variacaoBytes: number;
  variacaoTamanho: number | null;
  linhasIniciais: number;
  linhasFinais: number;
  variacaoLinhas: number;
}

export function resumirCrescimento(tabela: TabelaDTO): ResumoDoCrescimento | null {
  const primeiro = tabela.crescimento[0];
  const ultimo = tabela.crescimento.at(-1);
  if (!primeiro || !ultimo || tabela.crescimento.length < 2) return null;
  return {
    dias: tabela.crescimento.length - 1,
    tamanhoInicial: primeiro.tamanhoBytes,
    tamanhoFinal: ultimo.tamanhoBytes,
    variacaoBytes: ultimo.tamanhoBytes - primeiro.tamanhoBytes,
    variacaoTamanho: primeiro.tamanhoBytes > 0 ? (ultimo.tamanhoBytes - primeiro.tamanhoBytes) / primeiro.tamanhoBytes : null,
    linhasIniciais: primeiro.linhas,
    linhasFinais: ultimo.linhas,
    variacaoLinhas: ultimo.linhas - primeiro.linhas,
  };
}

export function fraseDoCrescimento(tabela: TabelaDTO): string {
  const resumo = resumirCrescimento(tabela);
  if (!resumo) return 'Ainda não há medidas suficientes para mostrar o crescimento.';
  const periodo = `nos últimos ${formatarNumero(resumo.dias)} dias`;
  if (resumo.variacaoBytes === 0 && resumo.variacaoLinhas === 0) return `O tamanho e o número de linhas não mudaram ${periodo}.`;
  const tamanho =
    resumo.variacaoBytes === 0
      ? 'manteve o tamanho'
      : `${resumo.variacaoBytes > 0 ? 'cresceu' : 'diminuiu'} ${formatarTamanho(Math.abs(resumo.variacaoBytes))}`;
  const linhasDaVariacao =
    resumo.variacaoLinhas === 0
      ? 'com o mesmo número de linhas'
      : `com ${formatarQuantidade(Math.abs(resumo.variacaoLinhas))} ${pluralizar(Math.abs(resumo.variacaoLinhas), 'linha', 'linhas')} a ${resumo.variacaoLinhas > 0 ? 'mais' : 'menos'}`;
  const inchaco =
    resumo.variacaoBytes > 0 && resumo.variacaoLinhas <= 0
      ? ' O espaço cresceu sem novas linhas: são linhas mortas que nenhum VACUUM limpou.'
      : '';
  return `A tabela ${tamanho} ${periodo}, ${linhasDaVariacao}.${inchaco}`;
}

export interface DescricaoDoAjuste {
  rotulo: string;
  efeito: string;
}

const rotuloDoParametro: Record<string, string> = {
  autovacuum_enabled: 'Autovacuum',
  autovacuum_vacuum_scale_factor: 'VACUUM automático a partir de',
  autovacuum_analyze_scale_factor: 'ANALYZE automático a partir de',
  autovacuum_freeze_max_age: 'Limite de congelamento',
  autovacuum_vacuum_cost_limit: 'Limite de custo do VACUUM',
};

function fatorEmPercentual(valor: string): string {
  const numero = Number(valor);
  return Number.isFinite(numero) ? percentual(numero) : valor;
}

export function descreverAjuste(ajuste: AjusteAutovacuumDTO): DescricaoDoAjuste {
  const rotulo = rotuloDoParametro[ajuste.parametro] ?? ajuste.parametro;
  if (ajuste.parametro === 'autovacuum_enabled') {
    return {
      rotulo,
      efeito:
        ajuste.valor === 'false'
          ? 'Desligado nesta tabela. Ligado no resto do servidor.'
          : 'Ligado nesta tabela.',
    };
  }
  if (ajuste.parametro === 'autovacuum_vacuum_scale_factor') {
    return {
      rotulo,
      efeito: `${fatorEmPercentual(ajuste.valor)} de linhas mortas. O padrão do servidor é ${fatorEmPercentual(ajuste.padrao)}.`,
    };
  }
  if (ajuste.parametro === 'autovacuum_analyze_scale_factor') {
    return {
      rotulo,
      efeito: `${fatorEmPercentual(ajuste.valor)} de linhas alteradas. O padrão do servidor é ${fatorEmPercentual(ajuste.padrao)}.`,
    };
  }
  return { rotulo, efeito: `${ajuste.valor}. O padrão do servidor é ${ajuste.padrao}.` };
}

export function comandoQueRestauraOsAjustes(tabela: TabelaDTO): string | null {
  if (tabela.autovacuum.length === 0) return null;
  return `ALTER TABLE ${tabela.id} RESET (${tabela.autovacuum.map((ajuste) => ajuste.parametro).join(', ')});`;
}

export function descreverLeitura(etapa: string, leiturasPorExecucao: number): string {
  const vezes = leiturasPorExecucao === 1 ? 'uma vez por execução' : `${formatarNumero(leiturasPorExecucao)} vezes por execução`;
  return etapa === 'Seq Scan' ? `lê a tabela inteira ${vezes}` : `lê pelo índice ${vezes}`;
}

export interface EscalaDoCrescimento {
  unidade: string;
  divisor: number;
  casas: number;
  marcas: number[];
}

const unidadesDeTamanho: [divisor: number, unidade: string][] = [
  [1024 ** 3, 'GB'],
  [1024 ** 2, 'MB'],
  [1024, 'kB'],
];
const PASSOS_REDONDOS = [1, 2, 2.5, 5, 10];
const DIVISOES_DO_EIXO = 3;
const AMPLITUDE_MINIMA = 0.02;

export function escalaDoCrescimento(valores: number[]): EscalaDoCrescimento {
  const maximoEmBytes = Math.max(0, ...valores);
  const [divisor, unidade] = unidadesDeTamanho.find(([limite]) => maximoEmBytes >= limite) ?? [1, 'B'];
  const emUnidade = valores.map((valor) => valor / divisor);
  const minimo = Math.min(...emUnidade);
  const maximo = Math.max(...emUnidade);
  const amplitude = Math.max(maximo - minimo, maximo * AMPLITUDE_MINIMA, 1e-6);
  const passoBruto = amplitude / DIVISOES_DO_EIXO;
  const grandeza = 10 ** Math.floor(Math.log10(passoBruto));
  const passo = (PASSOS_REDONDOS.find((candidato) => candidato * grandeza >= passoBruto) ?? 10) * grandeza;
  const inicio = Math.max(0, Math.floor(minimo / passo) * passo);
  const fim = Math.max(inicio + passo, Math.ceil(maximo / passo) * passo);
  const quantidade = Math.round((fim - inicio) / passo);
  const casas = [0, 1, 2, 3].find((candidata) => Number.isInteger(Math.round(passo * 10 ** (candidata + 6)) / 10 ** 6)) ?? 3;
  return {
    unidade,
    divisor,
    casas,
    marcas: Array.from({ length: quantidade + 1 }, (_, indice) => Math.round((inicio + indice * passo) * divisor)),
  };
}

const tiposCurtos: Record<string, string> = {
  'timestamp with time zone': 'timestamptz',
  'timestamp without time zone': 'timestamp',
  'time with time zone': 'timetz',
  'character varying': 'varchar',
  'double precision': 'float8',
};

export function tipoCurto(tipo: string): string {
  const [base = tipo, resto = ''] = /^([a-z ]+?)(\(.*\)|\[\])?$/.exec(tipo)?.slice(1) ?? [];
  return `${tiposCurtos[base] ?? base}${resto}`;
}

function juntarComE(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} e ${partes.at(-1) ?? ''}`;
}

export function composicaoDasGravacoes(tabela: TabelaDTO): string | null {
  const partes = [
    tabela.insercoes > 0 ? `${formatarNumero(tabela.insercoes)} ${pluralizar(tabela.insercoes, 'inserção', 'inserções')}` : null,
    tabela.atualizacoes > 0
      ? `${formatarNumero(tabela.atualizacoes)} ${pluralizar(tabela.atualizacoes, 'atualização', 'atualizações')} (${formatarNumero(tabela.atualizacoesHot)} HOT)`
      : null,
    tabela.exclusoes > 0 ? `${formatarNumero(tabela.exclusoes)} ${pluralizar(tabela.exclusoes, 'exclusão', 'exclusões')}` : null,
  ].filter((parte): parte is string => parte !== null);
  return partes.length > 0 ? juntarComE(partes) : null;
}
