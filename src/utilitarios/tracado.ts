export interface PontoTracado {
  x: number;
  y: number;
}

const LIMITE_DE_INCLINACAO = 3;

function arredondar(valor: number): string {
  return valor.toFixed(1);
}

function inclinacoesMonotonas(pontos: readonly PontoTracado[]): number[] {
  const secantes = pontos.slice(1).map((ponto, indice) => {
    const anterior = pontos[indice] as PontoTracado;
    return (ponto.y - anterior.y) / (ponto.x - anterior.x);
  });

  const inclinacoes = pontos.map((_, indice) => {
    const antes = secantes[indice - 1];
    const depois = secantes[indice];
    if (antes === undefined) return depois ?? 0;
    if (depois === undefined) return antes;
    return antes * depois <= 0 ? 0 : (antes + depois) / 2;
  });

  secantes.forEach((secante, indice) => {
    if (secante === 0) {
      inclinacoes[indice] = 0;
      inclinacoes[indice + 1] = 0;
      return;
    }
    const entrada = (inclinacoes[indice] as number) / secante;
    const saida = (inclinacoes[indice + 1] as number) / secante;
    const intensidade = Math.hypot(entrada, saida);
    if (intensidade > LIMITE_DE_INCLINACAO) {
      const freio = LIMITE_DE_INCLINACAO / intensidade;
      inclinacoes[indice] = freio * entrada * secante;
      inclinacoes[indice + 1] = freio * saida * secante;
    }
  });

  return inclinacoes;
}

export function tracarCurvaSuave(pontos: readonly PontoTracado[]): string {
  const primeiro = pontos[0];
  if (!primeiro) return '';
  const inicio = `M${arredondar(primeiro.x)} ${arredondar(primeiro.y)}`;
  if (pontos.length < 2) return inicio;

  const inclinacoes = inclinacoesMonotonas(pontos);
  const trechos = pontos.slice(1).map((ponto, indice) => {
    const anterior = pontos[indice] as PontoTracado;
    const terco = (ponto.x - anterior.x) / 3;
    const saida = anterior.y + (inclinacoes[indice] as number) * terco;
    const chegada = ponto.y - (inclinacoes[indice + 1] as number) * terco;
    return `C${arredondar(anterior.x + terco)} ${arredondar(saida)} ${arredondar(ponto.x - terco)} ${arredondar(chegada)} ${arredondar(ponto.x)} ${arredondar(ponto.y)}`;
  });

  return `${inicio} ${trechos.join(' ')}`;
}
