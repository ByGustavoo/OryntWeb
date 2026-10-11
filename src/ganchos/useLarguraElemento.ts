import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

export function useLarguraElemento(elemento: RefObject<HTMLElement>): number {
  const [largura, setLargura] = useState(0);

  useLayoutEffect(() => {
    const alvo = elemento.current;
    if (!alvo) return;
    setLargura(alvo.clientWidth);
    const observador = new ResizeObserver(() => setLargura(alvo.clientWidth));
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [elemento]);

  return largura;
}
