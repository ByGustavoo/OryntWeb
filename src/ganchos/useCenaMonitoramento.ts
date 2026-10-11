import { useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { INTERVALO_CENA_MS, PASSO_INICIAL_CENA, montarCena } from '@/componentes/login/roteiroCena';
import type { EstadoCena } from '@/componentes/login/roteiroCena';
import { useConsultaMidia } from './useConsultaMidia';

const CONSULTA_MOVIMENTO_REDUZIDO = '(prefers-reduced-motion: reduce)';

export function useCenaMonitoramento(palco: RefObject<HTMLElement>): EstadoCena {
  const [passo, setPasso] = useState(PASSO_INICIAL_CENA);
  const movimentoReduzido = useConsultaMidia(CONSULTA_MOVIMENTO_REDUZIDO);

  useEffect(() => {
    const elemento = palco.current;
    if (movimentoReduzido || !elemento) return;

    let temporizador = 0;
    let palcoVisivel = false;

    const parar = () => {
      window.clearInterval(temporizador);
      temporizador = 0;
    };
    const sincronizar = () => {
      const deveRodar = palcoVisivel && !document.hidden;
      if (deveRodar && !temporizador) {
        temporizador = window.setInterval(() => setPasso((atual) => atual + 1), INTERVALO_CENA_MS);
      }
      if (!deveRodar) parar();
    };

    const observador = new IntersectionObserver(([entrada]) => {
      palcoVisivel = entrada?.isIntersecting ?? false;
      sincronizar();
    });
    observador.observe(elemento);
    document.addEventListener('visibilitychange', sincronizar);

    return () => {
      parar();
      observador.disconnect();
      document.removeEventListener('visibilitychange', sincronizar);
    };
  }, [palco, movimentoReduzido]);

  return useMemo(() => montarCena(passo), [passo]);
}
