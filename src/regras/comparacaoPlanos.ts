import type { PlanoExecucaoDTO, VersaoPlanoDTO } from '@/modelos/planos';
import { formatarDecimal, formatarDuracaoMs, formatarNumero, formatarPercentual, formatarTamanho, pluralizar } from '@/utilitarios/formatacao';
import type { TomDestaque } from './destaquesRelatorio';
import { BYTES_POR_BLOCO, linhasDoPlano, linhasLidas, nomeDoNo, variacaoEntreVersoes } from './planoExecucao';

export interface LadoDaComparacao {
  plano: PlanoExecucaoDTO;
  versao: VersaoPlanoDTO;
  rotulo: string;
}

export type TipoFraseDaComparacao = 'TEMPO' | 'ACESSO' | 'LEITURA' | 'IGUAIS';

export interface FraseDaComparacao {
  tipo: TipoFraseDaComparacao;
  tom: TomDestaque;
  texto: string;
}

export type SentidoFavoravel = 'ALTA' | 'QUEDA';

export interface MedidaComparada {
  rotulo: string;
  principal: string;
  base: string;
  variacao: number | null;
  razao: number | null;
  favoravel: SentidoFavoravel | null;
}

export interface AcessoATabela {
  descricao: string;
  nos: number[];
}

const VARIACAO_DESPREZIVEL = 5;
export const RAZAO_EM_VEZES = 10;
const DIFERENCA_DE_LEITURA_RELEVANTE = 0.1;

function minuscula(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

function variacao(principal: number, base: number): number | null {
  if (base <= 0) return null;
  return Math.round(((principal - base) / base) * 1000) / 10;
}

export function acessosPorTabela(plano: PlanoExecucaoDTO): Map<string, AcessoATabela> {
  const acessos = new Map<string, AcessoATabela>();
  for (const { no } of linhasDoPlano(plano)) {
    if (!no.relacao || no.tipo === 'ModifyTable') continue;
    const porBitmap = no.tipo === 'Bitmap Heap Scan' ? no.filhos.find((filho) => filho.tipo === 'Bitmap Index Scan') : undefined;
    const indice = no.indice ?? porBitmap?.indice ?? null;
    const descricao = indice ? `${nomeDoNo(no)} pelo índice ${indice}` : nomeDoNo(no);
    const nos = porBitmap ? [no.id, porBitmap.id] : [no.id];
    const anterior = acessos.get(no.relacao);
    acessos.set(
      no.relacao,
      anterior ? { descricao: `${anterior.descricao} e ${descricao}`, nos: [...anterior.nos, ...nos] } : { descricao, nos },
    );
  }
  return acessos;
}

function tabelasAlteradas(principal: PlanoExecucaoDTO, base: PlanoExecucaoDTO): string[] {
  const deUm = acessosPorTabela(principal);
  const deOutro = acessosPorTabela(base);
  return [...new Set([...deUm.keys(), ...deOutro.keys()])].filter(
    (tabela) => deUm.get(tabela)?.descricao !== deOutro.get(tabela)?.descricao,
  );
}

export function etapasAlteradas(principal: PlanoExecucaoDTO, base: PlanoExecucaoDTO): { principal: number[]; base: number[] } {
  const tabelas = tabelasAlteradas(principal, base);
  const ids = (plano: PlanoExecucaoDTO) => {
    const acessos = acessosPorTabela(plano);
    return tabelas.flatMap((tabela) => acessos.get(tabela)?.nos ?? []);
  };
  return { principal: ids(principal), base: ids(base) };
}

export function linhasLidasDasTabelas(plano: PlanoExecucaoDTO): number {
  return linhasDoPlano(plano)
    .map(({ no }) => no)
    .filter((no) => no.relacao && no.tipo !== 'ModifyTable')
    .reduce((soma, no) => soma + linhasLidas(no), 0);
}

function blocosLidos(plano: PlanoExecucaoDTO): number {
  return plano.raiz.buffers.emCache + plano.raiz.buffers.lidos;
}

function assinatura(plano: PlanoExecucaoDTO): string {
  return linhasDoPlano(plano)
    .map(({ no, profundidade }) => `${profundidade}:${nomeDoNo(no)}:${no.relacao ?? ''}:${no.indice ?? ''}`)
    .join('|');
}

function fraseDoTempo(principal: LadoDaComparacao, base: LadoDaComparacao): FraseDaComparacao | null {
  const diferenca = variacaoEntreVersoes(principal.versao, base.versao);
  if (diferenca === null) return null;
  const um = minuscula(principal.rotulo);
  const outro = minuscula(base.rotulo);
  const tempoDeUm = formatarDuracaoMs(principal.versao.tempoMedioMs);
  const tempoDeOutro = formatarDuracaoMs(base.versao.tempoMedioMs);

  if (Math.abs(diferenca) < VARIACAO_DESPREZIVEL) {
    return {
      tipo: 'TEMPO',
      tom: 'neutro',
      texto: `O ${um} e o ${outro} têm praticamente o mesmo tempo médio: ${tempoDeUm} e ${tempoDeOutro}.`,
    };
  }
  const sentido = diferenca > 0 ? 'a mais' : 'a menos';
  return {
    tipo: 'TEMPO',
    tom: diferenca > 0 ? 'atencao' : 'positivo',
    texto: `O ${um} leva ${tempoDeUm} em média, ${formatarPercentual(Math.abs(diferenca))} ${sentido} que o ${outro}, com ${tempoDeOutro}.`,
  };
}

function frasesDeAcesso(principal: LadoDaComparacao, base: LadoDaComparacao): FraseDaComparacao[] {
  const deUm = acessosPorTabela(principal.plano);
  const deOutro = acessosPorTabela(base.plano);
  const um = minuscula(principal.rotulo);
  const outro = minuscula(base.rotulo);

  return tabelasAlteradas(principal.plano, base.plano).map((tabela) => {
    const acessoDeUm = deUm.get(tabela)?.descricao;
    const acessoDeOutro = deOutro.get(tabela)?.descricao;
    const deUmNaFrase = acessoDeUm ? `o ${um} faz ${acessoDeUm}` : `o ${um} não lê a tabela`;
    const deOutroNaFrase = acessoDeOutro ? `o ${outro}, ${acessoDeOutro}` : `o ${outro} não lê a tabela`;
    return { tipo: 'ACESSO', tom: 'neutro', texto: `Em ${tabela}, ${deUmNaFrase} e ${deOutroNaFrase}.` };
  });
}

function fraseDeLeitura(principal: LadoDaComparacao, base: LadoDaComparacao): FraseDaComparacao | null {
  const deUm = linhasLidasDasTabelas(principal.plano);
  const deOutro = linhasLidasDasTabelas(base.plano);
  const maior = Math.max(deUm, deOutro);
  if (maior === 0 || Math.abs(deUm - deOutro) / maior < DIFERENCA_DE_LEITURA_RELEVANTE) return null;
  return {
    tipo: 'LEITURA',
    tom: deUm > deOutro ? 'atencao' : 'positivo',
    texto:
      `O ${minuscula(principal.rotulo)} lê ${formatarNumero(deUm)} ${pluralizar(deUm, 'linha', 'linhas')} das tabelas a ` +
      `cada execução, contra ${formatarNumero(deOutro)} no ${minuscula(base.rotulo)}.`,
  };
}

export function frasesDaComparacao(principal: LadoDaComparacao, base: LadoDaComparacao): FraseDaComparacao[] {
  const acessos = frasesDeAcesso(principal, base);
  const frases = [fraseDoTempo(principal, base), ...acessos, fraseDeLeitura(principal, base)].filter(
    (frase): frase is FraseDaComparacao => frase !== null,
  );
  if (acessos.length > 0) return frases;

  const mesmasEtapas = assinatura(principal.plano) === assinatura(base.plano);
  return [
    ...frases,
    {
      tipo: 'IGUAIS',
      tom: 'neutro',
      texto: mesmasEtapas
        ? 'Os dois planos têm as mesmas etapas: a diferença de tempo vem da carga do banco ou dos dados, não do plano.'
        : 'Os dois planos leem as tabelas do mesmo jeito: a diferença está na ordem das etapas ou na forma de juntar as linhas.',
    },
  ];
}

export function medidasDaComparacao(principal: LadoDaComparacao, base: LadoDaComparacao): MedidaComparada[] {
  const medida = (
    rotulo: string,
    valorPrincipal: number,
    valorBase: number,
    formatar: (valor: number) => string,
    favoravel: SentidoFavoravel | null,
  ): MedidaComparada => ({
    rotulo,
    principal: formatar(valorPrincipal),
    base: formatar(valorBase),
    variacao: variacao(valorPrincipal, valorBase),
    razao: valorBase > 0 ? valorPrincipal / valorBase : null,
    favoravel,
  });
  const tamanho = (blocos: number) => formatarTamanho(blocos * BYTES_POR_BLOCO);
  const etapas = (plano: PlanoExecucaoDTO) => linhasDoPlano(plano).length;

  return [
    medida('Tempo médio nos 30 dias', principal.versao.tempoMedioMs, base.versao.tempoMedioMs, formatarDuracaoMs, 'QUEDA'),
    medida('Execuções nos 30 dias', principal.versao.quantidadeExecucoes, base.versao.quantidadeExecucoes, formatarNumero, null),
    medida('Tempo da execução registrada', principal.plano.tempoExecucaoMs, base.plano.tempoExecucaoMs, formatarDuracaoMs, 'QUEDA'),
    medida(
      'Tempo de planejamento',
      principal.plano.tempoPlanejamentoMs,
      base.plano.tempoPlanejamentoMs,
      (valor) => (valor < 10 ? `${formatarDecimal(valor, 2)} ms` : formatarDuracaoMs(valor)),
      'QUEDA',
    ),
    medida('Linhas lidas das tabelas', linhasLidasDasTabelas(principal.plano), linhasLidasDasTabelas(base.plano), formatarNumero, 'QUEDA'),
    medida('Dados lidos', blocosLidos(principal.plano), blocosLidos(base.plano), tamanho, 'QUEDA'),
    medida('Etapas', etapas(principal.plano), etapas(base.plano), formatarNumero, null),
  ];
}
