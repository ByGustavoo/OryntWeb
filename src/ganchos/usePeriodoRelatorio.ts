import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { PeriodoRelatorio } from '@/modelos/relatorios';
import { GRANULARIDADE_INICIAL, lerPeriodo, ultimoPeriodoFechado } from '@/regras/periodoRelatorio';

interface PeriodoDaTela {
  periodo: PeriodoRelatorio;
  hoje: Date;
  mudarPeriodo: (periodo: PeriodoRelatorio) => void;
}

function lerPeriodoGuardado(estado: unknown, hoje: Date): PeriodoRelatorio | null {
  if (!estado || typeof estado !== 'object') return null;
  return lerPeriodo((estado as { periodo?: unknown }).periodo, hoje);
}

export function usePeriodoRelatorio(caminho: string): PeriodoDaTela {
  const localizacao = useLocation();
  const navegar = useNavigate();
  const hoje = useMemo(() => new Date(), []);

  const guardado = lerPeriodoGuardado(localizacao.state, hoje);
  const { granularidade, inicio } = guardado ?? ultimoPeriodoFechado(GRANULARIDADE_INICIAL, hoje);
  const periodo = useMemo<PeriodoRelatorio>(() => ({ granularidade, inicio }), [granularidade, inicio]);

  const mudarPeriodo = useCallback(
    (proximo: PeriodoRelatorio) => navegar(caminho, { replace: true, state: { periodo: proximo } }),
    [navegar, caminho],
  );

  return { periodo, hoje, mudarPeriodo };
}
