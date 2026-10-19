import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FiltrosTabelas } from '@/modelos/objetos';
import { aplicarMudancaTabelas, lerFiltrosTabelas } from '@/regras/tabelas';

interface FiltrosDaTela {
  filtros: FiltrosTabelas;
  mudarFiltros: (mudanca: Partial<FiltrosTabelas>) => void;
}

function lerFiltrosGuardados(estado: unknown): unknown {
  if (!estado || typeof estado !== 'object') return null;
  return (estado as { tabelas?: unknown }).tabelas;
}

export function useFiltrosTabelas(caminho: string): FiltrosDaTela {
  const localizacao = useLocation();
  const navegar = useNavigate();

  const guardado = lerFiltrosGuardados(localizacao.state);
  const filtros = useMemo(() => lerFiltrosTabelas(guardado), [guardado]);
  const filtrosAtuais = useRef(filtros);
  filtrosAtuais.current = filtros;

  const mudarFiltros = useCallback(
    (mudanca: Partial<FiltrosTabelas>) => {
      const proximos = aplicarMudancaTabelas(filtrosAtuais.current, mudanca);
      filtrosAtuais.current = proximos;
      navegar(caminho, { replace: true, state: { tabelas: proximos } });
    },
    [navegar, caminho],
  );

  return { filtros, mudarFiltros };
}
