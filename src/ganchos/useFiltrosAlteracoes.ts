import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FiltrosAlteracoes } from '@/modelos/alteracoes';
import { aplicarMudancaAlteracoes, lerFiltrosAlteracoes } from '@/regras/historicoAlteracoes';

interface FiltrosDaTela {
  filtros: FiltrosAlteracoes;
  mudarFiltros: (mudanca: Partial<FiltrosAlteracoes>) => void;
}

function lerFiltrosGuardados(estado: unknown): unknown {
  if (!estado || typeof estado !== 'object') return null;
  return (estado as { alteracoes?: unknown }).alteracoes;
}

export function useFiltrosAlteracoes(caminho: string): FiltrosDaTela {
  const localizacao = useLocation();
  const navegar = useNavigate();

  const guardado = lerFiltrosGuardados(localizacao.state);
  const filtros = useMemo(() => lerFiltrosAlteracoes(guardado), [guardado]);
  const filtrosAtuais = useRef(filtros);
  filtrosAtuais.current = filtros;

  const mudarFiltros = useCallback(
    (mudanca: Partial<FiltrosAlteracoes>) => {
      const proximos = aplicarMudancaAlteracoes(filtrosAtuais.current, mudanca);
      filtrosAtuais.current = proximos;
      navegar(caminho, { replace: true, state: { alteracoes: proximos } });
    },
    [navegar, caminho],
  );

  return { filtros, mudarFiltros };
}
