import { describe, expect, it } from 'vitest';
import {
  LIMITE_ALERTA_MS,
  LIMITE_CONEXOES,
  ORIGENS_DA_CENA,
  PASSOS_DO_CICLO,
  PASSO_INICIAL_CENA,
  PONTOS_DE_FOLGA,
  PONTOS_VISIVEIS,
  REGISTROS_NA_CENA,
  TETO_ESCALA_MS,
  faseDoPasso,
  montarCena,
  origemExibidaNoPasso,
  rastreioDoPasso,
  tempoMedioNoPasso,
} from './roteiroCena';

const passosDeTresCiclos = Array.from({ length: PASSOS_DO_CICLO * 3 }, (_, indice) => indice);

describe('montarCena', () => {
  it('é determinística: o mesmo passo gera a mesma cena', () => {
    expect(montarCena(42)).toEqual(montarCena(42));
  });

  it('começa com a origem já encontrada e o pico à vista', () => {
    const cena = montarCena(PASSO_INICIAL_CENA);
    expect(cena.fase).toBe('ORIGEM');
    expect(cena.origem).toBe(ORIGENS_DA_CENA[0]);
    expect(cena.pico?.tempoMedioMs).toBe(ORIGENS_DA_CENA[0]?.tempoMedioMs);
  });

  it('entrega os pontos visíveis mais a folga usada no deslizamento', () => {
    const cena = montarCena(PASSO_INICIAL_CENA);
    expect(cena.serie).toHaveLength(PONTOS_VISIVEIS + PONTOS_DE_FOLGA);
    expect(cena.serie.at(-1)?.passo).toBe(PASSO_INICIAL_CENA);
    expect(cena.tempoMedioMs).toBe(cena.serie.at(-1)?.tempoMedioMs);
  });

  it('mantém toda a série dentro da escala do gráfico', () => {
    for (const passo of passosDeTresCiclos) {
      const tempo = tempoMedioNoPasso(passo);
      expect(tempo).toBeGreaterThan(0);
      expect(tempo).toBeLessThan(TETO_ESCALA_MS);
    }
  });

  it('nunca mostra o topo de dois picos ao mesmo tempo', () => {
    const topos = new Set(ORIGENS_DA_CENA.map((origem) => origem.tempoMedioMs));
    for (const passo of passosDeTresCiclos) {
      const toposVisiveis = montarCena(passo)
        .serie.slice(PONTOS_DE_FOLGA)
        .filter((ponto) => topos.has(ponto.tempoMedioMs));
      expect(toposVisiveis.length).toBeLessThanOrEqual(1);
    }
  });

  it('só marca um pico quando o tempo passa do limite de alerta', () => {
    for (const passo of passosDeTresCiclos) {
      const { pico } = montarCena(passo);
      if (pico) expect(pico.tempoMedioMs).toBeGreaterThanOrEqual(LIMITE_ALERTA_MS);
    }
  });

  it('coloca a consulta lenta no registro no passo do pico', () => {
    const passoDoPico = passosDeTresCiclos.find((passo) => tempoMedioNoPasso(passo) === ORIGENS_DA_CENA[0]?.tempoMedioMs);
    expect(passoDoPico).toBeDefined();
    const [maisRecente] = montarCena(passoDoPico as number).registros;
    expect(maisRecente?.desempenho).toBe('LENTA');
    expect(maisRecente?.sql).toBe(ORIGENS_DA_CENA[0]?.resumo);
  });

  it('lista os registros do mais novo para o mais antigo, sem repetir identificador', () => {
    const { registros } = montarCena(57);
    expect(registros).toHaveLength(REGISTROS_NA_CENA);
    expect(registros.map((registro) => registro.id)).toEqual([57, 56, 55, 54, 53]);
  });

  it('mantém as conexões ativas abaixo do limite do servidor', () => {
    for (const passo of passosDeTresCiclos) {
      expect(montarCena(passo).conexoesAtivas).toBeLessThan(LIMITE_CONEXOES);
    }
  });
});

describe('ciclo da cena', () => {
  it('percorre estável, pico, rastreio e origem em ordem', () => {
    const fases = Array.from({ length: PASSOS_DO_CICLO }, (_, posicao) => faseDoPasso(PASSOS_DO_CICLO + posicao));
    const semRepeticao = fases.filter((fase, indice) => fase !== fases[indice - 1]);
    expect(semRepeticao).toEqual(['ORIGEM', 'ESTAVEL', 'PICO', 'RASTREANDO', 'ORIGEM']);
  });

  it('só troca a consulta de origem depois de o pico aparecer', () => {
    for (const passo of passosDeTresCiclos) {
      if (faseDoPasso(passo) !== 'PICO') continue;
      expect(origemExibidaNoPasso(passo)).toBe(origemExibidaNoPasso(passo - 1));
    }
  });

  it('revela na origem a consulta que causou o pico daquele ciclo', () => {
    const passoDaOrigem = PASSOS_DO_CICLO + PASSOS_DO_CICLO - 1;
    expect(faseDoPasso(passoDaOrigem)).toBe('ORIGEM');
    expect(origemExibidaNoPasso(passoDaOrigem)).toBe(ORIGENS_DA_CENA[1]);
    expect(montarCena(passoDaOrigem).pico?.tempoMedioMs).toBe(ORIGENS_DA_CENA[1]?.tempoMedioMs);
  });

  it('abre um rastreio novo no passo em que a fase vira rastreio, e só nele', () => {
    for (const passo of passosDeTresCiclos) {
      const abriu = rastreioDoPasso(passo) !== rastreioDoPasso(passo - 1);
      const comecou = faseDoPasso(passo) === 'RASTREANDO' && faseDoPasso(passo - 1) !== 'RASTREANDO';
      expect(abriu).toBe(comecou);
    }
  });

  it('percorre todas as origens fictícias', () => {
    const vistas = new Set(passosDeTresCiclos.map((passo) => origemExibidaNoPasso(passo).id));
    expect(vistas.size).toBe(ORIGENS_DA_CENA.length);
  });
});
