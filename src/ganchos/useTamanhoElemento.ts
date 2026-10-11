import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

export interface TamanhoElemento {
  largura: number;
  altura: number;
}

const SEM_TAMANHO: TamanhoElemento = { largura: 0, altura: 0 };

export function useTamanhoElemento(elemento: RefObject<HTMLElement>): TamanhoElemento {
  const [tamanho, setTamanho] = useState(SEM_TAMANHO);

  useLayoutEffect(() => {
    const alvo = elemento.current;
    if (!alvo) return;
    const medir = () =>
      setTamanho((atual) =>
        atual.largura === alvo.clientWidth && atual.altura === alvo.clientHeight
          ? atual
          : { largura: alvo.clientWidth, altura: alvo.clientHeight },
      );
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [elemento]);

  return tamanho;
}
