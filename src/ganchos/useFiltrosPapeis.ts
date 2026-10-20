import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FiltrosPapeis } from '@/modelos/papeis';
import { aplicarMudancaPapeis, lerFiltrosPapeis } from '@/regras/papeis';

interface FiltrosDaTela {
  filtros: FiltrosPapeis;
  mudarFiltros: (mudanca: Partial<FiltrosPapeis>) => void;
}

function lerFiltrosGuardados(estado: unknown): unknown {
  if (!estado || typeof estado !== 'object') return null;
  return (estado as { papeis?: unknown }).papeis;
}

export function useFiltrosPapeis(caminho: string): FiltrosDaTela {
  const localizacao = useLocation();
  const navegar = useNavigate();

  const guardado = lerFiltrosGuardados(localizacao.state);
  const filtros = useMemo(() => lerFiltrosPapeis(guardado), [guardado]);
  const filtrosAtuais = useRef(filtros);
  filtrosAtuais.current = filtros;

  const mudarFiltros = useCallback(
    (mudanca: Partial<FiltrosPapeis>) => {
      const proximos = aplicarMudancaPapeis(filtrosAtuais.current, mudanca);
      filtrosAtuais.current = proximos;
      navegar(caminho, { replace: true, state: { papeis: proximos } });
    },
    [navegar, caminho],
  );

  return { filtros, mudarFiltros };
}
