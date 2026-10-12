import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ParDePeriodos } from '@/regras/comparacaoRelatorio';
import { basePadrao, lerBase } from '@/regras/comparacaoRelatorio';
import { GRANULARIDADE_INICIAL, lerPeriodo, ultimoPeriodoFechado } from '@/regras/periodoRelatorio';

interface ComparacaoDaTela {
  par: ParDePeriodos;
  hoje: Date;
  mudarPar: (par: ParDePeriodos) => void;
}

function lerParGuardado(estado: unknown, hoje: Date): ParDePeriodos {
  const guardado = estado && typeof estado === 'object' ? (estado as { periodo?: unknown; base?: unknown }) : {};
  const periodo = lerPeriodo(guardado.periodo, hoje) ?? ultimoPeriodoFechado(GRANULARIDADE_INICIAL, hoje);
  return { periodo, base: lerBase(guardado.base, periodo, hoje) ?? basePadrao(periodo, hoje) };
}

export function useComparacaoRelatorio(caminho: string): ComparacaoDaTela {
  const localizacao = useLocation();
  const navegar = useNavigate();
  const hoje = useMemo(() => new Date(), []);

  const guardado = lerParGuardado(localizacao.state, hoje);
  const { granularidade, inicio } = guardado.periodo;
  const inicioDaBase = guardado.base.inicio;
  const par = useMemo<ParDePeriodos>(
    () => ({ periodo: { granularidade, inicio }, base: { granularidade, inicio: inicioDaBase } }),
    [granularidade, inicio, inicioDaBase],
  );

  const mudarPar = useCallback(
    (proximo: ParDePeriodos) =>
      navegar(caminho, { replace: true, state: { periodo: proximo.periodo, base: proximo.base } }),
    [navegar, caminho],
  );

  return { par, hoje, mudarPar };
}
