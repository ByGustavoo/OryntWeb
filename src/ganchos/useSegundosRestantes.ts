import { useEffect, useState } from 'react';
import { segundosAteReenvio } from '@/regras/recuperacaoSenha';

const INTERVALO_DE_CONFERENCIA_MS = 250;

export function useSegundosRestantes(ate: number | null): number {
  const [segundos, setSegundos] = useState(() => segundosAteReenvio(ate, Date.now()));

  useEffect(() => {
    setSegundos(segundosAteReenvio(ate, Date.now()));
    if (ate === null || ate <= Date.now()) return;

    const intervalo = window.setInterval(() => {
      const restantes = segundosAteReenvio(ate, Date.now());
      setSegundos(restantes);
      if (restantes === 0) window.clearInterval(intervalo);
    }, INTERVALO_DE_CONFERENCIA_MS);

    return () => window.clearInterval(intervalo);
  }, [ate]);

  return segundos;
}
