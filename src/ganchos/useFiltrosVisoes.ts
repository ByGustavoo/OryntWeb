import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FiltrosVisoes } from '@/modelos/objetos';
import { aplicarMudancaVisoes, lerFiltrosVisoes } from '@/regras/visoes';

interface FiltrosDaTela {
  filtros: FiltrosVisoes;
  mudarFiltros: (mudanca: Partial<FiltrosVisoes>) => void;
}

function lerFiltrosGuardados(estado: unknown): unknown {
  if (!estado || typeof estado !== 'object') return null;
  return (estado as { visoes?: unknown }).visoes;
}

export function useFiltrosVisoes(caminho: string): FiltrosDaTela {
  const localizacao = useLocation();
  const navegar = useNavigate();

  const guardado = lerFiltrosGuardados(localizacao.state);
  const filtros = useMemo(() => lerFiltrosVisoes(guardado), [guardado]);
  const filtrosAtuais = useRef(filtros);
  filtrosAtuais.current = filtros;

  const mudarFiltros = useCallback(
    (mudanca: Partial<FiltrosVisoes>) => {
      const proximos = aplicarMudancaVisoes(filtrosAtuais.current, mudanca);
      filtrosAtuais.current = proximos;
      navegar(caminho, { replace: true, state: { visoes: proximos } });
    },
    [navegar, caminho],
  );

  return { filtros, mudarFiltros };
}
