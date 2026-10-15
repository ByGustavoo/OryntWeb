export interface ConsultaFicticia {
  id: string;
  sql: string;
  tempoMedioMs: number;
  participacaoExecucoes: number;
  linhasPorExecucao: number;
}

interface ConsultaSecundaria {
  id: string;
  sql: string;
  tempoRelativo: number;
  pesoExecucoes: number;
  linhasPorExecucao: number;
}

export const TEMPO_MEDIO_OUTRAS_MS = 4.5;

export const consultasFicticias: ConsultaFicticia[] = [
  {
    id: 'q-usuarios-email',
    sql: 'SELECT id, email FROM usuarios WHERE lower(email) = lower($1)',
    tempoMedioMs: 268,
    participacaoExecucoes: 0.05,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-pedidos-cliente',
    sql: 'SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY criado_em DESC',
    tempoMedioMs: 184,
    participacaoExecucoes: 0.06,
    linhasPorExecucao: 14.2,
  },
  {
    id: 'q-produtos-busca',
    sql: 'SELECT p.*, e.quantidade FROM produtos p JOIN estoque e ON e.produto_id = p.id WHERE p.nome ILIKE $1',
    tempoMedioMs: 356,
    participacaoExecucoes: 0.012,
    linhasPorExecucao: 23.6,
  },
  {
    id: 'q-faturamento-30-dias',
    sql: "SELECT sum(total) FROM pedidos WHERE status = $1 AND criado_em >= now() - interval '30 days'",
    tempoMedioMs: 742,
    participacaoExecucoes: 0.004,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-produtos-categoria',
    sql: 'SELECT p.id, p.nome, p.preco FROM produtos p WHERE p.categoria_id = $1 AND p.ativo ORDER BY p.criado_em DESC LIMIT $2',
    tempoMedioMs: 12.4,
    participacaoExecucoes: 0.21,
    linhasPorExecucao: 19.4,
  },
  {
    id: 'q-ranking-clientes',
    sql: 'SELECT c.id, c.nome, count(p.id) AS total_pedidos FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id GROUP BY c.id ORDER BY total_pedidos DESC LIMIT 50',
    tempoMedioMs: 1840,
    participacaoExecucoes: 0.0009,
    linhasPorExecucao: 50,
  },
  {
    id: 'q-estoque-baixa',
    sql: 'UPDATE estoque SET quantidade = quantidade - $1 WHERE produto_id = $2',
    tempoMedioMs: 6.1,
    participacaoExecucoes: 0.09,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-sessoes-limpeza',
    sql: 'DELETE FROM sessoes WHERE expira_em < now()',
    tempoMedioMs: 2310,
    participacaoExecucoes: 0.0002,
    linhasPorExecucao: 1864,
  },
  {
    id: 'q-itens-pedido',
    sql: 'INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)',
    tempoMedioMs: 3.2,
    participacaoExecucoes: 0.11,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-sessoes-token',
    sql: 'SELECT * FROM sessoes WHERE token = $1 AND expira_em > now()',
    tempoMedioMs: 1.8,
    participacaoExecucoes: 0.17,
    linhasPorExecucao: 0.9,
  },
];

const secundarias: ConsultaSecundaria[] = [
  { id: 'q-usuarios-id', sql: 'SELECT * FROM usuarios WHERE id = $1', tempoRelativo: 0.9, pesoExecucoes: 60, linhasPorExecucao: 1 },
  {
    id: 'q-clientes-id',
    sql: 'SELECT id, nome, email, telefone FROM clientes WHERE id = $1',
    tempoRelativo: 1.1,
    pesoExecucoes: 34,
    linhasPorExecucao: 1,
  },
  { id: 'q-pedidos-id', sql: 'SELECT * FROM pedidos WHERE id = $1', tempoRelativo: 1.2, pesoExecucoes: 28, linhasPorExecucao: 1 },
  {
    id: 'q-itens-do-pedido',
    sql: 'SELECT i.produto_id, i.quantidade, i.preco_unitario, p.nome FROM itens_pedido i JOIN produtos p ON p.id = i.produto_id WHERE i.pedido_id = $1',
    tempoRelativo: 4.8,
    pesoExecucoes: 22,
    linhasPorExecucao: 3.4,
  },
  {
    id: 'q-produtos-id',
    sql: 'SELECT id, nome, preco, ativo FROM produtos WHERE id = $1',
    tempoRelativo: 0.8,
    pesoExecucoes: 46,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-categorias-ativas',
    sql: 'SELECT id, nome, slug FROM categorias WHERE ativa ORDER BY posicao',
    tempoRelativo: 2.6,
    pesoExecucoes: 9,
    linhasPorExecucao: 18,
  },
  {
    id: 'q-estoque-produto',
    sql: 'SELECT quantidade FROM estoque WHERE produto_id = $1',
    tempoRelativo: 0.7,
    pesoExecucoes: 30,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-carrinho-usuario',
    sql: 'SELECT c.id, i.produto_id, i.quantidade FROM carrinhos c JOIN itens_carrinho i ON i.carrinho_id = c.id WHERE c.usuario_id = $1',
    tempoRelativo: 5.6,
    pesoExecucoes: 14,
    linhasPorExecucao: 2.8,
  },
  {
    id: 'q-carrinho-item-novo',
    sql: 'INSERT INTO itens_carrinho (carrinho_id, produto_id, quantidade) VALUES ($1, $2, $3)',
    tempoRelativo: 2.9,
    pesoExecucoes: 8,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-carrinho-item-quantidade',
    sql: 'UPDATE itens_carrinho SET quantidade = $1 WHERE carrinho_id = $2 AND produto_id = $3',
    tempoRelativo: 3.4,
    pesoExecucoes: 5,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-carrinho-item-remocao',
    sql: 'DELETE FROM itens_carrinho WHERE carrinho_id = $1 AND produto_id = $2',
    tempoRelativo: 3.1,
    pesoExecucoes: 3,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-pedido-novo',
    sql: 'INSERT INTO pedidos (cliente_id, status, total, criado_em) VALUES ($1, $2, $3, now()) RETURNING id',
    tempoRelativo: 6.4,
    pesoExecucoes: 4,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-pedido-status',
    sql: 'UPDATE pedidos SET status = $1, atualizado_em = now() WHERE id = $2',
    tempoRelativo: 7.8,
    pesoExecucoes: 6,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-pagamento-novo',
    sql: 'INSERT INTO pagamentos (pedido_id, metodo, valor, situacao) VALUES ($1, $2, $3, $4)',
    tempoRelativo: 5.2,
    pesoExecucoes: 3.6,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-pagamentos-pedido',
    sql: 'SELECT id, metodo, valor, situacao FROM pagamentos WHERE pedido_id = $1',
    tempoRelativo: 1.9,
    pesoExecucoes: 5,
    linhasPorExecucao: 1.2,
  },
  {
    id: 'q-enderecos-cliente',
    sql: 'SELECT * FROM enderecos WHERE cliente_id = $1 ORDER BY principal DESC',
    tempoRelativo: 2.2,
    pesoExecucoes: 6,
    linhasPorExecucao: 1.6,
  },
  {
    id: 'q-cupom-codigo',
    sql: 'SELECT id, desconto, valido_ate FROM cupons WHERE codigo = $1 AND valido_ate >= now()',
    tempoRelativo: 1.4,
    pesoExecucoes: 3,
    linhasPorExecucao: 0.4,
  },
  {
    id: 'q-cupom-uso',
    sql: 'UPDATE cupons SET usos = usos + 1 WHERE id = $1',
    tempoRelativo: 3.8,
    pesoExecucoes: 1.1,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-avaliacoes-produto',
    sql: 'SELECT a.nota, a.comentario, u.nome FROM avaliacoes a JOIN usuarios u ON u.id = a.usuario_id WHERE a.produto_id = $1 ORDER BY a.criado_em DESC LIMIT $2',
    tempoRelativo: 14.6,
    pesoExecucoes: 7,
    linhasPorExecucao: 8.2,
  },
  {
    id: 'q-avaliacoes-media',
    sql: 'SELECT avg(nota), count(*) FROM avaliacoes WHERE produto_id = $1',
    tempoRelativo: 9.8,
    pesoExecucoes: 7,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-avaliacao-nova',
    sql: 'INSERT INTO avaliacoes (produto_id, usuario_id, nota, comentario) VALUES ($1, $2, $3, $4)',
    tempoRelativo: 4.1,
    pesoExecucoes: 0.6,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-favoritos-usuario',
    sql: 'SELECT produto_id FROM favoritos WHERE usuario_id = $1',
    tempoRelativo: 1.6,
    pesoExecucoes: 5,
    linhasPorExecucao: 6.3,
  },
  {
    id: 'q-favorito-remocao',
    sql: 'DELETE FROM favoritos WHERE usuario_id = $1 AND produto_id = $2',
    tempoRelativo: 2.7,
    pesoExecucoes: 0.7,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-notificacoes-nao-lidas',
    sql: 'SELECT count(*) FROM notificacoes WHERE usuario_id = $1 AND lida_em IS NULL',
    tempoRelativo: 3.3,
    pesoExecucoes: 24,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-notificacoes-lidas',
    sql: 'UPDATE notificacoes SET lida_em = now() WHERE usuario_id = $1 AND lida_em IS NULL',
    tempoRelativo: 8.9,
    pesoExecucoes: 2.4,
    linhasPorExecucao: 3.7,
  },
  {
    id: 'q-sessao-nova',
    sql: 'INSERT INTO sessoes (usuario_id, token, expira_em) VALUES ($1, $2, $3)',
    tempoRelativo: 2.4,
    pesoExecucoes: 4.4,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-usuario-ultimo-acesso',
    sql: 'UPDATE usuarios SET ultimo_acesso_em = now() WHERE id = $1',
    tempoRelativo: 3.6,
    pesoExecucoes: 4.4,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-auditoria-nova',
    sql: 'INSERT INTO auditoria (usuario_id, acao, alvo, criado_em) VALUES ($1, $2, $3, now())',
    tempoRelativo: 1.7,
    pesoExecucoes: 16,
    linhasPorExecucao: 1,
  },
  {
    id: 'q-entregas-pendentes',
    sql: 'SELECT e.id, e.pedido_id, e.previsao FROM entregas e WHERE e.situacao = $1 ORDER BY e.previsao LIMIT $2',
    tempoRelativo: 24,
    pesoExecucoes: 0.9,
    linhasPorExecucao: 40,
  },
  { id: 'q-confirmacao-transacao', sql: 'COMMIT', tempoRelativo: 0.6, pesoExecucoes: 55, linhasPorExecucao: 0 },
  { id: 'q-estatisticas-pedidos', sql: 'ANALYZE pedidos', tempoRelativo: 22, pesoExecucoes: 0.02, linhasPorExecucao: 0 },
  {
    id: 'q-visao-vendas-diarias',
    sql: 'REFRESH MATERIALIZED VIEW CONCURRENTLY vendas_diarias',
    tempoRelativo: 30,
    pesoExecucoes: 0.01,
    linhasPorExecucao: 0,
  },
];

const participacaoListada = consultasFicticias.reduce((soma, consulta) => soma + consulta.participacaoExecucoes, 0);
const pesoDasSecundarias = secundarias.reduce((soma, consulta) => soma + consulta.pesoExecucoes, 0);
const tempoRelativoMedio =
  secundarias.reduce((soma, consulta) => soma + consulta.pesoExecucoes * consulta.tempoRelativo, 0) / pesoDasSecundarias;

export const consultasSecundarias: ConsultaFicticia[] = secundarias.map((consulta) => ({
  id: consulta.id,
  sql: consulta.sql,
  tempoMedioMs: (consulta.tempoRelativo / tempoRelativoMedio) * TEMPO_MEDIO_OUTRAS_MS,
  participacaoExecucoes: (consulta.pesoExecucoes / pesoDasSecundarias) * (1 - participacaoListada),
  linhasPorExecucao: consulta.linhasPorExecucao,
}));

export const CONSULTAS_DISTINTAS = consultasFicticias.length + consultasSecundarias.length;

export const TEMPO_MEDIO_GERAL_MS =
  consultasFicticias.reduce((soma, consulta) => soma + consulta.participacaoExecucoes * consulta.tempoMedioMs, 0) +
  (1 - participacaoListada) * TEMPO_MEDIO_OUTRAS_MS;
