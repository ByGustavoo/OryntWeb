import { describe, expect, it } from 'vitest';
import { tracarCurvaSuave } from './tracado';
import type { PontoTracado } from './tracado';

const SERIE_COM_PICO: PontoTracado[] = [
  { x: 0, y: 100 },
  { x: 10, y: 96 },
  { x: 20, y: 60 },
  { x: 30, y: 12 },
  { x: 40, y: 70 },
  { x: 50, y: 98 },
  { x: 60, y: 98 },
];

function numerosDoCaminho(caminho: string): number[] {
  return (caminho.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

function trechosDoCaminho(caminho: string): number[][] {
  const [, ...trechos] = caminho.split('C');
  return trechos.map(numerosDoCaminho);
}

describe('tracarCurvaSuave', () => {
  it('devolve vazio sem pontos e só o início com um ponto', () => {
    expect(tracarCurvaSuave([])).toBe('');
    expect(tracarCurvaSuave([{ x: 4, y: 8 }])).toBe('M4.0 8.0');
  });

  it('passa por todos os pontos da série', () => {
    const trechos = trechosDoCaminho(tracarCurvaSuave(SERIE_COM_PICO));
    expect(trechos).toHaveLength(SERIE_COM_PICO.length - 1);
    trechos.forEach((trecho, indice) => {
      const destino = SERIE_COM_PICO[indice + 1] as PontoTracado;
      expect(trecho.slice(4)).toEqual([destino.x, destino.y]);
    });
  });

  it('nunca ultrapassa os valores vizinhos, nem no topo do pico', () => {
    trechosDoCaminho(tracarCurvaSuave(SERIE_COM_PICO)).forEach((trecho, indice) => {
      const origem = SERIE_COM_PICO[indice] as PontoTracado;
      const destino = SERIE_COM_PICO[indice + 1] as PontoTracado;
      const menor = Math.min(origem.y, destino.y);
      const maior = Math.max(origem.y, destino.y);
      for (const controle of [trecho[1], trecho[3]]) {
        expect(controle).toBeGreaterThanOrEqual(menor);
        expect(controle).toBeLessThanOrEqual(maior);
      }
    });
  });

  it('mantém reto o trecho entre dois valores iguais', () => {
    const ultimo = trechosDoCaminho(tracarCurvaSuave(SERIE_COM_PICO)).at(-1) as number[];
    expect([ultimo[1], ultimo[3], ultimo[5]]).toEqual([98, 98, 98]);
  });
});
