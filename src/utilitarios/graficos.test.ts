import { describe, expect, it } from 'vitest';
import { posicionarRotulo } from './graficos';

const limites = { inicio: 52, fim: 1000 };

describe('posicionarRotulo', () => {
  it('centraliza o rótulo quando ele cabe dos dois lados', () => {
    expect(posicionarRotulo('Pico: 1,3 mil', 500, 12, limites)).toEqual({ x: 500, textAnchor: 'middle' });
  });

  it('alinha pelo início da marca quando o rótulo passaria do início do plano', () => {
    expect(posicionarRotulo('Pico: 1,3 mil', 78, 12, limites)).toEqual({ x: 66, textAnchor: 'start' });
  });

  it('alinha pelo fim da marca quando o rótulo passaria do fim do plano', () => {
    expect(posicionarRotulo('Pico: 314 ms', 980, 4, limites)).toEqual({ x: 984, textAnchor: 'end' });
  });

  it('não deixa uma marca estreita levar o rótulo para fora do plano', () => {
    expect(posicionarRotulo('Pico: 314 ms', 54, 4, limites)).toEqual({ x: 52, textAnchor: 'start' });
    expect(posicionarRotulo('Pico: 314 ms', 998, 4, limites)).toEqual({ x: 1000, textAnchor: 'end' });
  });
});
