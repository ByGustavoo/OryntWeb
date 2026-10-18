import { describe, expect, it } from 'vitest';
import { idDaTabela, situacaoDoIndice, sobreposicoesDosIndices } from '@/regras/indices';
import { gerarConsultasDetalhadas } from './consultas';
import { gerarIndices, leiturasDosPlanos, planosDasConsultas } from './indices';
import { marcoDoDegrau } from './trocasDePlano';

const agora = new Date(2026, 9, 18, 10, 47);
const dados = gerarIndices(agora);
const porNome = new Map(dados.indices.map((indice) => [indice.nome, indice]));
const contexto = {
  geradoEm: dados.geradoEm,
  coletaDesde: dados.coletaDesde,
  sobreposicoes: sobreposicoesDosIndices(dados.indices),
};
const lista = gerarConsultasDetalhadas('ULTIMOS_30_DIAS', agora);
const leituras = leiturasDosPlanos(planosDasConsultas(lista, agora), agora);

function indice(nome: string) {
  const encontrado = porNome.get(nome);
  if (!encontrado) throw new Error(`Falta o índice ${nome}.`);
  return encontrado;
}

describe('gerarIndices', () => {
  it('tem no catálogo todo índice que um plano lê, na tabela que o plano cita', () => {
    for (const leitura of leituras) {
      const lido = indice(leitura.indice);
      if (leitura.relacao) expect(lido.tabela.nome, leitura.indice).toBe(leitura.relacao);
    }
  });

  it('conta as leituras pelas execuções do plano atual de cada consulta', () => {
    for (const atual of dados.indices) {
      const esperadas = atual.valido
        ? leituras
            .filter((leitura) => leitura.indice === atual.nome && leitura.uso.usadoAte === null)
            .reduce((soma, leitura) => soma + leitura.execucoes * leitura.uso.leiturasPorExecucao, 0)
        : 0;
      expect(atual.leituras, atual.id).toBe(esperadas);
    }
  });

  it('liga o índice inválido à troca de plano dos pedidos por cliente', () => {
    const invalido = indice('pedidos_cliente_id_idx');
    expect(invalido.valido).toBe(false);
    expect(invalido.leituras).toBe(0);
    expect(new Date(invalido.observadoDesde).getTime()).toBe(marcoDoDegrau(agora));
    expect(invalido.usos).toHaveLength(1);
    expect(invalido.usos[0]?.consulta.id).toBe('q-pedidos-cliente');
    expect(invalido.usos[0]?.usadoAte).not.toBeNull();
    expect(new Date(invalido.usos[0]?.usadoAte ?? 0).getTime()).toBeLessThan(marcoDoDegrau(agora));
  });

  it('traz uma sugestão por comando dos planos, nenhuma para um índice que já existe', () => {
    const comandos = dados.sugestoes.map((sugestao) => sugestao.comando);
    expect(new Set(comandos).size).toBe(comandos.length);
    expect(dados.sugestoes.map((sugestao) => sugestao.consultas.map((consulta) => consulta.id)).flat()).toEqual([
      'q-usuarios-email',
      'q-pedidos-cliente',
      'q-produtos-busca',
      'q-faturamento-30-dias',
      'q-sessoes-limpeza',
    ]);
    for (const sugestao of dados.sugestoes) {
      const nome = /INDEX CONCURRENTLY (\w+)/.exec(sugestao.comando)?.[1] ?? '';
      expect(porNome.has(nome), nome).toBe(false);
    }
  });

  it('soma as gravações das tabelas a partir das consultas que gravam nelas', () => {
    const daLista = new Map(lista.map((consulta) => [consulta.id, consulta]));
    const pedidos = indice('pedidos_pkey').tabela;
    expect(pedidos.insercoes).toBe(daLista.get('q-pedido-novo')?.quantidadeExecucoes);
    expect(pedidos.atualizacoes).toBe(daLista.get('q-pedido-status')?.quantidadeExecucoes);
    expect(pedidos.atualizacoesHot).toBe(0);
    const usuarios = indice('usuarios_pkey').tabela;
    expect(usuarios.atualizacoesHot).toBeGreaterThan(0);
    expect(usuarios.atualizacoesHot).toBeLessThanOrEqual(usuarios.atualizacoes);
  });

  it('mostra cada situação que a tela aponta', () => {
    const situacao = (nome: string) => situacaoDoIndice(indice(nome), contexto);
    expect(situacao('pedidos_cliente_id_idx')).toBe('INVALIDO');
    expect(situacao('usuarios_email_idx')).toBe('DUPLICADO');
    expect(situacao('usuarios_email_key')).toBe('GARANTE_UNICIDADE');
    expect(situacao('avaliacoes_produto_id_idx')).toBe('REDUNDANTE');
    expect(situacao('cupons_valido_ate_idx')).toBe('EM_OBSERVACAO');
    expect(['pedidos_atualizado_em_idx', 'sessoes_usuario_id_idx', 'auditoria_alvo_idx'].map(situacao)).toEqual([
      'SEM_USO',
      'SEM_USO',
      'SEM_USO',
    ]);
  });

  it('identifica cada índice pelo esquema da sua tabela', () => {
    for (const atual of dados.indices) {
      expect(atual.id).toBe(`${atual.esquema}.${atual.nome}`);
      expect(idDaTabela(atual).startsWith(`${atual.esquema}.`)).toBe(true);
      expect(atual.definicao).toContain(`ON ${idDaTabela(atual)} USING`);
    }
  });

  it('devolve listas vazias quando o banco não tem dados', () => {
    const vazio = gerarIndices(agora, true);
    expect(vazio.indices).toEqual([]);
    expect(vazio.sugestoes).toEqual([]);
  });
});
