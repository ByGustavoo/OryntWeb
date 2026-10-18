import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import type {
  IndiceDTO,
  ListaIndicesDTO,
  MetodoIndice,
  RestricaoIndice,
  SugestaoDeIndiceDTO,
  TabelaDoIndiceDTO,
  UsoDoIndiceDTO,
} from '@/modelos/objetos';
import type { NoPlanoDTO, PlanosConsultaDTO } from '@/modelos/planos';
import { PERIODO_DO_USO } from '@/regras/indices';
import { idDoObjeto } from '@/regras/visoes';
import { gerarConsultasDetalhadas } from './consultas';
import { gerarPlanosDaConsulta, temPlano } from './planosExecucao';
import { marcoDoDegrau } from './trocasDePlano';

type TipoDaGravacao = 'INSERCAO' | 'ATUALIZACAO';

interface TabelaFicticia {
  tipo: TabelaDoIndiceDTO['tipo'];
  esquema: string;
  nome: string;
  tamanhoBytes: number;
  linhas: number;
  gravacoes: [string, TipoDaGravacao][];
  partesHot: number;
  linhasPorAtualizacao?: [number, number];
}

type Observacao = 'DESDE_A_COLETA' | 'RECENTE' | 'DESDE_O_DEGRAU';

interface IndiceFicticio {
  nome: string;
  tabela: string;
  metodo?: MetodoIndice;
  colunas: string[];
  incluidas?: string[];
  predicado?: string;
  unico?: boolean;
  restricao?: RestricaoIndice;
  valido?: boolean;
  tamanhoBytes: number;
  observacao?: Observacao;
}

const DIAS_DE_COLETA = 47;
const HORA_DO_INICIO_DA_COLETA = 10;
const MINUTO_DO_INICIO_DA_COLETA = 12;
const DIAS_DO_INDICE_RECENTE = 5;
const HORA_DO_INDICE_RECENTE = 14;
const MINUTO_DO_INDICE_RECENTE = 3;

const KB = 1024;
const MB = 1024 * KB;

const metodoNoComando: Record<MetodoIndice, string> = {
  BTREE: 'btree',
  HASH: 'hash',
  GIN: 'gin',
  GIST: 'gist',
  SPGIST: 'spgist',
  BRIN: 'brin',
};

export const tabelasFicticias: TabelaFicticia[] = [
  {
    tipo: 'TABELA',
    esquema: 'public',
    nome: 'usuarios',
    tamanhoBytes: 214 * MB,
    linhas: 824_000,
    gravacoes: [['q-usuario-ultimo-acesso', 'ATUALIZACAO']],
    partesHot: 0.94,
  },
  { tipo: 'TABELA', esquema: 'public', nome: 'clientes', tamanhoBytes: 38 * MB, linhas: 186_000, gravacoes: [], partesHot: 0 },
  {
    tipo: 'TABELA',
    esquema: 'public',
    nome: 'pedidos',
    tamanhoBytes: 486 * MB,
    linhas: 1_953_500,
    gravacoes: [
      ['q-pedido-novo', 'INSERCAO'],
      ['q-pedido-status', 'ATUALIZACAO'],
    ],
    partesHot: 0,
  },
  {
    tipo: 'TABELA',
    esquema: 'public',
    nome: 'itens_pedido',
    tamanhoBytes: 612 * MB,
    linhas: 5_870_000,
    gravacoes: [['q-itens-pedido', 'INSERCAO']],
    partesHot: 0,
  },
  { tipo: 'TABELA', esquema: 'public', nome: 'produtos', tamanhoBytes: 96 * MB, linhas: 120_000, gravacoes: [], partesHot: 0 },
  { tipo: 'TABELA', esquema: 'public', nome: 'categorias', tamanhoBytes: 16 * KB, linhas: 22, gravacoes: [], partesHot: 0 },
  {
    tipo: 'TABELA',
    esquema: 'public',
    nome: 'estoque',
    tamanhoBytes: 9 * MB,
    linhas: 120_000,
    gravacoes: [['q-estoque-baixa', 'ATUALIZACAO']],
    partesHot: 0.9,
  },
  { tipo: 'TABELA', esquema: 'public', nome: 'carrinhos', tamanhoBytes: 5 * MB, linhas: 64_000, gravacoes: [], partesHot: 0 },
  {
    tipo: 'TABELA',
    esquema: 'public',
    nome: 'itens_carrinho',
    tamanhoBytes: 14 * MB,
    linhas: 210_000,
    gravacoes: [
      ['q-carrinho-item-novo', 'INSERCAO'],
      ['q-carrinho-item-quantidade', 'ATUALIZACAO'],
    ],
    partesHot: 0.88,
  },
  {
    tipo: 'TABELA',
    esquema: 'public',
    nome: 'pagamentos',
    tamanhoBytes: 268 * MB,
    linhas: 2_010_000,
    gravacoes: [['q-pagamento-novo', 'INSERCAO']],
    partesHot: 0,
  },
  { tipo: 'TABELA', esquema: 'public', nome: 'enderecos', tamanhoBytes: 46 * MB, linhas: 240_000, gravacoes: [], partesHot: 0 },
  {
    tipo: 'TABELA',
    esquema: 'public',
    nome: 'cupons',
    tamanhoBytes: 512 * KB,
    linhas: 3400,
    gravacoes: [['q-cupom-uso', 'ATUALIZACAO']],
    partesHot: 0.97,
  },
  {
    tipo: 'TABELA',
    esquema: 'public',
    nome: 'avaliacoes',
    tamanhoBytes: 302 * MB,
    linhas: 1_120_000,
    gravacoes: [['q-avaliacao-nova', 'INSERCAO']],
    partesHot: 0,
  },
  { tipo: 'TABELA', esquema: 'public', nome: 'favoritos', tamanhoBytes: 24 * MB, linhas: 410_000, gravacoes: [], partesHot: 0 },
  {
    tipo: 'TABELA',
    esquema: 'public',
    nome: 'notificacoes',
    tamanhoBytes: 520 * MB,
    linhas: 3_600_000,
    gravacoes: [['q-notificacoes-lidas', 'ATUALIZACAO']],
    partesHot: 0,
  },
  {
    tipo: 'TABELA',
    esquema: 'public',
    nome: 'sessoes',
    tamanhoBytes: 118 * MB,
    linhas: 414_000,
    gravacoes: [['q-sessao-nova', 'INSERCAO']],
    partesHot: 0,
  },
  {
    tipo: 'TABELA',
    esquema: 'public',
    nome: 'auditoria',
    tamanhoBytes: 2150 * MB,
    linhas: 9_800_000,
    gravacoes: [['q-auditoria-nova', 'INSERCAO']],
    partesHot: 0,
  },
  { tipo: 'TABELA', esquema: 'public', nome: 'entregas', tamanhoBytes: 210 * MB, linhas: 1_890_000, gravacoes: [], partesHot: 0 },
  {
    tipo: 'VISAO_MATERIALIZADA',
    esquema: 'relatorios',
    nome: 'vendas_diarias',
    tamanhoBytes: 1_458_176,
    linhas: 8772,
    gravacoes: [
      ['q-visao-vendas-diarias', 'INSERCAO'],
      ['q-visao-vendas-diarias', 'ATUALIZACAO'],
    ],
    partesHot: 0,
    linhasPorAtualizacao: [36, 12],
  },
  {
    tipo: 'VISAO_MATERIALIZADA',
    esquema: 'relatorios',
    nome: 'resumo_avaliacoes',
    tamanhoBytes: 5_545_984,
    linhas: 86_412,
    gravacoes: [],
    partesHot: 0,
  },
];

export const indicesFicticios: IndiceFicticio[] = [
  { nome: 'usuarios_pkey', tabela: 'public.usuarios', colunas: ['id'], restricao: 'CHAVE_PRIMARIA', tamanhoBytes: 18_087_936 },
  { nome: 'usuarios_email_key', tabela: 'public.usuarios', colunas: ['email'], restricao: 'UNICA', tamanhoBytes: 41_369_600 },
  { nome: 'usuarios_email_idx', tabela: 'public.usuarios', colunas: ['email'], tamanhoBytes: 41_385_984 },
  { nome: 'clientes_pkey', tabela: 'public.clientes', colunas: ['id'], restricao: 'CHAVE_PRIMARIA', tamanhoBytes: 4_202_496 },
  { nome: 'pedidos_pkey', tabela: 'public.pedidos', colunas: ['id'], restricao: 'CHAVE_PRIMARIA', tamanhoBytes: 43_909_120 },
  {
    nome: 'pedidos_cliente_id_idx',
    tabela: 'public.pedidos',
    colunas: ['cliente_id'],
    valido: false,
    tamanhoBytes: 41_959_424,
    observacao: 'DESDE_O_DEGRAU',
  },
  { nome: 'pedidos_atualizado_em_idx', tabela: 'public.pedidos', colunas: ['atualizado_em'], tamanhoBytes: 43_778_048 },
  {
    nome: 'itens_pedido_pkey',
    tabela: 'public.itens_pedido',
    colunas: ['id'],
    restricao: 'CHAVE_PRIMARIA',
    tamanhoBytes: 131_874_816,
  },
  { nome: 'itens_pedido_pedido_id_idx', tabela: 'public.itens_pedido', colunas: ['pedido_id'], tamanhoBytes: 127_639_552 },
  { nome: 'produtos_pkey', tabela: 'public.produtos', colunas: ['id'], restricao: 'CHAVE_PRIMARIA', tamanhoBytes: 2_711_552 },
  { nome: 'produtos_categoria_id_idx', tabela: 'public.produtos', colunas: ['categoria_id'], tamanhoBytes: 2_605_056 },
  { nome: 'categorias_pkey', tabela: 'public.categorias', colunas: ['id'], restricao: 'CHAVE_PRIMARIA', tamanhoBytes: 16_384 },
  { nome: 'categorias_slug_key', tabela: 'public.categorias', colunas: ['slug'], restricao: 'UNICA', tamanhoBytes: 16_384 },
  { nome: 'estoque_pkey', tabela: 'public.estoque', colunas: ['id'], restricao: 'CHAVE_PRIMARIA', tamanhoBytes: 2_711_552 },
  { nome: 'estoque_produto_id_idx', tabela: 'public.estoque', colunas: ['produto_id'], unico: true, tamanhoBytes: 2_719_744 },
  { nome: 'carrinhos_pkey', tabela: 'public.carrinhos', colunas: ['id'], restricao: 'CHAVE_PRIMARIA', tamanhoBytes: 1_458_176 },
  { nome: 'carrinhos_usuario_id_idx', tabela: 'public.carrinhos', colunas: ['usuario_id'], tamanhoBytes: 1_441_792 },
  {
    nome: 'itens_carrinho_pkey',
    tabela: 'public.itens_carrinho',
    colunas: ['carrinho_id', 'produto_id'],
    restricao: 'CHAVE_PRIMARIA',
    tamanhoBytes: 6_365_184,
  },
  { nome: 'pagamentos_pkey', tabela: 'public.pagamentos', colunas: ['id'], restricao: 'CHAVE_PRIMARIA', tamanhoBytes: 45_187_072 },
  { nome: 'pagamentos_pedido_id_idx', tabela: 'public.pagamentos', colunas: ['pedido_id'], tamanhoBytes: 44_744_704 },
  { nome: 'enderecos_pkey', tabela: 'public.enderecos', colunas: ['id'], restricao: 'CHAVE_PRIMARIA', tamanhoBytes: 5_398_528 },
  { nome: 'enderecos_cliente_id_idx', tabela: 'public.enderecos', colunas: ['cliente_id'], tamanhoBytes: 5_275_648 },
  { nome: 'cupons_pkey', tabela: 'public.cupons', colunas: ['id'], restricao: 'CHAVE_PRIMARIA', tamanhoBytes: 98_304 },
  { nome: 'cupons_codigo_key', tabela: 'public.cupons', colunas: ['codigo'], restricao: 'UNICA', tamanhoBytes: 155_648 },
  {
    nome: 'cupons_valido_ate_idx',
    tabela: 'public.cupons',
    colunas: ['valido_ate'],
    tamanhoBytes: 98_304,
    observacao: 'RECENTE',
  },
  {
    nome: 'avaliacoes_pkey',
    tabela: 'public.avaliacoes',
    colunas: ['id'],
    restricao: 'CHAVE_PRIMARIA',
    tamanhoBytes: 25_174_016,
  },
  { nome: 'avaliacoes_produto_id_idx', tabela: 'public.avaliacoes', colunas: ['produto_id'], tamanhoBytes: 24_715_264 },
  {
    nome: 'avaliacoes_produto_id_criado_em_idx',
    tabela: 'public.avaliacoes',
    colunas: ['produto_id', 'criado_em DESC'],
    tamanhoBytes: 35_725_312,
  },
  {
    nome: 'favoritos_pkey',
    tabela: 'public.favoritos',
    colunas: ['usuario_id', 'produto_id'],
    restricao: 'CHAVE_PRIMARIA',
    tamanhoBytes: 12_705_792,
  },
  {
    nome: 'notificacoes_pkey',
    tabela: 'public.notificacoes',
    colunas: ['id'],
    restricao: 'CHAVE_PRIMARIA',
    tamanhoBytes: 80_855_040,
  },
  {
    nome: 'notificacoes_nao_lidas_idx',
    tabela: 'public.notificacoes',
    colunas: ['usuario_id'],
    predicado: '(lida_em IS NULL)',
    tamanhoBytes: 3_162_112,
  },
  { nome: 'sessoes_pkey', tabela: 'public.sessoes', colunas: ['id'], restricao: 'CHAVE_PRIMARIA', tamanhoBytes: 9_125_888 },
  { nome: 'sessoes_token_key', tabela: 'public.sessoes', colunas: ['token'], restricao: 'UNICA', tamanhoBytes: 29_335_552 },
  { nome: 'sessoes_usuario_id_idx', tabela: 'public.sessoes', colunas: ['usuario_id'], tamanhoBytes: 9_027_584 },
  {
    nome: 'auditoria_pkey',
    tabela: 'public.auditoria',
    colunas: ['id'],
    restricao: 'CHAVE_PRIMARIA',
    tamanhoBytes: 215_130_112,
  },
  { nome: 'auditoria_alvo_idx', tabela: 'public.auditoria', colunas: ['alvo'], tamanhoBytes: 318_840_832 },
  { nome: 'entregas_pkey', tabela: 'public.entregas', colunas: ['id'], restricao: 'CHAVE_PRIMARIA', tamanhoBytes: 41_664_512 },
  {
    nome: 'entregas_situacao_previsao_idx',
    tabela: 'public.entregas',
    colunas: ['situacao', 'previsao'],
    tamanhoBytes: 58_441_728,
  },
  {
    nome: 'vendas_diarias_dia_categoria_id_idx',
    tabela: 'relatorios.vendas_diarias',
    colunas: ['dia', 'categoria_id'],
    unico: true,
    tamanhoBytes: 368_640,
  },
  {
    nome: 'resumo_avaliacoes_produto_id_key',
    tabela: 'relatorios.resumo_avaliacoes',
    colunas: ['produto_id'],
    unico: true,
    tamanhoBytes: 1_957_888,
  },
];

export function inicioDaColeta(agora: Date): Date {
  return new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate() - DIAS_DE_COLETA,
    HORA_DO_INICIO_DA_COLETA,
    MINUTO_DO_INICIO_DA_COLETA,
  );
}

function observadoDesde(observacao: Observacao, agora: Date): Date {
  if (observacao === 'DESDE_O_DEGRAU') return new Date(marcoDoDegrau(agora));
  if (observacao === 'RECENTE') {
    return new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate() - DIAS_DO_INDICE_RECENTE,
      HORA_DO_INDICE_RECENTE,
      MINUTO_DO_INDICE_RECENTE,
    );
  }
  return inicioDaColeta(agora);
}

export function definicaoDoIndice(indice: Pick<IndiceDTO, 'nome' | 'metodo' | 'colunas' | 'incluidas' | 'predicado' | 'unico'> & { tabela: string }): string {
  const unico = indice.unico ? 'UNIQUE ' : '';
  const incluidas = indice.incluidas.length > 0 ? ` INCLUDE (${indice.incluidas.join(', ')})` : '';
  const predicado = indice.predicado ? ` WHERE ${indice.predicado}` : '';
  return `CREATE ${unico}INDEX ${indice.nome} ON ${indice.tabela} USING ${metodoNoComando[indice.metodo]} (${indice.colunas.join(', ')})${incluidas}${predicado}`;
}

function linhasGravadas(tabela: TabelaFicticia, consultas: Map<string, ConsultaDetalhadaDTO>, tipo: TipoDaGravacao): number {
  const [porInsercao, porAtualizacao] = tabela.linhasPorAtualizacao ?? [1, null];
  return tabela.gravacoes
    .filter(([, tipoDaGravacao]) => tipoDaGravacao === tipo)
    .reduce((soma, [id]) => {
      const consulta = consultas.get(id);
      if (!consulta) return soma;
      const linhas = tipo === 'INSERCAO' ? porInsercao : (porAtualizacao ?? consulta.linhasPorExecucao);
      return soma + Math.round(consulta.quantidadeExecucoes * linhas);
    }, 0);
}

function tabelaDoIndice(tabela: TabelaFicticia, consultas: Map<string, ConsultaDetalhadaDTO>): TabelaDoIndiceDTO {
  const atualizacoes = linhasGravadas(tabela, consultas, 'ATUALIZACAO');
  return {
    tipo: tabela.tipo,
    esquema: tabela.esquema,
    nome: tabela.nome,
    tamanhoBytes: tabela.tamanhoBytes,
    linhas: tabela.linhas,
    insercoes: linhasGravadas(tabela, consultas, 'INSERCAO'),
    atualizacoes,
    atualizacoesHot: Math.round(atualizacoes * tabela.partesHot),
  };
}

interface EtapaComIndice {
  indice: string;
  tipo: string;
  relacao: string | null;
  lacos: number;
  linhasLidas: number;
}

function etapasComIndice(no: NoPlanoDTO): EtapaComIndice[] {
  const proprias: EtapaComIndice[] = no.indice
    ? [
        {
          indice: no.indice,
          tipo: no.tipo,
          relacao: no.relacao,
          lacos: no.lacos,
          linhasLidas: (no.linhasReais + (no.linhasRemovidasPeloFiltro ?? 0)) * no.lacos,
        },
      ]
    : [];
  return [...proprias, ...no.filhos.flatMap(etapasComIndice)];
}

export interface LeituraDoIndice {
  uso: UsoDoIndiceDTO;
  execucoes: number;
  linhasLidas: number;
  relacao: string | null;
  indice: string;
}

function leiturasDasVersoes(id: string, planos: PlanosConsultaDTO, agora: Date): LeituraDoIndice[] {
  const [atual] = planos.versoes;
  if (!atual) return [];

  return planos.versoes.flatMap((versao) => {
    const plano = versao.id === atual.id ? planos.plano : gerarPlanosDaConsulta(id, versao.id, agora)?.plano;
    if (!plano) return [];
    return etapasComIndice(plano.raiz).map((etapa) => ({
      indice: etapa.indice,
      relacao: etapa.relacao,
      execucoes: versao.quantidadeExecucoes,
      linhasLidas: etapa.linhasLidas,
      uso: {
        consulta: planos.consulta,
        etapa: etapa.tipo,
        leiturasPorExecucao: etapa.lacos,
        versao: versao.id,
        versaoAtual: atual.id,
        usadoAte: versao.id === atual.id ? null : versao.ultimoRegistro,
      },
    }));
  });
}

export function planosDasConsultas(consultas: ConsultaDetalhadaDTO[], agora: Date): PlanosConsultaDTO[] {
  return consultas
    .filter((consulta) => temPlano(consulta.id))
    .flatMap((consulta) => gerarPlanosDaConsulta(consulta.id, null, agora) ?? []);
}

export function leiturasDosPlanos(planos: PlanosConsultaDTO[], agora: Date): LeituraDoIndice[] {
  return planos.flatMap((planosDaConsulta) => leiturasDasVersoes(planosDaConsulta.consulta.id, planosDaConsulta, agora));
}

function sugestoesDosPlanos(planos: PlanosConsultaDTO[]): SugestaoDeIndiceDTO[] {
  const porComando = new Map<string, SugestaoDeIndiceDTO>();
  for (const { consulta, plano } of planos) {
    for (const sugestao of plano?.sugestoes ?? []) {
      const conhecida = porComando.get(sugestao.comando);
      if (conhecida) {
        conhecida.consultas.push(consulta);
        continue;
      }
      porComando.set(sugestao.comando, {
        tabela: idDoObjeto({ esquema: 'public', nome: sugestao.tabela }),
        colunas: sugestao.colunas,
        comando: sugestao.comando,
        extensao: sugestao.extensao,
        consultas: [consulta],
      });
    }
  }
  return [...porComando.values()];
}

function ordenarUsos(usos: UsoDoIndiceDTO[]): UsoDoIndiceDTO[] {
  return [...usos].sort(
    (a, b) =>
      Number(a.usadoAte !== null) - Number(b.usadoAte !== null) ||
      b.consulta.percentualTempoTotal - a.consulta.percentualTempoTotal,
  );
}

export function gerarIndices(agora: Date, vazio = false): ListaIndicesDTO {
  const coletaDesde = inicioDaColeta(agora).toISOString();
  if (vazio) return { geradoEm: agora.toISOString(), coletaDesde, indices: [], sugestoes: [] };

  const lista = gerarConsultasDetalhadas(PERIODO_DO_USO, agora);
  const consultas = new Map(lista.map((consulta) => [consulta.id, consulta]));
  const tabelas = new Map(tabelasFicticias.map((tabela) => [idDoObjeto(tabela), tabelaDoIndice(tabela, consultas)]));
  const planos = planosDasConsultas(lista, agora);
  const leituras = leiturasDosPlanos(planos, agora);

  const indices = indicesFicticios.flatMap((indice): IndiceDTO[] => {
    const tabela = tabelas.get(indice.tabela);
    if (!tabela) return [];
    const valido = indice.valido ?? true;
    const doIndice = leituras.filter((leitura) => leitura.indice === indice.nome);
    const lidasAgora = valido ? doIndice.filter((leitura) => leitura.uso.usadoAte === null) : [];
    const estrutura = {
      nome: indice.nome,
      metodo: indice.metodo ?? 'BTREE',
      colunas: indice.colunas,
      incluidas: indice.incluidas ?? [],
      predicado: indice.predicado ?? null,
      unico: indice.unico === true || indice.restricao === 'CHAVE_PRIMARIA' || indice.restricao === 'UNICA',
    };

    return [
      {
        id: idDoObjeto({ esquema: tabela.esquema, nome: indice.nome }),
        esquema: tabela.esquema,
        tabela,
        ...estrutura,
        restricao: indice.restricao ?? null,
        valido,
        definicao: definicaoDoIndice({ ...estrutura, tabela: indice.tabela }),
        tamanhoBytes: indice.tamanhoBytes,
        leituras: lidasAgora.reduce((soma, leitura) => soma + leitura.execucoes * leitura.uso.leiturasPorExecucao, 0),
        linhasLidas: Math.round(lidasAgora.reduce((soma, leitura) => soma + leitura.execucoes * leitura.linhasLidas, 0)),
        observadoDesde: observadoDesde(indice.observacao ?? 'DESDE_A_COLETA', agora).toISOString(),
        usos: ordenarUsos(doIndice.map((leitura) => leitura.uso)),
      },
    ];
  });

  return { geradoEm: agora.toISOString(), coletaDesde, indices, sugestoes: sugestoesDosPlanos(planos) };
}
