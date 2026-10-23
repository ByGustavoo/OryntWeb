import { describe, expect, it } from 'vitest';
import { situacoesDaTabela, tamanhoTotal } from '@/regras/tabelas';
import { idDoObjeto } from '@/regras/visoes';
import { gerarConsultasDetalhadas } from './consultas';
import { gerarIndices, planosDasConsultas, tabelasFicticias } from './indices';
import { gerarTabelas } from './tabelas';
import { ultimaExecucao, visoesFicticias } from './visoes';

const agora = new Date(2026, 9, 19, 15, 0);
const dados = gerarTabelas(agora);
const indices = gerarIndices(agora);
const porNome = new Map(dados.tabelas.map((tabela) => [tabela.nome, tabela]));
const lista = gerarConsultasDetalhadas('ULTIMOS_30_DIAS', agora);
const consultas = new Map(lista.map((consulta) => [consulta.id, consulta]));
const planos = planosDasConsultas(lista, agora);

function tabela(nome: string) {
  const encontrada = porNome.get(nome);
  if (!encontrada) throw new Error(`Falta a tabela ${nome}.`);
  return encontrada;
}

function execucoes(id: string): number {
  return consultas.get(id)?.quantidadeExecucoes ?? Number.NaN;
}

describe('gerarTabelas', () => {
  it('lista as tabelas comuns do catálogo e deixa as views materializadas para Views', () => {
    const comuns = tabelasFicticias.filter((candidata) => candidata.tipo === 'TABELA').map((candidata) => candidata.nome);
    expect(dados.tabelas.map((atual) => atual.nome)).toEqual(comuns);
    expect(porNome.has('vendas_diarias')).toBe(false);
  });

  it('soma os índices e as leituras por índice de cada tabela com os números de Índices', () => {
    for (const atual of dados.tabelas) {
      const daTabela = indices.indices.filter((indice) => idDoObjeto(indice.tabela) === atual.id);
      expect(atual.tamanhoIndicesBytes, atual.id).toBe(daTabela.reduce((soma, indice) => soma + indice.tamanhoBytes, 0));
      expect(atual.leiturasPorIndice, atual.id).toBe(daTabela.reduce((soma, indice) => soma + indice.leituras, 0));
      expect(atual.indices.map((indice) => indice.id)).toEqual(daTabela.map((indice) => indice.id));
    }
  });

  it('tira as gravações das consultas que gravam em cada tabela', () => {
    expect(tabela('pedidos').insercoes).toBe(execucoes('q-pedido-novo'));
    expect(tabela('pedidos').atualizacoes).toBe(execucoes('q-pedido-status'));
    expect(tabela('itens_carrinho').exclusoes).toBe(execucoes('q-carrinho-item-remocao'));
    expect(tabela('sessoes').exclusoes).toBe(execucoes('q-sessoes-limpeza') * 15);
  });

  it('conta as leituras inteiras pelos Seq Scan dos planos atuais', () => {
    const pedidos = tabela('pedidos');
    expect(pedidos.leituras.filter((leitura) => leitura.etapa === 'Seq Scan').map((leitura) => leitura.consulta.id)).toEqual([
      'q-pedidos-cliente',
      'q-faturamento-30-dias',
      'q-ranking-clientes',
    ]);
    const daVersaoAtual = (id: string) => planos.find((plano) => plano.consulta.id === id)?.versoes[0]?.quantidadeExecucoes ?? 0;
    expect(daVersaoAtual('q-pedidos-cliente')).toBeLessThan(execucoes('q-pedidos-cliente'));
    expect(pedidos.leiturasSequenciais).toBe(
      daVersaoAtual('q-pedidos-cliente') + daVersaoAtual('q-faturamento-30-dias') + daVersaoAtual('q-ranking-clientes'),
    );
    expect(tabela('itens_pedido').leiturasSequenciais).toBe(0);
  });

  it('termina o crescimento no tamanho e nas linhas de hoje e começa antes das gravações do período', () => {
    for (const atual of dados.tabelas) {
      expect(atual.crescimento).toHaveLength(31);
      const ultimo = atual.crescimento.at(-1);
      expect(ultimo?.linhas, atual.id).toBe(atual.linhas);
      expect(Math.abs((ultimo?.tamanhoBytes ?? 0) - tamanhoTotal(atual)), atual.id).toBeLessThanOrEqual(1);
      expect(atual.crescimento[0]?.linhas, atual.id).toBe(atual.linhas - (atual.insercoes - atual.exclusoes));
    }
  });

  it('faz notificacoes crescer sem novas linhas, porque o autovacuum dela está desligado', () => {
    const notificacoes = tabela('notificacoes');
    const [primeiro] = notificacoes.crescimento;
    expect(primeiro?.linhas).toBe(notificacoes.linhas);
    expect((primeiro?.tamanhoBytes ?? 0) < tamanhoTotal(notificacoes)).toBe(true);
  });

  it('soma as partições de auditoria e leva a idade da mais antiga', () => {
    const auditoria = tabela('auditoria');
    const particoes = auditoria.particionamento?.particoes ?? [];
    expect(particoes.map((particao) => particao.nome)).toEqual(
      [2020, 2021, 2022, 2023, 2024, 2025, 2026].map((ano) => `auditoria_${ano}`),
    );
    expect(particoes.reduce((soma, particao) => soma + particao.linhas, 0)).toBe(auditoria.linhas);
    expect(auditoria.idadeTransacoes).toBe(particoes[0]?.idadeTransacoes);
    expect(auditoria.chavePrimaria).toEqual(['id', 'criado_em']);
  });

  it('marca cada caso desenhado e deixa as outras tabelas em dia', () => {
    const situacoes = Object.fromEntries(dados.tabelas.map((atual) => [atual.nome, situacoesDaTabela(atual)]));
    expect(situacoes).toMatchObject({
      auditoria: ['IDADE_ALTA'],
      notificacoes: ['PRECISA_VACUUM', 'ESTATISTICAS_DESATUALIZADAS'],
      usuarios: ['LIDA_INTEIRA'],
      clientes: ['LIDA_INTEIRA'],
      pedidos: ['LIDA_INTEIRA'],
      produtos: ['LIDA_INTEIRA'],
      sessoes: ['LIDA_INTEIRA', 'ESTATISTICAS_DESATUALIZADAS'],
      importacoes_legado: ['SEM_CHAVE_PRIMARIA'],
    });
    const comCaso = new Set(['auditoria', 'notificacoes', 'usuarios', 'clientes', 'pedidos', 'produtos', 'sessoes', 'importacoes_legado']);
    for (const atual of dados.tabelas.filter((candidata) => !comCaso.has(candidata.nome))) {
      expect(situacoesDaTabela(atual), atual.id).toEqual([]);
    }
  });

  it('leva as sugestões dos planos para a tabela que elas pedem', () => {
    for (const sugestao of indices.sugestoes) {
      const alvo = dados.tabelas.find((atual) => atual.id === sugestao.tabela);
      expect(alvo?.indicesSugeridos.map((sugerido) => sugerido.comando), sugestao.comando).toContain(sugestao.comando);
    }
  });

  it('liga cada tabela às views que dependem dela', () => {
    for (const atual of dados.tabelas) {
      const esperadas = visoesFicticias
        .filter((visao) => visao.dependeDe.some(([tipo, esquema, nome]) => tipo === 'TABELA' && `${esquema}.${nome}` === atual.id))
        .map((visao) => idDoObjeto(visao));
      expect(atual.usadaPor.map(idDoObjeto), atual.id).toEqual(esperadas);
    }
  });

  it('tira o último ANALYZE de pedidos do histórico do comando', () => {
    expect(tabela('pedidos').ultimoAnalyze).toBe(ultimaExecucao('q-estatisticas-pedidos', agora));
  });

  it('devolve a lista vazia quando pedido', () => {
    expect(gerarTabelas(agora, true).tabelas).toEqual([]);
  });
});
