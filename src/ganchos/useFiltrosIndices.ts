import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FiltrosIndices } from '@/modelos/objetos';
import { lerFiltrosIndices } from '@/regras/indices';

interface FiltrosDaTela {
  filtros: FiltrosIndices;
  mudarFiltros: (mudanca: Partial<FiltrosIndices>) => void;
}

function lerFiltrosGuardados(estado: unknown): unknown {
  if (!estado || typeof estado !== 'object') return null;
  return (estado as { indices?: unknown }).indices;
}

export function useFiltrosIndices(caminho: string): FiltrosDaTela {
  const localizacao = useLocation();
  const navegar = useNavigate();

  const guardado = lerFiltrosGuardados(localizacao.state);
  const filtros = useMemo(() => lerFiltrosIndices(guardado), [guardado]);
  const filtrosAtuais = useRef(filtros);
  filtrosAtuais.current = filtros;

  const mudarFiltros = useCallback(
    (mudanca: Partial<FiltrosIndices>) => {
      const proximos = lerFiltrosIndices({ ...filtrosAtuais.current, ...mudanca });
      filtrosAtuais.current = proximos;
      navegar(caminho, { replace: true, state: { indices: proximos } });
    },
    [navegar, caminho],
  );

  return { filtros, mudarFiltros };
}
