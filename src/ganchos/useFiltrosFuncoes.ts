import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FiltrosFuncoes } from '@/modelos/objetos';
import { aplicarMudancaFuncoes, lerFiltrosFuncoes } from '@/regras/funcoes';

interface FiltrosDaTela {
  filtros: FiltrosFuncoes;
  mudarFiltros: (mudanca: Partial<FiltrosFuncoes>) => void;
}

function lerFiltrosGuardados(estado: unknown): unknown {
  if (!estado || typeof estado !== 'object') return null;
  return (estado as { funcoes?: unknown }).funcoes;
}

export function useFiltrosFuncoes(caminho: string): FiltrosDaTela {
  const localizacao = useLocation();
  const navegar = useNavigate();

  const guardado = lerFiltrosGuardados(localizacao.state);
  const filtros = useMemo(() => lerFiltrosFuncoes(guardado), [guardado]);
  const filtrosAtuais = useRef(filtros);
  filtrosAtuais.current = filtros;

  const mudarFiltros = useCallback(
    (mudanca: Partial<FiltrosFuncoes>) => {
      const proximos = aplicarMudancaFuncoes(filtrosAtuais.current, mudanca);
      filtrosAtuais.current = proximos;
      navegar(caminho, { replace: true, state: { funcoes: proximos } });
    },
    [navegar, caminho],
  );

  return { filtros, mudarFiltros };
}
