import type { PeriodoDashboard } from '@/modelos/dashboard';
import type {
  BuffersPlanoDTO,
  CondicaoPlanoDTO,
  EstrategiaAgregacao,
  MetodoOrdenacao,
  NoPlanoDTO,
  OperacaoPlano,
  PlanoExecucaoDTO,
  SelecaoPlano,
  SugestaoIndiceDTO,
  TipoCondicaoPlano,
  TipoJuncaoPlano,
  VersaoPlanoDTO,
} from '@/modelos/planos';
import { formatarDuracaoMs, formatarHorario, formatarNumero, formatarPercentual, formatarTamanho, pluralizar } from '@/utilitarios/formatacao';
import type { TomDestaque } from './destaquesRelatorio';
import { lerIdDaConsulta } from './historicoConsulta';
import { dataPorExtenso } from './periodoRelatorio';

export const PERIODO_DOS_PLANOS: PeriodoDashboard = 'ULTIMOS_30_DIAS';

export const selecaoInicialDoPlano: SelecaoPlano = { consulta: null, versao: null, comparacao: null };

export const BYTES_POR_BLOCO = 8192;

const LINHAS_DE_TABELA_GRANDE = 10_000;
const PARTE_DESCARTADA_RELEVANTE = 0.9;
const LINHAS_DESCARTADAS_RELEVANTES = 1_000;
const ERRO_DE_ESTIMATIVA_RELEVANTE = 10;
const LINHAS_DE_ESTIMATIVA_RELEVANTE = 100;
const LACOS_RELEVANTES = 1_000;
const MAXIMO_DE_VARREDURAS = 2;
const BYTES_POR_KB = 1024;
const RECUO_DO_DETALHE_NA_RAIZ = 2;
const RECUO_POR_NIVEL = 6;

export type GuiaDaArvore = 'VAZIA' | 'LINHA' | 'RAMO' | 'ULTIMO';

export interface LinhaDoPlano {
  no: NoPlanoDTO;
  profundidade: number;
  guias: GuiaDaArvore[];
  idDoPai: number | null;
  abaixoDeLimite: boolean;
  tempoProprioMs: number;
  parteDoTempo: number;
}

export type TipoAchado = 'ETAPA' | 'VARREDURA' | 'FILTRO' | 'ESTIMATIVA' | 'DISCO' | 'LACO' | 'SAUDAVEL';

export interface Achado {
  tipo: TipoAchado;
  tom: TomDestaque;
  texto: string;
  no: number | null;
}

const nomeDaJuncao: Record<Exclude<TipoJuncaoPlano, 'INNER'>, string> = {
  LEFT: 'Left',
  RIGHT: 'Right',
  FULL: 'Full',
  SEMI: 'Semi',
  ANTI: 'Anti',
};

const juncaoNoJson: Record<TipoJuncaoPlano, string> = {
  INNER: 'Inner',
  LEFT: 'Left',
  RIGHT: 'Right',
  FULL: 'Full',
  SEMI: 'Semi',
  ANTI: 'Anti',
};

const nomeDaAgregacao: Record<EstrategiaAgregacao, string> = {
  SIMPLES: 'Aggregate',
  ORDENADA: 'GroupAggregate',
  HASH: 'HashAggregate',
};

const estrategiaNoJson: Record<EstrategiaAgregacao, string> = {
  SIMPLES: 'Plain',
  ORDENADA: 'Sorted',
  HASH: 'Hashed',
};

const nomeDaOperacao: Record<OperacaoPlano, string> = {
  INSERT: 'Insert',
  UPDATE: 'Update',
  DELETE: 'Delete',
};

const condicaoNoExplain: Record<TipoCondicaoPlano, string> = {
  CHAVE_ORDENACAO: 'Sort Key',
  CHAVE_AGRUPAMENTO: 'Group Key',
  CONDICAO_HASH: 'Hash Cond',
  CONDICAO_INDICE: 'Index Cond',
  RECHECAGEM: 'Recheck Cond',
  FILTRO_JUNCAO: 'Join Filter',
  FILTRO: 'Filter',
};

const ordemDasCondicoes: TipoCondicaoPlano[] = [
  'CHAVE_ORDENACAO',
  'CHAVE_AGRUPAMENTO',
  'CONDICAO_HASH',
  'CONDICAO_INDICE',
  'RECHECAGEM',
  'FILTRO_JUNCAO',
  'FILTRO',
];

const chavesEmLista: TipoCondicaoPlano[] = ['CHAVE_ORDENACAO', 'CHAVE_AGRUPAMENTO'];

const metodoNoExplain: Record<MetodoOrdenacao, string> = {
  QUICKSORT: 'quicksort',
  TOP_N_HEAPSORT: 'top-N heapsort',
  EXTERNAL_MERGE: 'external merge',
};

export const rotuloDaCondicao: Record<TipoCondicaoPlano, string> = {
  CHAVE_ORDENACAO: 'Ordena por',
  CHAVE_AGRUPAMENTO: 'Agrupa por',
  CONDICAO_HASH: 'Junta por',
  CONDICAO_INDICE: 'Busca no índice',
  RECHECAGEM: 'Confere na tabela',
  FILTRO_JUNCAO: 'Filtro da junção',
  FILTRO: 'Filtro',
};

export const rotuloDoMetodo: Record<MetodoOrdenacao, string> = {
  QUICKSORT: 'Quicksort, em memória',
  TOP_N_HEAPSORT: 'Top-N heapsort, só as primeiras linhas',
  EXTERNAL_MERGE: 'External merge, em disco',
};

const explicacoes: Record<string, string> = {
  'Seq Scan': 'Lê a tabela inteira, linha por linha, e aplica o filtro a cada uma.',
  'Index Scan': 'Procura as linhas no índice e lê cada uma na tabela.',
  'Index Only Scan': 'Responde só com o índice, sem precisar ler a tabela.',
  'Bitmap Index Scan': 'Marca no índice as páginas da tabela que têm linhas da condição.',
  'Bitmap Heap Scan': 'Lê da tabela só as páginas marcadas pelo índice e confere cada linha.',
  'Nested Loop': 'Para cada linha da primeira entrada, procura as correspondentes na segunda.',
  'Hash Join': 'Guarda uma entrada numa tabela hash em memória e percorre a outra procurando os pares.',
  'Merge Join': 'Percorre as duas entradas já ordenadas, juntando as linhas que combinam.',
  Hash: 'Monta em memória a tabela hash usada pela junção acima.',
  Sort: 'Ordena as linhas antes de passá-las adiante.',
  Limit: 'Para de pedir linhas assim que tem as que a consulta pediu.',
  Result: 'Calcula os valores sem ler nenhuma tabela.',
  Materialize: 'Guarda as linhas em memória para lê-las de novo sem refazer o trabalho.',
  Gather: 'Junta as linhas produzidas pelos processos que trabalham em paralelo.',
};

const explicacoesDaAgregacao: Record<EstrategiaAgregacao, string> = {
  SIMPLES: 'Calcula a agregação sobre todas as linhas que recebe.',
  ORDENADA: 'Agrupa as linhas já ordenadas e calcula a agregação de cada grupo.',
  HASH: 'Agrupa as linhas numa tabela hash em memória e calcula a agregação de cada grupo.',
};

const explicacoesDaOperacao: Record<OperacaoPlano, string> = {
  INSERT: 'Grava as linhas novas na tabela e nos índices dela.',
  UPDATE: 'Grava a nova versão de cada linha encontrada abaixo.',
  DELETE: 'Marca como apagadas as linhas encontradas abaixo.',
};

export function lerSelecaoDoPlano(valor: unknown): SelecaoPlano {
  if (!valor || typeof valor !== 'object') return selecaoInicialDoPlano;
  const guardado = valor as Record<string, unknown>;
  const consulta = lerIdDaConsulta(guardado.consulta);
  if (consulta === null) return selecaoInicialDoPlano;
  const versao = lerIdDaConsulta(guardado.versao);
  const comparacao = lerIdDaConsulta(guardado.comparacao);
  return { consulta, versao, comparacao: comparacao === versao ? null : comparacao };
}

export function estadoDoPlano(
  consulta: string,
  versao: string | null = null,
  comparacao: string | null = null,
): { plano: SelecaoPlano } {
  return { plano: { consulta, versao, comparacao } };
}

export function nomeDoNo(no: NoPlanoDTO): string {
  if (no.tipo === 'ModifyTable' && no.operacao) return nomeDaOperacao[no.operacao];
  if (no.tipo === 'Aggregate' && no.estrategia) return nomeDaAgregacao[no.estrategia];
  if (no.juncao && no.juncao !== 'INNER') {
    const juncao = nomeDaJuncao[no.juncao];
    return no.tipo === 'Nested Loop' ? `Nested Loop ${juncao} Join` : no.tipo.replace(/ Join$/, ` ${juncao} Join`);
  }
  return no.sentidoInverso ? `${no.tipo} Backward` : no.tipo;
}

export function descreverNo(no: NoPlanoDTO): string {
  const alvo = no.relacao ?? no.indice;
  return alvo ? `${nomeDoNo(no)} em ${alvo}` : nomeDoNo(no);
}

export function alvoDoNo(no: NoPlanoDTO): string | null {
  const tabela = no.relacao && no.apelido && no.apelido !== no.relacao ? `${no.relacao} ${no.apelido}` : no.relacao;
  const partes = [tabela, no.indice ? `índice ${no.indice}` : null].filter((parte): parte is string => Boolean(parte));
  return partes.length > 0 ? partes.join(' · ') : null;
}

const prioridadeNaLinha: TipoCondicaoPlano[] = [
  'CONDICAO_HASH',
  'CONDICAO_INDICE',
  'FILTRO',
  'CHAVE_ORDENACAO',
  'CHAVE_AGRUPAMENTO',
  'FILTRO_JUNCAO',
  'RECHECAGEM',
];

export function condicaoPrincipal(no: NoPlanoDTO): { rotulo: string; expressao: string } | null {
  for (const tipo of prioridadeNaLinha) {
    const expressoes = no.condicoes.filter((condicao) => condicao.tipo === tipo).map((condicao) => condicao.expressao);
    if (expressoes.length > 0) return { rotulo: rotuloDaCondicao[tipo], expressao: expressoes.join(', ') };
  }
  return null;
}

export function explicarNo(no: NoPlanoDTO): string {
  if (no.tipo === 'ModifyTable' && no.operacao) return explicacoesDaOperacao[no.operacao];
  if (no.tipo === 'Aggregate' && no.estrategia) return explicacoesDaAgregacao[no.estrategia];
  return explicacoes[no.tipo] ?? 'Etapa do plano do PostgreSQL.';
}

export function tempoDoNoMs(no: NoPlanoDTO): number {
  return no.tempoTotalMs * no.lacos;
}

export function tempoProprioMs(no: NoPlanoDTO): number {
  const dosFilhos = no.filhos.reduce((soma, filho) => soma + tempoDoNoMs(filho), 0);
  return Math.max(0, tempoDoNoMs(no) - dosFilhos);
}

export function linhasDevolvidas(no: NoPlanoDTO): number {
  return no.linhasReais * no.lacos;
}

export function linhasEsperadas(no: NoPlanoDTO): number {
  return no.linhasEstimadas * no.lacos;
}

export function linhasDescartadas(no: NoPlanoDTO): number {
  return (no.linhasRemovidasPeloFiltro ?? 0) * no.lacos;
}

export function linhasLidas(no: NoPlanoDTO): number {
  return linhasDevolvidas(no) + linhasDescartadas(no);
}

export function fatorDaEstimativa(no: NoPlanoDTO): number {
  const maior = Math.max(no.linhasEstimadas, no.linhasReais);
  const menor = Math.max(1, Math.min(no.linhasEstimadas, no.linhasReais));
  return maior < 1 ? 1 : maior / menor;
}

export function estimativaErrada(no: NoPlanoDTO, abaixoDeLimite = false): boolean {
  if (abaixoDeLimite && no.linhasReais < no.linhasEstimadas) return false;
  return fatorDaEstimativa(no) >= ERRO_DE_ESTIMATIVA_RELEVANTE;
}

export function buffersProprios(no: NoPlanoDTO): BuffersPlanoDTO {
  const menos = (campo: keyof BuffersPlanoDTO) =>
    Math.max(0, no.buffers[campo] - no.filhos.reduce((soma, filho) => soma + filho.buffers[campo], 0));
  return {
    emCache: menos('emCache'),
    lidos: menos('lidos'),
    temporariosLidos: menos('temporariosLidos'),
    temporariosEscritos: menos('temporariosEscritos'),
  };
}

export function tamanhoDosBlocos(blocos: number): string {
  return formatarTamanho(blocos * BYTES_POR_BLOCO);
}

export function kbEmDisco(no: NoPlanoDTO): number {
  if (no.ordenacao?.emDisco) return no.ordenacao.espacoKb;
  if (no.memoria?.discoKb) return no.memoria.discoKb;
  return (buffersProprios(no).temporariosEscritos * BYTES_POR_BLOCO) / BYTES_POR_KB;
}

export function linhasDoPlano(plano: PlanoExecucaoDTO): LinhaDoPlano[] {
  const linhas: LinhaDoPlano[] = [];
  const total = plano.tempoExecucaoMs;

  const visitar = (
    no: NoPlanoDTO,
    profundidade: number,
    continuacoes: boolean[],
    ultimo: boolean,
    idDoPai: number | null,
    abaixoDeLimite: boolean,
  ) => {
    const guias: GuiaDaArvore[] =
      profundidade === 0 ? [] : [...continuacoes.map((continua): GuiaDaArvore => (continua ? 'LINHA' : 'VAZIA')), ultimo ? 'ULTIMO' : 'RAMO'];
    const proprio = tempoProprioMs(no);
    linhas.push({
      no,
      profundidade,
      guias,
      idDoPai,
      abaixoDeLimite,
      tempoProprioMs: proprio,
      parteDoTempo: total > 0 ? (proprio / total) * 100 : 0,
    });

    const proximas = profundidade === 0 ? [] : [...continuacoes, !ultimo];
    const filhosAbaixoDeLimite = abaixoDeLimite || no.tipo === 'Limit';
    no.filhos.forEach((filho, indice) =>
      visitar(filho, profundidade + 1, proximas, indice === no.filhos.length - 1, no.id, filhosAbaixoDeLimite),
    );
  };

  visitar(plano.raiz, 0, [], true, null, false);
  return linhas;
}

export function etapaMaisLenta(linhas: LinhaDoPlano[]): LinhaDoPlano | null {
  return linhas.reduce<LinhaDoPlano | null>(
    (maior, linha) => (linha.tempoProprioMs > (maior?.tempoProprioMs ?? -1) ? linha : maior),
    null,
  );
}

export function encontrarNo(plano: PlanoExecucaoDTO, id: number): NoPlanoDTO | null {
  return linhasDoPlano(plano).find((linha) => linha.no.id === id)?.no ?? null;
}

function parteSemArredondarParaCima(fracao: number): string {
  return formatarPercentual(Math.floor(fracao * 1000) / 10);
}

function quantasLinhas(quantidade: number): string {
  return `${formatarNumero(quantidade)} ${pluralizar(quantidade, 'linha', 'linhas')}`;
}

function vieram(quantidade: number): string {
  if (quantidade === 0) return 'não veio nenhuma';
  return quantidade === 1 ? 'veio 1' : `vieram ${formatarNumero(quantidade)}`;
}

function achadoDaEtapa(plano: PlanoExecucaoDTO, linhas: LinhaDoPlano[]): Achado | null {
  const maisLenta = etapaMaisLenta(linhas);
  if (!maisLenta) return null;
  const parte = formatarPercentual(maisLenta.parteDoTempo);
  const tempos = `${formatarDuracaoMs(maisLenta.tempoProprioMs)} de ${formatarDuracaoMs(plano.tempoExecucaoMs)}`;
  return {
    tipo: 'ETAPA',
    tom: 'neutro',
    no: maisLenta.no.id,
    texto: `${descreverNo(maisLenta.no)} é a etapa que mais pesa: ${parte} do tempo de execução, ${tempos}.`,
  };
}

function achadosDeVarredura(nos: NoPlanoDTO[]): Achado[] {
  return nos
    .filter((no) => no.tipo === 'Seq Scan' && linhasLidas(no) >= LINHAS_DE_TABELA_GRANDE)
    .sort((a, b) => linhasLidas(b) - linhasLidas(a))
    .slice(0, MAXIMO_DE_VARREDURAS)
    .map((no) => {
      const lidas = linhasLidas(no);
      const parteDescartada = linhasDescartadas(no) / lidas;
      const leitura = `${descreverNo(no)} lê a tabela inteira, ${quantasLinhas(lidas)}`;
      if (parteDescartada <= 0) return { tipo: 'VARREDURA', tom: 'neutro', no: no.id, texto: `${leitura}.` };
      return {
        tipo: 'VARREDURA',
        tom: parteDescartada >= PARTE_DESCARTADA_RELEVANTE ? 'atencao' : 'neutro',
        no: no.id,
        texto: `${leitura}, e o filtro descarta ${parteSemArredondarParaCima(parteDescartada)} delas.`,
      };
    });
}

function achadoDeFiltro(nos: NoPlanoDTO[]): Achado | null {
  const candidato = nos
    .filter((no) => {
      const descartadas = linhasDescartadas(no);
      return (
        no.tipo !== 'Seq Scan' &&
        descartadas >= LINHAS_DESCARTADAS_RELEVANTES &&
        descartadas / linhasLidas(no) >= PARTE_DESCARTADA_RELEVANTE
      );
    })
    .sort((a, b) => linhasDescartadas(b) - linhasDescartadas(a))[0];
  if (!candidato) return null;

  const pelo = candidato.indice ? ` pelo índice ${candidato.indice}` : '';
  const parte = parteSemArredondarParaCima(linhasDescartadas(candidato) / linhasLidas(candidato));
  return {
    tipo: 'FILTRO',
    tom: 'atencao',
    no: candidato.id,
    texto: `${descreverNo(candidato)} lê ${quantasLinhas(linhasLidas(candidato))}${pelo}, e o filtro descarta ${parte} delas.`,
  };
}

function achadoDeEstimativa(linhas: LinhaDoPlano[]): Achado | null {
  const candidato = linhas
    .filter(
      ({ no, abaixoDeLimite }) =>
        estimativaErrada(no, abaixoDeLimite) &&
        Math.max(linhasEsperadas(no), linhasDevolvidas(no)) >= LINHAS_DE_ESTIMATIVA_RELEVANTE,
    )
    .map(({ no }) => no)
    .sort((a, b) => fatorDaEstimativa(b) - fatorDaEstimativa(a))[0];
  if (!candidato) return null;

  const porLaco = candidato.lacos > 1 ? ' por laço' : '';
  const erro = formatarNumero(Math.round(fatorDaEstimativa(candidato)));
  return {
    tipo: 'ESTIMATIVA',
    tom: 'atencao',
    no: candidato.id,
    texto:
      `Em ${descreverNo(candidato)}, o planejador esperava ${quantasLinhas(candidato.linhasEstimadas)}${porLaco} e ` +
      `${vieram(candidato.linhasReais)}, um erro de ${erro} vezes. Estatísticas desatualizadas ou uma condição difícil ` +
      'de estimar levam o banco a escolher mal o plano.',
  };
}

function achadoDeDisco(nos: NoPlanoDTO[]): Achado | null {
  const candidato = nos.filter((no) => kbEmDisco(no) > 0).sort((a, b) => kbEmDisco(b) - kbEmDisco(a))[0];
  if (!candidato) return null;

  const tamanho = formatarTamanho(kbEmDisco(candidato) * BYTES_POR_KB);
  return {
    tipo: 'DISCO',
    tom: 'atencao',
    no: candidato.id,
    texto:
      `${descreverNo(candidato)} gravou ${tamanho} em disco por falta de memória. Aumentar o work_mem desta ` +
      'consulta mantém a operação em memória.',
  };
}

function achadoDeLaco(linhas: LinhaDoPlano[]): Achado | null {
  const candidata = linhas
    .filter((linha) => linha.no.lacos >= LACOS_RELEVANTES && linha.idDoPai !== null)
    .sort((a, b) => tempoDoNoMs(b.no) - tempoDoNoMs(a.no))[0];
  if (!candidata) return null;

  const pai = linhas.find((linha) => linha.no.id === candidata.idDoPai)?.no;
  const dentro = pai ? ` dentro de ${nomeDoNo(pai)}` : '';
  return {
    tipo: 'LACO',
    tom: 'neutro',
    no: candidata.no.id,
    texto:
      `${descreverNo(candidata.no)} é executado ${formatarNumero(candidata.no.lacos)} vezes${dentro}: cada vez custa ` +
      `pouco, mas juntas somam ${formatarDuracaoMs(tempoDoNoMs(candidata.no))}.`,
  };
}

export function diagnosticarPlano(plano: PlanoExecucaoDTO): Achado[] {
  const linhas = linhasDoPlano(plano);
  const nos = linhas.map((linha) => linha.no);
  const achados = [
    achadoDaEtapa(plano, linhas),
    ...achadosDeVarredura(nos),
    achadoDeFiltro(nos),
    achadoDeEstimativa(linhas),
    achadoDeDisco(nos),
    achadoDeLaco(linhas),
  ].filter((achado): achado is Achado => achado !== null);

  if (achados.some((achado) => achado.tom === 'atencao')) return achados;
  return [
    ...achados,
    {
      tipo: 'SAUDAVEL',
      tom: 'positivo',
      no: null,
      texto:
        'Nenhum sinal de problema: as etapas leem pouco além do que devolvem e as estimativas do planejador acertam a ' +
        'ordem de grandeza.',
    },
  ];
}

export function motivoDaSugestao(sugestao: SugestaoIndiceDTO, no: NoPlanoDTO | null): string {
  const colunas = sugestao.colunas.join(', ');
  const etapa = no ? descreverNo(no) : 'a etapa';
  return `Um índice em ${sugestao.tabela} (${colunas}) deixa ${etapa} chegar direto às linhas que interessam, sem ler as que o filtro descarta.`;
}

export function rotuloDaVersao(versao: VersaoPlanoDTO, indice: number): string {
  if (indice === 0) return 'Plano atual';
  if (indice === 1) return 'Plano anterior';
  return `Plano de ${dataPorExtenso(new Date(versao.primeiroRegistro), false)}`;
}

function diaEHora(instante: string): string {
  return `${dataPorExtenso(new Date(instante), false)}, às ${formatarHorario(instante)}`;
}

export function periodoDaVersao(versao: VersaoPlanoDTO, atual: boolean): string {
  if (atual) return `Em uso desde ${diaEHora(versao.primeiroRegistro)}`;
  return `De ${dataPorExtenso(new Date(versao.primeiroRegistro), false)} a ${diaEHora(versao.ultimoRegistro)}`;
}

export function registroDoPlano(plano: PlanoExecucaoDTO): string {
  return `Registrado em ${diaEHora(plano.registradoEm)}`;
}

export function variacaoEntreVersoes(versao: VersaoPlanoDTO, anterior: VersaoPlanoDTO | undefined): number | null {
  if (!anterior || anterior.tempoMedioMs <= 0) return null;
  return Math.round(((versao.tempoMedioMs - anterior.tempoMedioMs) / anterior.tempoMedioMs) * 1000) / 10;
}

export function descreverVersoes(versoes: VersaoPlanoDTO[]): string {
  const trocas = versoes.length - 1;
  if (trocas <= 0) return 'O plano não mudou nos últimos 30 dias';
  return `O banco trocou de plano ${trocas === 1 ? 'uma vez' : `${formatarNumero(trocas)} vezes`} nos últimos 30 dias`;
}

function fixo(valor: number, casas: number): string {
  return valor.toFixed(casas);
}

function cabecalhoNoTexto(no: NoPlanoDTO): string {
  const apelido = no.apelido && no.apelido !== no.relacao ? ` ${no.apelido}` : '';
  let alvo = '';
  if (no.indice && no.relacao) alvo = ` using ${no.indice} on ${no.relacao}${apelido}`;
  else if (no.indice) alvo = ` on ${no.indice}`;
  else if (no.relacao) alvo = ` on ${no.relacao}${apelido}`;

  const estimado = `(cost=${fixo(no.custoInicial, 2)}..${fixo(no.custoTotal, 2)} rows=${no.linhasEstimadas} width=${no.larguraBytes})`;
  const real = `(actual time=${fixo(no.tempoInicialMs, 3)}..${fixo(no.tempoTotalMs, 3)} rows=${no.linhasReais} loops=${no.lacos})`;
  return `${nomeDoNo(no)}${alvo}  ${estimado} ${real}`;
}

function condicoesEmOrdem(condicoes: CondicaoPlanoDTO[]): [TipoCondicaoPlano, string[]][] {
  return ordemDasCondicoes
    .map((tipo): [TipoCondicaoPlano, string[]] => [tipo, condicoes.filter((condicao) => condicao.tipo === tipo).map((c) => c.expressao)])
    .filter(([, expressoes]) => expressoes.length > 0);
}

function linhaDeBuffers(buffers: BuffersPlanoDTO): string | null {
  const compartilhados = [
    buffers.emCache > 0 ? `hit=${buffers.emCache}` : '',
    buffers.lidos > 0 ? `read=${buffers.lidos}` : '',
  ].filter(Boolean);
  const temporarios = [
    buffers.temporariosLidos > 0 ? `read=${buffers.temporariosLidos}` : '',
    buffers.temporariosEscritos > 0 ? `written=${buffers.temporariosEscritos}` : '',
  ].filter(Boolean);
  const partes = [
    compartilhados.length > 0 ? `shared ${compartilhados.join(' ')}` : '',
    temporarios.length > 0 ? `temp ${temporarios.join(' ')}` : '',
  ].filter(Boolean);
  return partes.length > 0 ? `Buffers: ${partes.join(', ')}` : null;
}

function detalhesNoTexto(no: NoPlanoDTO): string[] {
  const detalhes: string[] = [];
  for (const [tipo, expressoes] of condicoesEmOrdem(no.condicoes)) {
    if (chavesEmLista.includes(tipo)) detalhes.push(`${condicaoNoExplain[tipo]}: ${expressoes.join(', ')}`);
    else expressoes.forEach((expressao) => detalhes.push(`${condicaoNoExplain[tipo]}: ${expressao}`));
    if (tipo === 'FILTRO' && no.linhasRemovidasPeloFiltro !== null) {
      detalhes.push(`Rows Removed by Filter: ${no.linhasRemovidasPeloFiltro}`);
    }
  }
  if (no.ordenacao) {
    const espaco = `${no.ordenacao.emDisco ? 'Disk' : 'Memory'}: ${no.ordenacao.espacoKb}kB`;
    detalhes.push(`Sort Method: ${metodoNoExplain[no.ordenacao.metodo]}  ${espaco}`);
  }
  if (no.memoria) {
    const disco = no.memoria.discoKb ? `  Disk Usage: ${no.memoria.discoKb}kB` : '';
    detalhes.push(`Batches: ${no.memoria.lotes}  Memory Usage: ${no.memoria.memoriaKb}kB${disco}`);
  }
  const buffers = linhaDeBuffers(no.buffers);
  if (buffers) detalhes.push(buffers);
  return detalhes;
}

export function planoEmTexto(plano: PlanoExecucaoDTO): string {
  const linhas: string[] = [];

  const escrever = (no: NoPlanoDTO, profundidade: number) => {
    const recuoDoDetalhe = profundidade === 0 ? RECUO_DO_DETALHE_NA_RAIZ : RECUO_POR_NIVEL * profundidade + RECUO_DO_DETALHE_NA_RAIZ;
    const prefixo = profundidade === 0 ? '' : `${' '.repeat(recuoDoDetalhe - RECUO_POR_NIVEL)}->  `;
    linhas.push(`${prefixo}${cabecalhoNoTexto(no)}`);
    detalhesNoTexto(no).forEach((detalhe) => linhas.push(`${' '.repeat(recuoDoDetalhe)}${detalhe}`));
    no.filhos.forEach((filho) => escrever(filho, profundidade + 1));
  };

  escrever(plano.raiz, 0);
  linhas.push(`Planning Time: ${fixo(plano.tempoPlanejamentoMs, 3)} ms`);
  linhas.push(`Execution Time: ${fixo(plano.tempoExecucaoMs, 3)} ms`);
  return linhas.join('\n');
}

const tiposComDirecao = ['Index Scan', 'Index Only Scan'];

function noEmJson(no: NoPlanoDTO): Record<string, unknown> {
  const json: Record<string, unknown> = { 'Node Type': no.tipo };
  if (no.operacao) json.Operation = nomeDaOperacao[no.operacao];
  if (no.estrategia) json.Strategy = estrategiaNoJson[no.estrategia];
  if (no.juncao) json['Join Type'] = juncaoNoJson[no.juncao];
  if (tiposComDirecao.includes(no.tipo)) json['Scan Direction'] = no.sentidoInverso ? 'Backward' : 'Forward';
  if (no.indice) json['Index Name'] = no.indice;
  if (no.relacao) {
    json['Relation Name'] = no.relacao;
    json.Alias = no.apelido ?? no.relacao;
  }
  Object.assign(json, {
    'Startup Cost': no.custoInicial,
    'Total Cost': no.custoTotal,
    'Plan Rows': no.linhasEstimadas,
    'Plan Width': no.larguraBytes,
    'Actual Startup Time': no.tempoInicialMs,
    'Actual Total Time': no.tempoTotalMs,
    'Actual Rows': no.linhasReais,
    'Actual Loops': no.lacos,
  });
  for (const [tipo, expressoes] of condicoesEmOrdem(no.condicoes)) {
    json[condicaoNoExplain[tipo]] = chavesEmLista.includes(tipo) ? expressoes : expressoes.join(' AND ');
  }
  if (no.linhasRemovidasPeloFiltro !== null) json['Rows Removed by Filter'] = no.linhasRemovidasPeloFiltro;
  if (no.ordenacao) {
    Object.assign(json, {
      'Sort Method': metodoNoExplain[no.ordenacao.metodo],
      'Sort Space Used': no.ordenacao.espacoKb,
      'Sort Space Type': no.ordenacao.emDisco ? 'Disk' : 'Memory',
    });
  }
  if (no.memoria) {
    const prefixo = no.tipo === 'Hash' ? 'Hash Batches' : 'HashAgg Batches';
    json[prefixo] = no.memoria.lotes;
    json['Peak Memory Usage'] = no.memoria.memoriaKb;
    if (no.memoria.discoKb) json['Disk Usage'] = no.memoria.discoKb;
  }
  Object.assign(json, {
    'Shared Hit Blocks': no.buffers.emCache,
    'Shared Read Blocks': no.buffers.lidos,
    'Temp Read Blocks': no.buffers.temporariosLidos,
    'Temp Written Blocks': no.buffers.temporariosEscritos,
  });
  if (no.filhos.length > 0) json.Plans = no.filhos.map(noEmJson);
  return json;
}

export function planoEmJson(plano: PlanoExecucaoDTO): string {
  return JSON.stringify(
    [{ Plan: noEmJson(plano.raiz), 'Planning Time': plano.tempoPlanejamentoMs, 'Execution Time': plano.tempoExecucaoMs }],
    null,
    2,
  );
}
