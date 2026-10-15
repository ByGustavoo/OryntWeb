import { describe, expect, it } from 'vitest';
import type { HistoricoConsultaDTO } from '@/modelos/consultas';
import { periodosDashboard } from '@/modelos/rotulos';
import { filtrosIniciais } from '@/regras/filtrosConsultas';
import { intervalosPorPeriodo, minutosPorIntervalo } from '@/regras/historicoConsulta';
import { filtrarConsultas, gerarConsultasDetalhadas } from './consultas';
import { gerarHistoricoDaConsulta, repartirExecucoes } from './historicoConsulta';
import { gerarAtividade, janelasPeriodo } from './series';

const agora = new Date(2026, 9, 7, 15, 23);
const MS_POR_MINUTO = 60_000;
const TOLERANCIA_RELATIVA_DA_MEDIA = 0.03;
const TOLERANCIA_ABSOLUTA_DA_MEDIA_MS = 0.1;

function historicos(periodo: (typeof periodosDashboard)[number]): HistoricoConsultaDTO[] {
  return gerarConsultasDetalhadas(periodo, agora).map((consulta) => {
    const historico = gerarHistoricoDaConsulta(consulta.id, periodo, agora);
    if (!historico) throw new Error(`Sem histórico para ${consulta.id}.`);
    return historico;
  });
}

describe('histórico simulado de uma consulta', () => {
  it('devolve o mesmo histórico para o mesmo instante', () => {
    for (const periodo of periodosDashboard) {
      expect(gerarHistoricoDaConsulta('q-pedidos-cliente', periodo, agora)).toEqual(
        gerarHistoricoDaConsulta('q-pedidos-cliente', periodo, agora),
      );
    }
  });

  it('traz a consulta com os mesmos números da lista de consultas', () => {
    for (const periodo of periodosDashboard) {
      const daLista = new Map(gerarConsultasDetalhadas(periodo, agora).map((consulta) => [consulta.id, consulta]));

      for (const historico of historicos(periodo)) {
        expect(historico.periodo).toBe(periodo);
        expect(historico.consulta).toEqual(daLista.get(historico.consulta.id));
      }
    }
  });

  it('usa os mesmos intervalos do gráfico de atividade do Dashboard', () => {
    for (const periodo of periodosDashboard) {
      const atividade = gerarAtividade(periodo, agora);
      const historico = gerarHistoricoDaConsulta('q-usuarios-email', periodo, agora);

      expect(historico?.pontos.map((ponto) => ponto.instante)).toEqual(atividade.map((ponto) => ponto.instante));
      expect(historico?.pontos).toHaveLength(intervalosPorPeriodo[periodo]);
      expect(janelasPeriodo[periodo]).toEqual({ pontos: intervalosPorPeriodo[periodo], minutosPorPonto: minutosPorIntervalo[periodo] });
    }
  });

  it('soma nos intervalos as execuções da consulta no período', () => {
    for (const periodo of periodosDashboard) {
      for (const historico of historicos(periodo)) {
        const soma = historico.pontos.reduce((total, ponto) => total + ponto.quantidadeExecucoes, 0);

        expect(soma).toBe(historico.consulta.quantidadeExecucoes);
        expect(historico.pontos.every((ponto) => Number.isInteger(ponto.quantidadeExecucoes) && ponto.quantidadeExecucoes >= 0)).toBe(true);
      }
    }
  });

  it('deixa sem tempo o intervalo sem execuções e com tempo o que teve alguma', () => {
    for (const periodo of periodosDashboard) {
      for (const historico of historicos(periodo)) {
        for (const ponto of historico.pontos) {
          const semTempo = ponto.tempoMedioMs === null && ponto.tempoMaximoMs === null;
          const comTempo = ponto.tempoMedioMs !== null && ponto.tempoMaximoMs !== null;

          expect(ponto.quantidadeExecucoes === 0 ? semTempo : comTempo).toBe(true);
        }
      }
    }
  });

  it('mantém os tempos de cada intervalo entre o mínimo e o máximo da consulta', () => {
    for (const periodo of periodosDashboard) {
      for (const { consulta, pontos } of historicos(periodo)) {
        for (const ponto of pontos) {
          if (ponto.tempoMedioMs === null || ponto.tempoMaximoMs === null) continue;

          expect(ponto.tempoMedioMs).toBeGreaterThanOrEqual(consulta.tempoMinimoMs);
          expect(ponto.tempoMedioMs).toBeLessThanOrEqual(ponto.tempoMaximoMs);
          expect(ponto.tempoMaximoMs).toBeLessThanOrEqual(consulta.tempoMaximoMs);
        }
      }
    }
  });

  it('tem no intervalo mais lento o tempo máximo da consulta', () => {
    for (const periodo of periodosDashboard) {
      for (const { consulta, pontos } of historicos(periodo)) {
        const maior = Math.max(...pontos.map((ponto) => ponto.tempoMaximoMs ?? 0));

        expect(maior).toBe(consulta.tempoMaximoMs);
      }
    }
  });

  it('pondera os tempos médios dos intervalos no tempo médio da consulta', () => {
    for (const periodo of periodosDashboard) {
      for (const { consulta, pontos } of historicos(periodo)) {
        const tempoSomado = pontos.reduce((soma, ponto) => soma + ponto.quantidadeExecucoes * (ponto.tempoMedioMs ?? 0), 0);
        const media = tempoSomado / consulta.quantidadeExecucoes;
        const tolerancia = Math.max(TOLERANCIA_ABSOLUTA_DA_MEDIA_MS, consulta.tempoMedioMs * TOLERANCIA_RELATIVA_DA_MEDIA);

        expect(Math.abs(media - consulta.tempoMedioMs)).toBeLessThanOrEqual(tolerancia);
      }
    }
  });

  it('numera as consultas na ordem padrão da lista e aponta as vizinhas', () => {
    for (const periodo of periodosDashboard) {
      const ordem = filtrarConsultas(gerarConsultasDetalhadas(periodo, agora), { ...filtrosIniciais, tamanhoPagina: 100 }).map(
        (consulta) => consulta.id,
      );

      ordem.forEach((id, indice) => {
        const historico = gerarHistoricoDaConsulta(id, periodo, agora);

        expect(historico?.posicao).toBe(indice + 1);
        expect(historico?.totalDoPeriodo).toBe(ordem.length);
        expect(historico?.idAnterior).toBe(ordem[indice - 1] ?? null);
        expect(historico?.idSeguinte).toBe(ordem[indice + 1] ?? null);
      });
    }
  });

  it('calcula as variações a partir dos valores da janela anterior, como a lista os mostra', () => {
    for (const periodo of periodosDashboard) {
      const { pontos, minutosPorPonto } = janelasPeriodo[periodo];
      const antes = new Date(agora.getTime() - pontos * minutosPorPonto * MS_POR_MINUTO);
      const anteriores = new Map(gerarConsultasDetalhadas(periodo, antes).map((consulta) => [consulta.id, consulta]));

      for (const historico of historicos(periodo)) {
        const anterior = anteriores.get(historico.consulta.id);
        if (!anterior) throw new Error('Consulta sem janela anterior.');
        const arredondar = (valor: number) => Math.round(valor * 10) / 10;

        expect(historico.variacaoTempoMedio).toBe(
          arredondar(((historico.consulta.tempoMedioMs - anterior.tempoMedioMs) / anterior.tempoMedioMs) * 100),
        );
        expect(historico.variacaoExecucoes).toBe(
          arredondar(
            ((historico.consulta.quantidadeExecucoes - anterior.quantidadeExecucoes) / anterior.quantidadeExecucoes) * 100,
          ),
        );
      }
    }
  });

  it('não devolve histórico para uma consulta que não existe', () => {
    expect(gerarHistoricoDaConsulta('q-que-nao-existe', 'ULTIMAS_24_HORAS', agora)).toBeNull();
    expect(gerarHistoricoDaConsulta('q-que-nao-existe', 'ULTIMAS_24_HORAS', agora, true)).toBeNull();
  });

  it('devolve a consulta sem execuções quando o período está vazio', () => {
    const historico = gerarHistoricoDaConsulta('q-pedidos-cliente', 'ULTIMOS_7_DIAS', agora, true);

    expect(historico).toMatchObject({
      periodo: 'ULTIMOS_7_DIAS',
      variacaoExecucoes: null,
      variacaoTempoMedio: null,
      posicao: null,
      totalDoPeriodo: 0,
      idAnterior: null,
      idSeguinte: null,
    });
    expect(historico?.consulta).toMatchObject({ id: 'q-pedidos-cliente', tipo: 'SELECT', quantidadeExecucoes: 0, tempoTotalMs: 0 });
    expect(historico?.pontos).toHaveLength(28);
    expect(historico?.pontos.every((ponto) => ponto.quantidadeExecucoes === 0 && ponto.tempoMedioMs === null)).toBe(true);
  });

  it('reparte as execuções sem perder nem inventar nenhuma, aceitando intervalos zerados', () => {
    expect(repartirExecucoes(1000, [0.5, 0.3, 0.2])).toEqual([500, 300, 200]);
    expect(repartirExecucoes(3, [1, 1, 1, 1, 1])).toEqual([1, 1, 1, 0, 0]);
    expect(repartirExecucoes(10, [3, 3, 3]).reduce((soma, parte) => soma + parte, 0)).toBe(10);
    expect(repartirExecucoes(0, [1, 2])).toEqual([0, 0]);
    expect(repartirExecucoes(5, [0, 0])).toEqual([0, 0]);
  });
});
