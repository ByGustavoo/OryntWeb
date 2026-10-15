import { describe, expect, it } from 'vitest';
import type { NoPlanoDTO } from '@/modelos/planos';
import { filtrosIniciais } from '@/regras/filtrosConsultas';
import { PERIODO_DOS_PLANOS, diagnosticarPlano, encontrarNo, linhasDoPlano, tempoDoNoMs } from '@/regras/planoExecucao';
import { consultasFicticias, consultasSecundarias } from './consultasFicticias';
import { filtrarConsultas, gerarConsultasDetalhadas } from './consultas';
import { gerarHistoricoDaConsulta } from './historicoConsulta';
import { gerarPlanosDaConsulta, temPlano } from './planosExecucao';

const agora = new Date(2026, 9, 14, 10, 47);
const cadastro = [...consultasFicticias, ...consultasSecundarias];
const semPlano = ['q-confirmacao-transacao', 'q-estatisticas-pedidos', 'q-visao-vendas-diarias'];

function nos(raiz: NoPlanoDTO): NoPlanoDTO[] {
  return [raiz, ...raiz.filhos.flatMap(nos)];
}

describe('gerarPlanosDaConsulta', () => {
  it('tem plano para toda consulta que passa pelo planejador', () => {
    for (const consulta of cadastro) {
      expect(temPlano(consulta.id), consulta.id).toBe(!semPlano.includes(consulta.id));
      const planos = gerarPlanosDaConsulta(consulta.id, null, agora);
      expect(planos?.plano === null, consulta.id).toBe(semPlano.includes(consulta.id));
    }
  });

  it('segue a ordem de peso dos últimos 30 dias da lista Todas', () => {
    const porPeso = filtrarConsultas(gerarConsultasDetalhadas(PERIODO_DOS_PLANOS, agora), { ...filtrosIniciais, tamanhoPagina: 1 });
    const planos = gerarPlanosDaConsulta(porPeso[2]?.id ?? '', null, agora);

    expect(planos?.posicao).toBe(3);
    expect(planos?.totalDoPeriodo).toBe(cadastro.length);
    expect(planos?.idAnterior).toBe(porPeso[1]?.id);
    expect(planos?.idSeguinte).toBe(porPeso[3]?.id);
    expect(planos?.consulta).toEqual(porPeso[2]);
  });

  it('devolve planos coerentes com os números da consulta', () => {
    for (const { id } of cadastro.filter((consulta) => !semPlano.includes(consulta.id))) {
      const planos = gerarPlanosDaConsulta(id, null, agora);
      const plano = planos?.plano;
      const versao = planos?.versoes[0];
      if (!planos || !plano || !versao) throw new Error(id);

      expect(plano.id, id).toBe(versao.id);
      expect(plano.tempoExecucaoMs / versao.tempoMedioMs, id).toBeGreaterThan(0.9);
      expect(plano.tempoExecucaoMs / versao.tempoMedioMs, id).toBeLessThan(1.1);
      expect(tempoDoNoMs(plano.raiz), id).toBeLessThanOrEqual(plano.tempoExecucaoMs);

      for (const etapa of nos(plano.raiz)) {
        const dosFilhos = etapa.filhos.reduce((soma, filho) => soma + tempoDoNoMs(filho), 0);
        expect(dosFilhos, `${id} ${etapa.id}`).toBeLessThanOrEqual(tempoDoNoMs(etapa) + 0.01);
        expect(etapa.tempoInicialMs, `${id} ${etapa.id}`).toBeLessThanOrEqual(etapa.tempoTotalMs);
      }

      const ficticia = cadastro.find((consulta) => consulta.id === id);
      if (planos.consulta.tipo === 'SELECT') {
        expect(plano.raiz.linhasReais, id).toBe(Math.round(ficticia?.linhasPorExecucao ?? 0));
      }
      expect(linhasDoPlano(plano).map((linha) => linha.no.id)).toEqual(nos(plano.raiz).map((_, indice) => indice + 1));
    }
  });

  it('liga cada índice sugerido a uma etapa da tabela com filtro', () => {
    for (const { id } of cadastro) {
      const plano = gerarPlanosDaConsulta(id, null, agora)?.plano;
      for (const sugestao of plano?.sugestoes ?? []) {
        const etapa = plano ? encontrarNo(plano, sugestao.no) : null;
        expect(etapa?.relacao, id).toBe(sugestao.tabela);
        expect(etapa?.condicoes.some((condicao) => condicao.tipo === 'FILTRO'), id).toBe(true);
        expect(sugestao.comando, id).toMatch(new RegExp(`^CREATE INDEX CONCURRENTLY \\w+ ON ${sugestao.tabela} `));
      }
    }
  });

  it('abre na consulta que mais pesa com uma varredura sequencial e um índice sugerido', () => {
    const planos = gerarPlanosDaConsulta('q-usuarios-email', null, agora);
    const tipos = diagnosticarPlano(planos?.plano ?? (null as never)).map((achado) => achado.tipo);

    expect(planos?.posicao).toBe(1);
    expect(tipos).toEqual(['ETAPA', 'VARREDURA', 'ESTIMATIVA']);
    expect(planos?.plano?.sugestoes).toHaveLength(1);
  });

  it('divide as execuções dos 30 dias entre as versões do plano que mudou', () => {
    const planos = gerarPlanosDaConsulta('q-pedidos-cliente', null, agora);
    const [atual, anterior] = planos?.versoes ?? [];
    if (!planos || !atual || !anterior) throw new Error('sem versões');

    expect(planos.versoes).toHaveLength(2);
    expect(atual.quantidadeExecucoes + anterior.quantidadeExecucoes).toBe(planos.consulta.quantidadeExecucoes);
    expect(atual.tempoMedioMs).toBeGreaterThan(anterior.tempoMedioMs);
    expect(new Date(anterior.ultimoRegistro).getTime()).toBeLessThan(new Date(atual.primeiroRegistro).getTime());

    const media =
      (atual.quantidadeExecucoes * atual.tempoMedioMs + anterior.quantidadeExecucoes * anterior.tempoMedioMs) /
      planos.consulta.quantidadeExecucoes;
    expect(media / planos.consulta.tempoMedioMs).toBeCloseTo(1, 2);

    const antigo = gerarPlanosDaConsulta('q-pedidos-cliente', anterior.id, agora);
    expect(antigo?.plano?.id).toBe(anterior.id);
    expect(antigo?.plano?.registradoEm).toBe(anterior.ultimoRegistro);
    expect(nos(antigo?.plano?.raiz ?? (null as never)).map((etapa) => etapa.tipo)).toEqual([
      'Sort',
      'Bitmap Heap Scan',
      'Bitmap Index Scan',
    ]);
  });

  it('volta ao plano atual quando a versão pedida não existe mais', () => {
    const planos = gerarPlanosDaConsulta('q-usuarios-email', 'q-usuarios-email-plano-9', agora);
    expect(planos?.plano?.id).toBe(planos?.versoes[0]?.id);
  });

  it('não encontra uma consulta fora do catálogo e fica sem plano quando os dados estão vazios', () => {
    expect(gerarPlanosDaConsulta('q-inexistente', null, agora)).toBeNull();
    const vazio = gerarPlanosDaConsulta('q-usuarios-email', null, agora, true);
    expect(vazio?.plano).toBeNull();
    expect(vazio?.versoes).toEqual([]);
  });

  it('não muda entre duas leituras do mesmo intervalo de registro', () => {
    const primeira = gerarPlanosDaConsulta('q-ranking-clientes', null, agora);
    const segunda = gerarPlanosDaConsulta('q-ranking-clientes', null, new Date(agora.getTime() + 60_000));
    expect(segunda?.plano?.registradoEm).toBe(primeira?.plano?.registradoEm);
  });
});

describe('troca de plano no Histórico', () => {
  it('mostra no Histórico a mesma troca das versões do plano, só quando ela cai no período', () => {
    const [atual, anterior] = gerarPlanosDaConsulta('q-pedidos-cliente', null, agora)?.versoes ?? [];
    const semana = gerarHistoricoDaConsulta('q-pedidos-cliente', 'ULTIMOS_7_DIAS', agora);

    expect(semana?.trocasDePlano).toEqual([
      { instante: atual?.primeiroRegistro, versao: atual?.id, versaoAnterior: anterior?.id },
    ]);
    expect(gerarHistoricoDaConsulta('q-pedidos-cliente', 'ULTIMAS_24_HORAS', agora)?.trocasDePlano).toEqual([]);
    expect(gerarHistoricoDaConsulta('q-usuarios-email', 'ULTIMOS_30_DIAS', agora)?.trocasDePlano).toEqual([]);
  });
});
