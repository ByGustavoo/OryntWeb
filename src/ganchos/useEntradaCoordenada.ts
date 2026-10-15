import { useEffect, useState } from 'react';
import { prefereMovimentoReduzido } from '@/utilitarios/graficos';

const ESPERA_MAXIMA_ENTRADA_MS = 600;
const INTERVALO_ENTRE_ETAPAS_MS = 160;

export function esperaMaximaDaEtapa(etapa: number): number {
  return ESPERA_MAXIMA_ENTRADA_MS + (etapa - 1) * INTERVALO_ENTRE_ETAPAS_MS;
}

function etapasDeSaida(quantidadeEtapas: number): number {
  return prefereMovimentoReduzido() ? quantidadeEtapas : 0;
}

export function useEntradaCoordenada(pronta: boolean, quantidadeEtapas: number, rodada: string): number {
  const [etapas, setEtapas] = useState(() => etapasDeSaida(quantidadeEtapas));
  const [rodadaEmCurso, setRodadaEmCurso] = useState(rodada);

  if (rodadaEmCurso !== rodada) {
    setRodadaEmCurso(rodada);
    setEtapas(etapasDeSaida(quantidadeEtapas));
  }

  useEffect(() => {
    if (etapas >= quantidadeEtapas) return;
    if (etapas === 0 && pronta) {
      setEtapas(1);
      return;
    }
    const espera = window.setTimeout(
      () => setEtapas((atual) => Math.min(quantidadeEtapas, atual + 1)),
      etapas === 0 ? ESPERA_MAXIMA_ENTRADA_MS : INTERVALO_ENTRE_ETAPAS_MS,
    );
    return () => window.clearTimeout(espera);
  }, [etapas, pronta, quantidadeEtapas, rodadaEmCurso]);

  return etapas;
}
