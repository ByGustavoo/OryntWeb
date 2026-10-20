import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FiltrosSessoes } from '@/modelos/sessoes';
import { aplicarMudancaSessoes, lerFiltrosSessoes } from '@/regras/sessoes';

interface FiltrosDaTela {
  filtros: FiltrosSessoes;
  mudarFiltros: (mudanca: Partial<FiltrosSessoes>) => void;
}

function lerFiltrosGuardados(estado: unknown): unknown {
  if (!estado || typeof estado !== 'object') return null;
  return (estado as { sessoes?: unknown }).sessoes;
}

export function useFiltrosSessoes(caminho: string): FiltrosDaTela {
  const localizacao = useLocation();
  const navegar = useNavigate();

  const guardado = lerFiltrosGuardados(localizacao.state);
  const filtros = useMemo(() => lerFiltrosSessoes(guardado), [guardado]);
  const filtrosAtuais = useRef(filtros);
  filtrosAtuais.current = filtros;

  const mudarFiltros = useCallback(
    (mudanca: Partial<FiltrosSessoes>) => {
      const proximos = aplicarMudancaSessoes(filtrosAtuais.current, mudanca);
      filtrosAtuais.current = proximos;
      navegar(caminho, { replace: true, state: { sessoes: proximos } });
    },
    [navegar, caminho],
  );

  return { filtros, mudarFiltros };
}
