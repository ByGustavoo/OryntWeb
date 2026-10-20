import { useEffect } from 'react';

function barraJaReservada(): boolean {
  return getComputedStyle(document.documentElement).scrollbarGutter.startsWith('stable');
}

export function useTravarRolagem(travada: boolean): void {
  useEffect(() => {
    if (!travada) return;
    const corpo = document.body;
    const larguraBarra = barraJaReservada() ? 0 : window.innerWidth - document.documentElement.clientWidth;
    const overflowAnterior = corpo.style.overflow;
    const recuoAnterior = corpo.style.paddingRight;
    corpo.style.overflow = 'hidden';
    if (larguraBarra > 0) corpo.style.paddingRight = `${larguraBarra}px`;
    return () => {
      corpo.style.overflow = overflowAnterior;
      corpo.style.paddingRight = recuoAnterior;
    };
  }, [travada]);
}
