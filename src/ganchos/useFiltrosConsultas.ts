import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FiltrosConsultas } from '@/modelos/consultas';
import { aplicarMudanca, lerFiltros } from '@/regras/filtrosConsultas';

interface FiltrosDaTela {
  filtros: FiltrosConsultas;
  mudarFiltros: (mudanca: Partial<FiltrosConsultas>) => void;
}

function lerFiltrosGuardados(estado: unknown): unknown {
  if (!estado || typeof estado !== 'object') return null;
  return (estado as { lista?: unknown }).lista;
}

export function useFiltrosConsultas(caminho: string): FiltrosDaTela {
  const localizacao = useLocation();
  const navegar = useNavigate();

  const guardado = lerFiltrosGuardados(localizacao.state);
  const filtros = useMemo(() => lerFiltros(guardado), [guardado]);
  const filtrosAtuais = useRef(filtros);
  filtrosAtuais.current = filtros;

  const mudarFiltros = useCallback(
    (mudanca: Partial<FiltrosConsultas>) => {
      const proximos = aplicarMudanca(filtrosAtuais.current, mudanca);
      filtrosAtuais.current = proximos;
      navegar(caminho, { replace: true, state: { lista: proximos } });
    },
    [navegar, caminho],
  );

  return { filtros, mudarFiltros };
}
