const INTERVALOS_DO_EIXO = 4;
const PASSOS_REDONDOS = [1, 2, 2.5, 5, 10];

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
