import { useCallback, useState } from 'react';

export interface PontoLido {
  indice: number;
  x: number;
}

interface EstadoDoGrafico {
  isTooltipActive?: boolean;
  activeTooltipIndex?: number;
  activeCoordinate?: { x?: number };
}

export function useLeituraDoGrafico() {
  const [lido, setLido] = useState<PontoLido | null>(null);

  const aoMover = useCallback((estado: EstadoDoGrafico) => {
    const indice = estado.activeTooltipIndex;
    const x = estado.activeCoordinate?.x;
    if (!estado.isTooltipActive || indice === undefined || indice < 0 || x === undefined) {
      setLido(null);
      return;
    }
    setLido((atual) => (atual?.indice === indice && atual.x === x ? atual : { indice, x }));
  }, []);

  const aoSair = useCallback(() => setLido(null), []);

  return { lido, eventos: { onMouseMove: aoMover, onMouseLeave: aoSair } };
}
