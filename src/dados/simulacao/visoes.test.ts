import { describe, expect, it } from 'vitest';
import { idDoObjeto, situacaoDaMaterializada, visoesSemLeitura } from '@/regras/visoes';
import { gerarConsultasDetalhadas } from './consultas';
import { gerarHistoricoDaConsulta } from './historicoConsulta';
import { gerarVisoes } from './visoes';

const agora = new Date(2026, 9, 14, 10, 47);
const { geradoEm, visoes } = gerarVisoes(agora);
const porId = new Map(visoes.map((visao) => [visao.id, visao]));

function visao(id: string) {
  const encontrada = porId.get(id);
  if (!encontrada) throw new Error(`Falta a visão ${id}.`);
  return encontrada;
}

describe('gerarVisoes', () => {
  it('liga cada dependência entre visões nos dois sentidos', () => {
    for (const atual of visoes) {
      for (const referencia of atual.dependeDe.filter((objeto) => objeto.tipo !== 'TABELA')) {
        const dependida = visao(idDoObjeto(referencia));
        expect(dependida.tipo === 'MATERIALIZADA', atual.id).toBe(referencia.tipo === 'VISAO_MATERIALIZADA');
        expect(dependida.usadaPor.map(idDoObjeto), atual.id).toContain(atual.id);
      }
      for (const referencia of atual.usadaPor) {
        expect(visao(idDoObjeto(referencia)).dependeDe.map(idDoObjeto), atual.id).toContain(atual.id);
      }
    }
  });

  it('cita a visão no SQL de cada consulta que a lê e de cada atualização', () => {
    for (const atual of visoes) {
      for (const consulta of atual.consultas) expect(consulta.sql, atual.id).toContain(atual.nome);
      const atualizacao = atual.materializacao?.atualizacao;
      if (atualizacao) expect(atualizacao.sql).toBe(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${atual.id}`);
    }
  });

  it('usa os números de 30 dias da lista de consultas', () => {
    const daLista = new Map(gerarConsultasDetalhadas('ULTIMOS_30_DIAS', agora).map((consulta) => [consulta.id, consulta]));
    for (const consulta of visoes.flatMap((atual) => atual.consultas)) {
      expect(consulta).toEqual(daLista.get(consulta.id));
    }
  });

  it('data a última atualização pela última execução do REFRESH no Histórico', () => {
    const vendas = visao('relatorios.vendas_diarias');
    const pontos = gerarHistoricoDaConsulta('q-visao-vendas-diarias', 'ULTIMOS_30_DIAS', agora)?.pontos ?? [];
    const ultimoDia = pontos.filter((ponto) => ponto.quantidadeExecucoes > 0).at(-1)?.instante ?? '';
    const ultima = vendas.materializacao?.ultimaAtualizacao ?? '';

    expect(vendas.materializacao?.atualizacao?.quantidadeExecucoes).toBeGreaterThan(0);
    expect(new Date(ultima).getTime()).toBeGreaterThanOrEqual(new Date(ultimoDia).getTime());
    expect(new Date(ultima).getTime()).toBeLessThanOrEqual(agora.getTime());
    expect(situacaoDaMaterializada(vendas, geradoEm)).toBe('ATUALIZADA');
  });

  it('tem uma materializada desatualizada que ainda é lida e uma sem dados', () => {
    const avaliacoes = visao('relatorios.resumo_avaliacoes');
    expect(situacaoDaMaterializada(avaliacoes, geradoEm)).toBe('DESATUALIZADA');
    expect(avaliacoes.consultas.length).toBeGreaterThan(0);
    expect(situacaoDaMaterializada(visao('relatorios.estoque_por_categoria'), geradoEm)).toBe('NAO_POPULADA');
  });

  it('deixa sem leitura só as visões que nenhuma consulta lê, nem por outra visão', () => {
    expect([...visoesSemLeitura(visoes)].sort()).toEqual([
      'auditoria.acoes_recentes',
      'public.estoque_disponivel',
      'relatorios.estoque_por_categoria',
      'relatorios.vendas_diarias',
    ]);
  });

  it('fica sem visões quando os dados estão vazios', () => {
    expect(gerarVisoes(agora, true).visoes).toEqual([]);
  });
});
