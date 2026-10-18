import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import type {
  EstrategiaAgregacao,
  MemoriaPlanoDTO,
  NoPlanoDTO,
  OperacaoPlano,
  OrdenacaoPlanoDTO,
  PlanoExecucaoDTO,
  PlanosConsultaDTO,
  SugestaoIndiceDTO,
  TipoCondicaoPlano,
  TipoJuncaoPlano,
  VersaoPlanoDTO,
} from '@/modelos/planos';
import { filtrosIniciais } from '@/regras/filtrosConsultas';
import { PERIODO_DOS_PLANOS } from '@/regras/planoExecucao';
import { consultasFicticias, consultasSecundarias } from './consultasFicticias';
import { filtrarConsultas, gerarConsultasDetalhadas, tipoDoComando } from './consultas';
import { gerarHistoricoDaConsulta } from './historicoConsulta';
import { arredondar, sorteio } from './series';
import { trocasDePlano, versaoDoPlano } from './trocasDePlano';

interface ModeloNo {
  tipo: string;
  operacao?: OperacaoPlano;
  juncao?: TipoJuncaoPlano;
  estrategia?: EstrategiaAgregacao;
  sentidoInverso?: boolean;
  relacao?: string;
  apelido?: string;
  indice?: string;
  custo: [number, number];
  estimadas: number;
  largura: number;
  linhas: number;
  lacos?: number;
  removidas?: number;
  parte: number;
  condicoes?: [TipoCondicaoPlano, string][];
  buffers?: [number, number, number?, number?];
  ordenacao?: OrdenacaoPlanoDTO;
  memoria?: MemoriaPlanoDTO;
  sugestao?: Omit<SugestaoIndiceDTO, 'no' | 'tabela'>;
  filhos?: ModeloNo[];
}

interface ModeloPlano {
  planejamentoMs: number;
  raiz: ModeloNo;
}

interface OpcoesDoIndice {
  tipo?: string;
  apelido?: string;
  linhas?: number;
  estimadas?: number;
  largura?: number;
  lacos?: number;
  filtro?: string;
  removidas?: number;
  parte?: number;
  sentidoInverso?: boolean;
  buffers?: [number, number];
}

const MS_POR_MINUTO = 60_000;
const MS_POR_DIA = 86_400_000;
const MINUTOS_ENTRE_REGISTROS = 10;
const MEIO_DIA_MS = MS_POR_DIA / 2;
const PARTE_DO_INICIO_BLOQUEANTE = 0.985;
const MENOR_RUIDO_DO_TEMPO = 0.93;
const AMPLITUDE_RUIDO_DO_TEMPO = 0.12;
const DIAS_MINIMOS_DE_USO = 34;
const AMPLITUDE_DIAS_DE_USO = 60;

const tiposBloqueantes = ['Sort', 'Hash', 'Aggregate', 'ModifyTable'];

const cadastro = [...consultasFicticias, ...consultasSecundarias];

function porIndice(relacao: string, indice: string, condicao: string, opcoes: OpcoesDoIndice = {}): ModeloNo {
  const linhas = opcoes.linhas ?? 1;
  const condicoes: [TipoCondicaoPlano, string][] = [['CONDICAO_INDICE', condicao]];
  if (opcoes.filtro) condicoes.push(['FILTRO', opcoes.filtro]);
  return {
    tipo: opcoes.tipo ?? 'Index Scan',
    relacao,
    apelido: opcoes.apelido,
    indice,
    sentidoInverso: opcoes.sentidoInverso,
    custo: [0.42, arredondar(8.44 + Math.max(0, linhas - 1) * 1.12, 2)],
    estimadas: opcoes.estimadas ?? Math.max(1, Math.round(linhas)),
    largura: opcoes.largura ?? 64,
    linhas,
    lacos: opcoes.lacos,
    removidas: opcoes.filtro ? (opcoes.removidas ?? 0) : undefined,
    parte: opcoes.parte ?? 0.96,
    condicoes,
    buffers: opcoes.buffers ?? [Math.max(3, Math.round(3 + linhas)), 0],
  };
}

function insercao(relacao: string, largura: number, linhas = 0): ModeloPlano {
  return {
    planejamentoMs: 0.05,
    raiz: {
      tipo: 'ModifyTable',
      operacao: 'INSERT',
      relacao,
      custo: [0, 0.01],
      estimadas: linhas,
      largura: linhas > 0 ? 4 : 0,
      linhas,
      parte: 0.95,
      buffers: [7, 1],
      filhos: [{ tipo: 'Result', custo: [0, 0.01], estimadas: 1, largura, linhas: 1, parte: 0.02 }],
    },
  };
}

function alteracao(operacao: OperacaoPlano, relacao: string, filho: ModeloNo, parte = 0.58): ModeloPlano {
  return {
    planejamentoMs: 0.09,
    raiz: {
      tipo: 'ModifyTable',
      operacao,
      relacao,
      custo: [filho.custo[0], filho.custo[1]],
      estimadas: 0,
      largura: 0,
      linhas: 0,
      parte,
      buffers: [Math.round(4 + filho.linhas * 3), 0],
      filhos: [{ ...filho, parte: Math.max(0.02, 0.97 - parte) }],
    },
  };
}

function simples(raiz: ModeloNo, planejamentoMs = 0.08): ModeloPlano {
  return { planejamentoMs, raiz };
}

const planoDoEmail: ModeloPlano = {
  planejamentoMs: 0.214,
  raiz: {
    tipo: 'Seq Scan',
    relacao: 'usuarios',
    custo: [0, 20600],
    estimadas: 4120,
    largura: 36,
    linhas: 1,
    removidas: 823_999,
    parte: 0.995,
    condicoes: [['FILTRO', '(lower((email)::text) = lower($1))']],
    buffers: [2410, 11_388],
    sugestao: {
      colunas: ['lower(email)'],
      comando: 'CREATE INDEX CONCURRENTLY usuarios_lower_email_idx ON usuarios (lower(email));',
      extensao: null,
    },
  },
};

const ordenacaoDosPedidos: OrdenacaoPlanoDTO = { metodo: 'QUICKSORT', espacoKb: 29, emDisco: false };

const planoAntigoDosPedidos: ModeloPlano = {
  planejamentoMs: 0.162,
  raiz: {
    tipo: 'Sort',
    custo: [61.18, 61.21],
    estimadas: 15,
    largura: 96,
    linhas: 14,
    parte: 0.09,
    condicoes: [['CHAVE_ORDENACAO', 'criado_em DESC']],
    ordenacao: ordenacaoDosPedidos,
    filhos: [
      {
        tipo: 'Bitmap Heap Scan',
        relacao: 'pedidos',
        custo: [4.54, 60.89],
        estimadas: 15,
        largura: 96,
        linhas: 14,
        parte: 0.78,
        condicoes: [['RECHECAGEM', '(cliente_id = $1)']],
        buffers: [3, 14],
        filhos: [
          {
            tipo: 'Bitmap Index Scan',
            indice: 'pedidos_cliente_id_idx',
            custo: [0, 4.54],
            estimadas: 15,
            largura: 0,
            linhas: 14,
            parte: 0.12,
            condicoes: [['CONDICAO_INDICE', '(cliente_id = $1)']],
            buffers: [3, 0],
          },
        ],
      },
    ],
  },
};

const planoAtualDosPedidos: ModeloPlano = {
  planejamentoMs: 0.171,
  raiz: {
    tipo: 'Sort',
    custo: [42_870.4, 42_894.82],
    estimadas: 9770,
    largura: 96,
    linhas: 14,
    parte: 0.06,
    condicoes: [['CHAVE_ORDENACAO', 'criado_em DESC']],
    ordenacao: ordenacaoDosPedidos,
    filhos: [
      {
        tipo: 'Seq Scan',
        relacao: 'pedidos',
        custo: [0, 42_201.75],
        estimadas: 9770,
        largura: 96,
        linhas: 14,
        removidas: 1_953_486,
        parte: 0.93,
        condicoes: [['FILTRO', '(cliente_id = $1)']],
        buffers: [8140, 16_420],
        sugestao: {
          colunas: ['cliente_id', 'criado_em DESC'],
          comando: 'CREATE INDEX CONCURRENTLY pedidos_cliente_id_criado_em_idx ON pedidos (cliente_id, criado_em DESC);',
          extensao: null,
        },
      },
    ],
  },
};

const planoDaBuscaDeProdutos: ModeloPlano = {
  planejamentoMs: 0.388,
  raiz: {
    tipo: 'Hash Join',
    juncao: 'INNER',
    custo: [3125.4, 9870.2],
    estimadas: 600,
    largura: 148,
    linhas: 24,
    parte: 0.04,
    condicoes: [['CONDICAO_HASH', '(e.produto_id = p.id)']],
    filhos: [
      {
        tipo: 'Seq Scan',
        relacao: 'estoque',
        apelido: 'e',
        custo: [0, 1850],
        estimadas: 120_000,
        largura: 12,
        linhas: 120_000,
        parte: 0.3,
        buffers: [1100, 0],
      },
      {
        tipo: 'Hash',
        custo: [3117.9, 3117.9],
        estimadas: 600,
        largura: 140,
        linhas: 24,
        parte: 0.01,
        memoria: { lotes: 1, memoriaKb: 12, discoKb: null },
        filhos: [
          {
            tipo: 'Seq Scan',
            relacao: 'produtos',
            apelido: 'p',
            custo: [0, 3117.9],
            estimadas: 600,
            largura: 140,
            linhas: 24,
            removidas: 119_976,
            parte: 0.64,
            condicoes: [['FILTRO', '((nome)::text ~~* $1)']],
            buffers: [3400, 1220],
            sugestao: {
              colunas: ['nome gin_trgm_ops'],
              comando: 'CREATE INDEX CONCURRENTLY produtos_nome_trgm_idx ON produtos USING gin (nome gin_trgm_ops);',
              extensao: 'pg_trgm',
            },
          },
        ],
      },
    ],
  },
};

const planoDoFaturamento: ModeloPlano = {
  planejamentoMs: 0.126,
  raiz: {
    tipo: 'Aggregate',
    estrategia: 'SIMPLES',
    custo: [52_430.18, 52_430.19],
    estimadas: 1,
    largura: 32,
    linhas: 1,
    parte: 0.02,
    filhos: [
      {
        tipo: 'Seq Scan',
        relacao: 'pedidos',
        custo: [0, 52_333.0],
        estimadas: 38_900,
        largura: 6,
        linhas: 41_200,
        removidas: 1_912_300,
        parte: 0.975,
        condicoes: [['FILTRO', "((status = $1) AND (criado_em >= (now() - '30 days'::interval)))"]],
        buffers: [6200, 18_400],
        sugestao: {
          colunas: ['status', 'criado_em'],
          comando: 'CREATE INDEX CONCURRENTLY pedidos_status_criado_em_idx ON pedidos (status, criado_em);',
          extensao: null,
        },
      },
    ],
  },
};

const planoDaCategoria: ModeloPlano = {
  planejamentoMs: 0.142,
  raiz: {
    tipo: 'Limit',
    custo: [512.6, 512.65],
    estimadas: 20,
    largura: 44,
    linhas: 19,
    parte: 0.01,
    filhos: [
      {
        tipo: 'Sort',
        custo: [512.6, 513.63],
        estimadas: 412,
        largura: 44,
        linhas: 19,
        parte: 0.08,
        condicoes: [['CHAVE_ORDENACAO', 'p.criado_em DESC']],
        ordenacao: { metodo: 'TOP_N_HEAPSORT', espacoKb: 28, emDisco: false },
        filhos: [
          {
            tipo: 'Bitmap Heap Scan',
            relacao: 'produtos',
            apelido: 'p',
            custo: [7.62, 501.64],
            estimadas: 412,
            largura: 44,
            linhas: 398,
            removidas: 38,
            parte: 0.72,
            condicoes: [
              ['RECHECAGEM', '(categoria_id = $1)'],
              ['FILTRO', 'ativo'],
            ],
            buffers: [184, 46],
            filhos: [
              {
                tipo: 'Bitmap Index Scan',
                indice: 'produtos_categoria_id_idx',
                custo: [0, 7.51],
                estimadas: 430,
                largura: 0,
                linhas: 436,
                parte: 0.17,
                condicoes: [['CONDICAO_INDICE', '(categoria_id = $1)']],
                buffers: [4, 0],
              },
            ],
          },
        ],
      },
    ],
  },
};

const planoDoRanking: ModeloPlano = {
  planejamentoMs: 0.47,
  raiz: {
    tipo: 'Limit',
    custo: [198_420.3, 198_420.43],
    estimadas: 50,
    largura: 44,
    linhas: 50,
    parte: 0.002,
    filhos: [
      {
        tipo: 'Sort',
        custo: [198_420.3, 198_885.3],
        estimadas: 186_000,
        largura: 44,
        linhas: 50,
        parte: 0.03,
        condicoes: [['CHAVE_ORDENACAO', '(count(p.id)) DESC']],
        ordenacao: { metodo: 'TOP_N_HEAPSORT', espacoKb: 32, emDisco: false },
        filhos: [
          {
            tipo: 'Aggregate',
            estrategia: 'HASH',
            custo: [186_210.5, 192_241.6],
            estimadas: 186_000,
            largura: 44,
            linhas: 186_000,
            parte: 0.3,
            condicoes: [['CHAVE_AGRUPAMENTO', 'c.id']],
            memoria: { lotes: 5, memoriaKb: 8257, discoKb: 41_040 },
            buffers: [0, 0, 5130, 5130],
            filhos: [
              {
                tipo: 'Hash Join',
                juncao: 'RIGHT',
                custo: [6544.0, 112_808.4],
                estimadas: 1_953_500,
                largura: 40,
                linhas: 1_965_900,
                parte: 0.24,
                condicoes: [['CONDICAO_HASH', '(p.cliente_id = c.id)']],
                buffers: [0, 0, 1470, 1470],
                filhos: [
                  {
                    tipo: 'Seq Scan',
                    relacao: 'pedidos',
                    apelido: 'p',
                    custo: [0, 41_221.0],
                    estimadas: 1_953_500,
                    largura: 8,
                    linhas: 1_953_500,
                    parte: 0.33,
                    buffers: [8100, 16_500],
                  },
                  {
                    tipo: 'Hash',
                    custo: [3492.0, 3492.0],
                    estimadas: 186_000,
                    largura: 36,
                    linhas: 186_000,
                    parte: 0.04,
                    memoria: { lotes: 8, memoriaKb: 4096, discoKb: null },
                    filhos: [
                      {
                        tipo: 'Seq Scan',
                        relacao: 'clientes',
                        apelido: 'c',
                        custo: [0, 3492.0],
                        estimadas: 186_000,
                        largura: 36,
                        linhas: 186_000,
                        parte: 0.05,
                        buffers: [2300, 0],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

const planoDaLimpezaDeSessoes: ModeloPlano = {
  planejamentoMs: 0.098,
  raiz: {
    tipo: 'ModifyTable',
    operacao: 'DELETE',
    relacao: 'sessoes',
    custo: [0, 12_874.0],
    estimadas: 0,
    largura: 0,
    linhas: 0,
    parte: 0.12,
    buffers: [5600, 0],
    filhos: [
      {
        tipo: 'Seq Scan',
        relacao: 'sessoes',
        custo: [0, 12_874.0],
        estimadas: 2100,
        largura: 6,
        linhas: 1864,
        removidas: 412_000,
        parte: 0.875,
        condicoes: [['FILTRO', '(expira_em < now())']],
        buffers: [3100, 9800],
        sugestao: {
          colunas: ['expira_em'],
          comando: 'CREATE INDEX CONCURRENTLY sessoes_expira_em_idx ON sessoes (expira_em);',
          extensao: null,
        },
      },
    ],
  },
};

const planos: Record<string, ModeloPlano> = {
  'q-usuarios-email': planoDoEmail,
  'q-pedidos-cliente': planoAtualDosPedidos,
  'q-produtos-busca': planoDaBuscaDeProdutos,
  'q-faturamento-30-dias': planoDoFaturamento,
  'q-produtos-categoria': planoDaCategoria,
  'q-ranking-clientes': planoDoRanking,
  'q-estoque-baixa': alteracao('UPDATE', 'estoque', porIndice('estoque', 'estoque_produto_id_idx', '(produto_id = $2)'), 0.62),
  'q-sessoes-limpeza': planoDaLimpezaDeSessoes,
  'q-itens-pedido': insercao('itens_pedido', 28),
  'q-sessoes-token': simples(
    porIndice('sessoes', 'sessoes_token_key', '(token = $1)', { filtro: '(expira_em > now())', largura: 88, parte: 0.97 }),
  ),
  'q-usuarios-id': simples(porIndice('usuarios', 'usuarios_pkey', '(id = $1)', { largura: 212 })),
  'q-clientes-id': simples(porIndice('clientes', 'clientes_pkey', '(id = $1)', { largura: 74 })),
  'q-pedidos-id': simples(porIndice('pedidos', 'pedidos_pkey', '(id = $1)', { largura: 96 })),
  'q-itens-do-pedido': simples({
    tipo: 'Nested Loop',
    juncao: 'INNER',
    custo: [0.86, 41.38],
    estimadas: 3,
    largura: 52,
    linhas: 3,
    parte: 0.08,
    filhos: [
      porIndice('itens_pedido', 'itens_pedido_pedido_id_idx', '(pedido_id = $1)', {
        apelido: 'i',
        linhas: 3,
        estimadas: 4,
        largura: 24,
        parte: 0.42,
      }),
      porIndice('produtos', 'produtos_pkey', '(id = i.produto_id)', { apelido: 'p', lacos: 3, largura: 32, parte: 0.46 }),
    ],
  }),
  'q-produtos-id': simples(porIndice('produtos', 'produtos_pkey', '(id = $1)', { filtro: 'ativo', largura: 37 })),
  'q-categorias-ativas': simples({
    tipo: 'Sort',
    custo: [1.42, 1.47],
    estimadas: 18,
    largura: 40,
    linhas: 18,
    parte: 0.34,
    condicoes: [['CHAVE_ORDENACAO', 'posicao']],
    ordenacao: { metodo: 'QUICKSORT', espacoKb: 26, emDisco: false },
    filhos: [
      {
        tipo: 'Seq Scan',
        relacao: 'categorias',
        custo: [0, 1.22],
        estimadas: 18,
        largura: 40,
        linhas: 18,
        removidas: 4,
        parte: 0.6,
        condicoes: [['FILTRO', 'ativa']],
        buffers: [1, 0],
      },
    ],
  }),
  'q-estoque-produto': simples(porIndice('estoque', 'estoque_produto_id_idx', '(produto_id = $1)', { largura: 4 })),
  'q-carrinho-usuario': simples({
    tipo: 'Nested Loop',
    juncao: 'INNER',
    custo: [0.85, 25.1],
    estimadas: 3,
    largura: 16,
    linhas: 3,
    parte: 0.06,
    filhos: [
      porIndice('carrinhos', 'carrinhos_usuario_id_idx', '(usuario_id = $1)', { apelido: 'c', largura: 8, parte: 0.38 }),
      porIndice('itens_carrinho', 'itens_carrinho_pkey', '(carrinho_id = c.id)', {
        apelido: 'i',
        linhas: 3,
        estimadas: 3,
        largura: 16,
        parte: 0.52,
      }),
    ],
  }),
  'q-carrinho-item-novo': insercao('itens_carrinho', 20),
  'q-carrinho-item-quantidade': alteracao(
    'UPDATE',
    'itens_carrinho',
    porIndice('itens_carrinho', 'itens_carrinho_pkey', '((carrinho_id = $2) AND (produto_id = $3))', { largura: 14 }),
  ),
  'q-carrinho-item-remocao': alteracao(
    'DELETE',
    'itens_carrinho',
    porIndice('itens_carrinho', 'itens_carrinho_pkey', '((carrinho_id = $1) AND (produto_id = $2))', { largura: 6 }),
    0.5,
  ),
  'q-pedido-novo': insercao('pedidos', 52, 1),
  'q-pedido-status': alteracao('UPDATE', 'pedidos', porIndice('pedidos', 'pedidos_pkey', '(id = $2)', { largura: 54 }), 0.66),
  'q-pagamento-novo': insercao('pagamentos', 64),
  'q-pagamentos-pedido': simples(
    porIndice('pagamentos', 'pagamentos_pedido_id_idx', '(pedido_id = $1)', { largura: 40, estimadas: 2 }),
  ),
  'q-enderecos-cliente': simples({
    tipo: 'Sort',
    custo: [16.71, 16.72],
    estimadas: 2,
    largura: 180,
    linhas: 2,
    parte: 0.2,
    condicoes: [['CHAVE_ORDENACAO', 'principal DESC']],
    ordenacao: { metodo: 'QUICKSORT', espacoKb: 25, emDisco: false },
    filhos: [porIndice('enderecos', 'enderecos_cliente_id_idx', '(cliente_id = $1)', { linhas: 2, largura: 180, parte: 0.74 })],
  }),
  'q-cupom-codigo': simples(
    porIndice('cupons', 'cupons_codigo_key', '((codigo)::text = $1)', {
      filtro: '(valido_ate >= now())',
      linhas: 0,
      estimadas: 1,
      removidas: 1,
      largura: 20,
    }),
  ),
  'q-cupom-uso': alteracao('UPDATE', 'cupons', porIndice('cupons', 'cupons_pkey', '(id = $1)', { largura: 10 })),
  'q-avaliacoes-produto': simples({
    tipo: 'Limit',
    custo: [0.86, 74.3],
    estimadas: 10,
    largura: 160,
    linhas: 8,
    parte: 0.01,
    filhos: [
      {
        tipo: 'Nested Loop',
        juncao: 'INNER',
        custo: [0.86, 74.3],
        estimadas: 10,
        largura: 160,
        linhas: 8,
        parte: 0.07,
        filhos: [
          porIndice('avaliacoes', 'avaliacoes_produto_id_criado_em_idx', '(produto_id = $1)', {
            apelido: 'a',
            linhas: 8,
            estimadas: 46,
            largura: 148,
            sentidoInverso: true,
            parte: 0.48,
          }),
          porIndice('usuarios', 'usuarios_pkey', '(id = a.usuario_id)', { apelido: 'u', lacos: 8, largura: 20, parte: 0.42 }),
        ],
      },
    ],
  }),
  'q-avaliacoes-media': simples(
    porIndice('resumo_avaliacoes', 'resumo_avaliacoes_produto_id_key', '(produto_id = $1)', { largura: 16 }),
  ),
  'q-avaliacao-nova': insercao('avaliacoes', 76),
  'q-favoritos-usuario': simples(
    porIndice('favoritos', 'favoritos_pkey', '(usuario_id = $1)', { tipo: 'Index Only Scan', linhas: 6, largura: 8 }),
  ),
  'q-favorito-remocao': alteracao(
    'DELETE',
    'favoritos',
    porIndice('favoritos', 'favoritos_pkey', '((usuario_id = $1) AND (produto_id = $2))', { largura: 6 }),
    0.48,
  ),
  'q-notificacoes-nao-lidas': simples({
    tipo: 'Aggregate',
    estrategia: 'SIMPLES',
    custo: [9.06, 9.07],
    estimadas: 1,
    largura: 8,
    linhas: 1,
    parte: 0.12,
    filhos: [
      porIndice('notificacoes', 'notificacoes_nao_lidas_idx', '(usuario_id = $1)', {
        tipo: 'Index Only Scan',
        linhas: 4,
        estimadas: 4,
        largura: 0,
        parte: 0.85,
      }),
    ],
  }),
  'q-notificacoes-lidas': alteracao(
    'UPDATE',
    'notificacoes',
    porIndice('notificacoes', 'notificacoes_nao_lidas_idx', '(usuario_id = $1)', { linhas: 4, estimadas: 4, largura: 14 }),
    0.71,
  ),
  'q-sessao-nova': insercao('sessoes', 96),
  'q-usuario-ultimo-acesso': alteracao('UPDATE', 'usuarios', porIndice('usuarios', 'usuarios_pkey', '(id = $1)', { largura: 14 }), 0.64),
  'q-auditoria-nova': insercao('auditoria', 72),
  'q-entregas-pendentes': simples({
    tipo: 'Limit',
    custo: [0.43, 58.2],
    estimadas: 40,
    largura: 24,
    linhas: 40,
    parte: 0.02,
    filhos: [
      porIndice('entregas', 'entregas_situacao_previsao_idx', '(situacao = $1)', {
        filtro: '(entregue_em IS NULL)',
        linhas: 40,
        estimadas: 52,
        largura: 24,
        parte: 0.95,
        buffers: [31, 6],
      }),
    ],
  }),
};

const planosAnteriores: Record<string, ModeloPlano> = {
  'q-pedidos-cliente': planoAntigoDosPedidos,
};

function sementeDoTexto(texto: string): number {
  let semente = 0;
  for (const caractere of texto) semente = (semente * 31 + caractere.charCodeAt(0)) % 1_000_003;
  return semente;
}

function somaDasPartes(modelo: ModeloNo): number {
  return modelo.parte + (modelo.filhos ?? []).reduce((soma, filho) => soma + somaDasPartes(filho), 0);
}

function materializar(modelo: ModeloPlano, id: string, registradoEm: Date, tempoExecucaoMs: number): PlanoExecucaoDTO {
  let proximoId = 1;
  const sugestoes: SugestaoIndiceDTO[] = [];

  const construir = (no: ModeloNo): NoPlanoDTO => {
    const idDoNo = proximoId;
    proximoId += 1;
    if (no.sugestao && no.relacao) sugestoes.push({ no: idDoNo, tabela: no.relacao, ...no.sugestao });

    const filhos = (no.filhos ?? []).map(construir);
    const lacos = no.lacos ?? 1;
    const tempoTotalMs = (tempoExecucaoMs * somaDasPartes(no)) / lacos;
    const inicioDosFilhos = filhos.reduce(
      (maior, filho) => Math.max(maior, tiposBloqueantes.includes(filho.tipo) ? filho.tempoTotalMs : filho.tempoInicialMs),
      0,
    );
    const tempoInicialMs = tiposBloqueantes.includes(no.tipo)
      ? tempoTotalMs * PARTE_DO_INICIO_BLOQUEANTE
      : Math.min(tempoTotalMs, inicioDosFilhos + tempoTotalMs * 0.004 + 0.002);
    const [emCache = 0, lidos = 0, temporariosLidos = 0, temporariosEscritos = 0] = no.buffers ?? [];
    const somar = (campo: keyof NoPlanoDTO['buffers']) => filhos.reduce((soma, filho) => soma + filho.buffers[campo], 0);

    return {
      id: idDoNo,
      tipo: no.tipo,
      operacao: no.operacao ?? null,
      juncao: no.juncao ?? null,
      estrategia: no.estrategia ?? null,
      sentidoInverso: no.sentidoInverso ?? false,
      relacao: no.relacao ?? null,
      apelido: no.apelido ?? null,
      indice: no.indice ?? null,
      custoInicial: no.custo[0],
      custoTotal: no.custo[1],
      linhasEstimadas: no.estimadas,
      larguraBytes: no.largura,
      tempoInicialMs: arredondar(tempoInicialMs, 3),
      tempoTotalMs: arredondar(tempoTotalMs, 3),
      linhasReais: no.linhas,
      lacos,
      linhasRemovidasPeloFiltro: no.removidas ?? null,
      condicoes: (no.condicoes ?? []).map(([tipo, expressao]) => ({ tipo, expressao })),
      buffers: {
        emCache: emCache + somar('emCache'),
        lidos: lidos + somar('lidos'),
        temporariosLidos: temporariosLidos + somar('temporariosLidos'),
        temporariosEscritos: temporariosEscritos + somar('temporariosEscritos'),
      },
      ordenacao: no.ordenacao ?? null,
      memoria: no.memoria ?? null,
      filhos,
    };
  };

  const raiz = construir(modelo.raiz);
  return {
    id,
    registradoEm: registradoEm.toISOString(),
    tempoPlanejamentoMs: modelo.planejamentoMs,
    tempoExecucaoMs: arredondar(tempoExecucaoMs, 3),
    raiz,
    sugestoes,
  };
}

function ultimoRegistro(id: string, agora: Date): Date {
  const blocoMs = MINUTOS_ENTRE_REGISTROS * MS_POR_MINUTO;
  const bloco = Math.floor(agora.getTime() / blocoMs) * blocoMs;
  const semente = sementeDoTexto(id);
  const minutos = 2 + Math.floor(sorteio(semente) * 38);
  const segundos = Math.floor(sorteio(semente + 1) * 59);
  return new Date(bloco - minutos * MS_POR_MINUTO - segundos * 1000);
}

function primeiroUso(id: string, agora: Date): Date {
  const semente = sementeDoTexto(id);
  const dias = DIAS_MINIMOS_DE_USO + Math.floor(sorteio(semente + 2) * AMPLITUDE_DIAS_DE_USO);
  const hora = 8 + Math.floor(sorteio(semente + 3) * 10);
  const minuto = Math.floor(sorteio(semente + 4) * 60);
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - dias, hora, minuto, 17);
}

function mediaPonderada(partes: { quantidadeExecucoes: number; tempoMedioMs: number | null }[]): number {
  const execucoes = partes.reduce((soma, parte) => soma + parte.quantidadeExecucoes, 0);
  if (execucoes === 0) return 0;
  return arredondar(partes.reduce((soma, parte) => soma + parte.quantidadeExecucoes * (parte.tempoMedioMs ?? 0), 0) / execucoes);
}

function montarVersoes(consulta: ConsultaDetalhadaDTO, agora: Date): VersaoPlanoDTO[] {
  const recente = ultimoRegistro(consulta.id, agora).toISOString();
  const inicio = primeiroUso(consulta.id, agora).toISOString();
  const [troca] = trocasDePlano(consulta.id, agora);

  if (!troca || !planosAnteriores[consulta.id]) {
    return [
      {
        id: versaoDoPlano(consulta.id, 1),
        primeiroRegistro: inicio,
        ultimoRegistro: recente,
        quantidadeExecucoes: consulta.quantidadeExecucoes,
        tempoMedioMs: consulta.tempoMedioMs,
      },
    ];
  }

  const marco = new Date(troca.instante).getTime();
  const pontos = gerarHistoricoDaConsulta(consulta.id, PERIODO_DOS_PLANOS, agora)?.pontos ?? [];
  const depois = pontos.filter((ponto) => new Date(ponto.instante).getTime() + MEIO_DIA_MS >= marco);
  const antes = pontos.filter((ponto) => new Date(ponto.instante).getTime() + MEIO_DIA_MS < marco);
  const somar = (lista: typeof pontos) => lista.reduce((soma, ponto) => soma + ponto.quantidadeExecucoes, 0);

  return [
    {
      id: troca.versao,
      primeiroRegistro: troca.instante,
      ultimoRegistro: recente,
      quantidadeExecucoes: somar(depois),
      tempoMedioMs: mediaPonderada(depois),
    },
    {
      id: troca.versaoAnterior,
      primeiroRegistro: inicio,
      ultimoRegistro: new Date(marco - 3 * MS_POR_MINUTO).toISOString(),
      quantidadeExecucoes: somar(antes),
      tempoMedioMs: mediaPonderada(antes),
    },
  ];
}

function modeloDaVersao(idDaConsulta: string, indice: number): ModeloPlano | undefined {
  return indice === 0 ? planos[idDaConsulta] : planosAnteriores[idDaConsulta];
}

function consultaSemDados(id: string): ConsultaDetalhadaDTO | null {
  const cadastrada = cadastro.find((consulta) => consulta.id === id);
  if (!cadastrada) return null;
  return {
    id: cadastrada.id,
    sql: cadastrada.sql,
    tipo: tipoDoComando(cadastrada.sql),
    tempoMedioMs: 0,
    tempoMinimoMs: 0,
    tempoMaximoMs: 0,
    tempoTotalMs: 0,
    quantidadeExecucoes: 0,
    linhasPorExecucao: 0,
    percentualTempoTotal: 0,
    desempenho: 'RAPIDA',
  };
}

export function temPlano(id: string): boolean {
  return id in planos;
}

export function gerarPlanosDaConsulta(
  id: string,
  versao: string | null,
  agora: Date,
  semDados = false,
): PlanosConsultaDTO | null {
  if (semDados) {
    const consulta = consultaSemDados(id);
    if (!consulta) return null;
    return { consulta, posicao: null, totalDoPeriodo: 0, idAnterior: null, idSeguinte: null, versoes: [], plano: null };
  }

  const porPeso = filtrarConsultas(gerarConsultasDetalhadas(PERIODO_DOS_PLANOS, agora), { ...filtrosIniciais, tamanhoPagina: 1 });
  const posicao = porPeso.findIndex((consulta) => consulta.id === id);
  const consulta = porPeso[posicao];
  if (!consulta) return null;

  const vizinhas = {
    posicao: posicao + 1,
    totalDoPeriodo: porPeso.length,
    idAnterior: porPeso[posicao - 1]?.id ?? null,
    idSeguinte: porPeso[posicao + 1]?.id ?? null,
  };
  if (!temPlano(id)) return { consulta, ...vizinhas, versoes: [], plano: null };

  const versoes = montarVersoes(consulta, agora);
  const indice = Math.max(0, versoes.findIndex((candidata) => candidata.id === versao));
  const escolhida = versoes[indice];
  const modelo = modeloDaVersao(id, indice);
  if (!escolhida || !modelo) return { consulta, ...vizinhas, versoes, plano: null };

  const ruido = MENOR_RUIDO_DO_TEMPO + AMPLITUDE_RUIDO_DO_TEMPO * sorteio(sementeDoTexto(escolhida.id) + 5);
  const plano = materializar(modelo, escolhida.id, new Date(escolhida.ultimoRegistro), escolhida.tempoMedioMs * ruido);
  return { consulta, ...vizinhas, versoes, plano };
}
