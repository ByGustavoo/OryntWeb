import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import type {
  ColunaVisaoDTO,
  ListaVisoesDTO,
  ReferenciaObjetoDTO,
  TipoObjetoBanco,
  TipoVisao,
  VisaoDTO,
} from '@/modelos/objetos';
import { PERIODO_DAS_LEITURAS, idDoObjeto } from '@/regras/visoes';
import { gerarConsultasDetalhadas } from './consultas';
import { gerarHistoricoDaConsulta } from './historicoConsulta';

interface MaterializacaoFicticia {
  populada: boolean;
  tamanhoBytes: number;
  linhas: number;
  atualizacao: string | null;
}

interface VisaoFicticia {
  tipo: TipoVisao;
  esquema: string;
  nome: string;
  dono: string;
  descricao: string | null;
  definicao: string;
  colunas: [string, string][];
  dependeDe: [TipoObjetoBanco, string, string][];
  leitoras: string[];
  materializacao?: MaterializacaoFicticia;
}

const periodosDaUltimaExecucao: PeriodoDashboard[] = ['ULTIMAS_24_HORAS', 'ULTIMOS_7_DIAS', 'ULTIMOS_30_DIAS'];

export const visoesFicticias: VisaoFicticia[] = [
  {
    tipo: 'COMUM',
    esquema: 'public',
    nome: 'produtos_ativos',
    dono: 'loja_app',
    descricao: 'Os produtos à venda, sem os desativados.',
    definicao: ` SELECT produtos.id,
    produtos.nome,
    produtos.preco,
    produtos.categoria_id,
    produtos.criado_em
   FROM produtos
  WHERE produtos.ativo;`,
    colunas: [
      ['id', 'bigint'],
      ['nome', 'text'],
      ['preco', 'numeric(12,2)'],
      ['categoria_id', 'bigint'],
      ['criado_em', 'timestamp with time zone'],
    ],
    dependeDe: [['TABELA', 'public', 'produtos']],
    leitoras: ['q-produtos-id'],
  },
  {
    tipo: 'COMUM',
    esquema: 'public',
    nome: 'estoque_disponivel',
    dono: 'loja_app',
    descricao: 'O estoque de cada produto ativo, já sem a quantidade reservada em carrinhos.',
    definicao: ` SELECT p.id AS produto_id,
    p.nome,
    p.categoria_id,
    e.quantidade - e.reservada AS disponivel
   FROM produtos_ativos p
     JOIN estoque e ON e.produto_id = p.id;`,
    colunas: [
      ['produto_id', 'bigint'],
      ['nome', 'text'],
      ['categoria_id', 'bigint'],
      ['disponivel', 'integer'],
    ],
    dependeDe: [
      ['VISAO', 'public', 'produtos_ativos'],
      ['TABELA', 'public', 'estoque'],
    ],
    leitoras: [],
  },
  {
    tipo: 'COMUM',
    esquema: 'public',
    nome: 'categorias_ativas',
    dono: 'loja_app',
    descricao: 'As categorias exibidas na vitrine da loja.',
    definicao: ` SELECT categorias.id,
    categorias.nome,
    categorias.slug,
    categorias.posicao
   FROM categorias
  WHERE categorias.ativa;`,
    colunas: [
      ['id', 'bigint'],
      ['nome', 'text'],
      ['slug', 'text'],
      ['posicao', 'integer'],
    ],
    dependeDe: [['TABELA', 'public', 'categorias']],
    leitoras: ['q-categorias-ativas'],
  },
  {
    tipo: 'COMUM',
    esquema: 'public',
    nome: 'notificacoes_nao_lidas',
    dono: 'loja_app',
    descricao: null,
    definicao: ` SELECT notificacoes.id,
    notificacoes.usuario_id,
    notificacoes.titulo,
    notificacoes.criado_em
   FROM notificacoes
  WHERE notificacoes.lida_em IS NULL;`,
    colunas: [
      ['id', 'bigint'],
      ['usuario_id', 'bigint'],
      ['titulo', 'text'],
      ['criado_em', 'timestamp with time zone'],
    ],
    dependeDe: [['TABELA', 'public', 'notificacoes']],
    leitoras: ['q-notificacoes-nao-lidas'],
  },
  {
    tipo: 'COMUM',
    esquema: 'public',
    nome: 'entregas_pendentes',
    dono: 'loja_app',
    descricao: 'As entregas ainda não concluídas, com a previsão de chegada.',
    definicao: ` SELECT entregas.id,
    entregas.pedido_id,
    entregas.situacao,
    entregas.previsao
   FROM entregas
  WHERE entregas.entregue_em IS NULL;`,
    colunas: [
      ['id', 'bigint'],
      ['pedido_id', 'bigint'],
      ['situacao', 'text'],
      ['previsao', 'date'],
    ],
    dependeDe: [['TABELA', 'public', 'entregas']],
    leitoras: ['q-entregas-pendentes'],
  },
  {
    tipo: 'MATERIALIZADA',
    esquema: 'relatorios',
    nome: 'vendas_diarias',
    dono: 'loja_analise',
    descricao: 'Pedidos, itens vendidos e faturamento por dia e por categoria, para os painéis de vendas.',
    definicao: ` SELECT date_trunc('day'::text, p.criado_em) AS dia,
    pr.categoria_id,
    count(DISTINCT p.id) AS pedidos,
    sum(i.quantidade) AS itens,
    sum(i.quantidade::numeric * i.preco_unitario) AS faturamento
   FROM pedidos p
     JOIN itens_pedido i ON i.pedido_id = p.id
     JOIN produtos pr ON pr.id = i.produto_id
  WHERE p.status = 'PAGO'::text
  GROUP BY (date_trunc('day'::text, p.criado_em)), pr.categoria_id;`,
    colunas: [
      ['dia', 'timestamp with time zone'],
      ['categoria_id', 'bigint'],
      ['pedidos', 'bigint'],
      ['itens', 'bigint'],
      ['faturamento', 'numeric'],
    ],
    dependeDe: [
      ['TABELA', 'public', 'pedidos'],
      ['TABELA', 'public', 'itens_pedido'],
      ['TABELA', 'public', 'produtos'],
    ],
    leitoras: [],
    materializacao: { populada: true, tamanhoBytes: 1_458_176, linhas: 8_772, atualizacao: 'q-visao-vendas-diarias' },
  },
  {
    tipo: 'MATERIALIZADA',
    esquema: 'relatorios',
    nome: 'resumo_avaliacoes',
    dono: 'loja_analise',
    descricao: 'A nota média e o total de avaliações de cada produto, mostrados na página do produto.',
    definicao: ` SELECT avaliacoes.produto_id,
    round(avg(avaliacoes.nota), 2) AS nota_media,
    count(*) AS total_avaliacoes
   FROM avaliacoes
  GROUP BY avaliacoes.produto_id;`,
    colunas: [
      ['produto_id', 'bigint'],
      ['nota_media', 'numeric'],
      ['total_avaliacoes', 'bigint'],
    ],
    dependeDe: [['TABELA', 'public', 'avaliacoes']],
    leitoras: ['q-avaliacoes-media'],
    materializacao: { populada: true, tamanhoBytes: 5_545_984, linhas: 86_412, atualizacao: null },
  },
  {
    tipo: 'MATERIALIZADA',
    esquema: 'relatorios',
    nome: 'estoque_por_categoria',
    dono: 'loja_analise',
    descricao: 'O estoque disponível somado por categoria.',
    definicao: ` SELECT c.id AS categoria_id,
    c.nome AS categoria,
    sum(d.disponivel) AS disponivel
   FROM estoque_disponivel d
     JOIN categorias c ON c.id = d.categoria_id
  GROUP BY c.id, c.nome;`,
    colunas: [
      ['categoria_id', 'bigint'],
      ['categoria', 'text'],
      ['disponivel', 'bigint'],
    ],
    dependeDe: [
      ['VISAO', 'public', 'estoque_disponivel'],
      ['TABELA', 'public', 'categorias'],
    ],
    leitoras: [],
    materializacao: { populada: false, tamanhoBytes: 0, linhas: 0, atualizacao: null },
  },
  {
    tipo: 'COMUM',
    esquema: 'auditoria',
    nome: 'acoes_recentes',
    dono: 'loja_auditoria',
    descricao: 'As ações registradas nos últimos 7 dias, com o nome de quem as fez.',
    definicao: ` SELECT a.id,
    a.acao,
    a.alvo,
    u.nome AS usuario,
    a.criado_em
   FROM auditoria a
     JOIN usuarios u ON u.id = a.usuario_id
  WHERE a.criado_em >= (now() - '7 days'::interval);`,
    colunas: [
      ['id', 'bigint'],
      ['acao', 'text'],
      ['alvo', 'text'],
      ['usuario', 'text'],
      ['criado_em', 'timestamp with time zone'],
    ],
    dependeDe: [
      ['TABELA', 'public', 'auditoria'],
      ['TABELA', 'public', 'usuarios'],
    ],
    leitoras: [],
  },
];

function tipoDoObjeto(visao: VisaoFicticia): TipoObjetoBanco {
  return visao.tipo === 'MATERIALIZADA' ? 'VISAO_MATERIALIZADA' : 'VISAO';
}

function referencia([tipo, esquema, nome]: [TipoObjetoBanco, string, string]): ReferenciaObjetoDTO {
  return { tipo, esquema, nome };
}

function coluna([nome, tipo]: [string, string]): ColunaVisaoDTO {
  return { nome, tipo };
}

export function ultimaExecucao(id: string, agora: Date): string | null {
  for (const periodo of periodosDaUltimaExecucao) {
    const pontos = gerarHistoricoDaConsulta(id, periodo, agora)?.pontos ?? [];
    const ultimo = pontos.filter((ponto) => ponto.quantidadeExecucoes > 0).at(-1);
    if (ultimo) return ultimo.instante;
  }
  return null;
}

function usadaPor(visao: VisaoFicticia): ReferenciaObjetoDTO[] {
  const id = idDoObjeto(visao);
  return visoesFicticias
    .filter((outra) => outra.dependeDe.some(([, esquema, nome]) => idDoObjeto({ esquema, nome }) === id))
    .map((outra) => ({ tipo: tipoDoObjeto(outra), esquema: outra.esquema, nome: outra.nome }));
}

export function gerarVisoes(agora: Date, vazio = false): ListaVisoesDTO {
  if (vazio) return { geradoEm: agora.toISOString(), visoes: [] };

  const consultas = new Map<string, ConsultaDetalhadaDTO>(
    gerarConsultasDetalhadas(PERIODO_DAS_LEITURAS, agora).map((consulta) => [consulta.id, consulta]),
  );
  const daLista = (id: string) => consultas.get(id) ?? null;

  const visoes = visoesFicticias.map((visao): VisaoDTO => {
    const materializacao = visao.materializacao;
    const atualizacao = materializacao?.atualizacao ? daLista(materializacao.atualizacao) : null;
    const atualizadaNoPeriodo = atualizacao !== null && atualizacao.quantidadeExecucoes > 0;

    return {
      id: idDoObjeto(visao),
      tipo: visao.tipo,
      esquema: visao.esquema,
      nome: visao.nome,
      dono: visao.dono,
      descricao: visao.descricao,
      definicao: visao.definicao,
      colunas: visao.colunas.map(coluna),
      dependeDe: visao.dependeDe.map(referencia),
      usadaPor: usadaPor(visao),
      consultas: visao.leitoras
        .map(daLista)
        .filter((consulta): consulta is ConsultaDetalhadaDTO => consulta !== null)
        .sort((a, b) => b.percentualTempoTotal - a.percentualTempoTotal),
      materializacao: materializacao
        ? {
            populada: materializacao.populada,
            tamanhoBytes: materializacao.tamanhoBytes,
            linhas: materializacao.linhas,
            ultimaAtualizacao:
              atualizadaNoPeriodo && materializacao.atualizacao ? ultimaExecucao(materializacao.atualizacao, agora) : null,
            atualizacao,
          }
        : null,
    };
  });

  return { geradoEm: agora.toISOString(), visoes };
}
