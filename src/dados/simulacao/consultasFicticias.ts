export interface ConsultaFicticia {
  id: string;
  sql: string;
  tempoMedioMs: number;
  participacaoExecucoes: number;
}

export const CONSULTAS_DISTINTAS = 42;
export const TEMPO_MEDIO_OUTRAS_MS = 4.5;

export const consultasFicticias: ConsultaFicticia[] = [
  {
    id: 'q-usuarios-email',
    sql: 'SELECT id, email FROM usuarios WHERE lower(email) = lower($1)',
    tempoMedioMs: 268,
    participacaoExecucoes: 0.05,
  },
  {
    id: 'q-pedidos-cliente',
    sql: 'SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY criado_em DESC',
    tempoMedioMs: 184,
    participacaoExecucoes: 0.06,
  },
  {
    id: 'q-produtos-busca',
    sql: 'SELECT p.*, e.quantidade FROM produtos p JOIN estoque e ON e.produto_id = p.id WHERE p.nome ILIKE $1',
    tempoMedioMs: 356,
    participacaoExecucoes: 0.012,
  },
  {
    id: 'q-faturamento-30-dias',
    sql: "SELECT sum(total) FROM pedidos WHERE status = $1 AND criado_em >= now() - interval '30 days'",
    tempoMedioMs: 742,
    participacaoExecucoes: 0.004,
  },
  {
    id: 'q-produtos-categoria',
    sql: 'SELECT p.id, p.nome, p.preco FROM produtos p WHERE p.categoria_id = $1 AND p.ativo ORDER BY p.criado_em DESC LIMIT $2',
    tempoMedioMs: 12.4,
    participacaoExecucoes: 0.21,
  },
  {
    id: 'q-ranking-clientes',
    sql: 'SELECT c.id, c.nome, count(p.id) AS total_pedidos FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id GROUP BY c.id ORDER BY total_pedidos DESC LIMIT 50',
    tempoMedioMs: 1840,
    participacaoExecucoes: 0.0009,
  },
  {
    id: 'q-estoque-baixa',
    sql: 'UPDATE estoque SET quantidade = quantidade - $1 WHERE produto_id = $2',
    tempoMedioMs: 6.1,
    participacaoExecucoes: 0.09,
  },
  {
    id: 'q-sessoes-limpeza',
    sql: 'DELETE FROM sessoes WHERE expira_em < now()',
    tempoMedioMs: 2310,
    participacaoExecucoes: 0.0002,
  },
  {
    id: 'q-itens-pedido',
    sql: 'INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)',
    tempoMedioMs: 3.2,
    participacaoExecucoes: 0.11,
  },
  {
    id: 'q-sessoes-token',
    sql: 'SELECT * FROM sessoes WHERE token = $1 AND expira_em > now()',
    tempoMedioMs: 1.8,
    participacaoExecucoes: 0.17,
  },
];

const participacaoListada = consultasFicticias.reduce((soma, consulta) => soma + consulta.participacaoExecucoes, 0);

export const TEMPO_MEDIO_GERAL_MS =
  consultasFicticias.reduce((soma, consulta) => soma + consulta.participacaoExecucoes * consulta.tempoMedioMs, 0) +
  (1 - participacaoListada) * TEMPO_MEDIO_OUTRAS_MS;
