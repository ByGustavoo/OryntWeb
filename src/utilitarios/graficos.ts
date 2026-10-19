const INTERVALOS_DO_EIXO = 4;
const PASSOS_REDONDOS = [1, 2, 2.5, 5, 10];
const LARGURA_MEDIA_DO_CARACTERE_PX = 6.2;

export interface LimitesDoPlano {
  inicio: number;
  fim: number;
}

export interface PosicaoDoRotulo {
  x: number;
  textAnchor: 'start' | 'middle' | 'end';
}

export function posicionarRotulo(
  texto: string,
  centro: number,
  meiaLarguraDaMarca: number,
  limites: LimitesDoPlano,
): PosicaoDoRotulo {
  const meiaLargura = (texto.length * LARGURA_MEDIA_DO_CARACTERE_PX) / 2;
  if (centro - meiaLargura < limites.inicio) {
    return { x: Math.max(centro - meiaLarguraDaMarca, limites.inicio), textAnchor: 'start' };
  }
  if (centro + meiaLargura > limites.fim) {
    return { x: Math.min(centro + meiaLarguraDaMarca, limites.fim), textAnchor: 'end' };
  }
  return { x: centro, textAnchor: 'middle' };
}

export function marcasDoEixo(maximo: number): number[] {
  if (maximo <= 0) return [0, 1];
  const passoBruto = maximo / INTERVALOS_DO_EIXO;
  const grandeza = 10 ** Math.floor(Math.log10(passoBruto));
  const fator = PASSOS_REDONDOS.find((candidato) => candidato * grandeza >= passoBruto) ?? 10;
  const passo = Math.max(1, fator * grandeza);
  const quantidade = Math.ceil(maximo / passo);
  return Array.from({ length: quantidade + 1 }, (_, indice) => indice * passo);
}

export function prefereMovimentoReduzido(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
