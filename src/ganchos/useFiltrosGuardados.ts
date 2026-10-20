import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface FiltrosGuardados<T> {
  filtros: T;
  mudarFiltros: (mudanca: Partial<T>) => void;
}

function lerGuardado(estado: unknown, chave: string): unknown {
  if (!estado || typeof estado !== 'object') return null;
  return (estado as Record<string, unknown>)[chave];
}

export function useFiltrosGuardados<T>(
  caminho: string,
  chave: string,
  ler: (valor: unknown) => T,
  aplicar: (filtros: T, mudanca: Partial<T>) => T,
): FiltrosGuardados<T> {
  const localizacao = useLocation();
  const navegar = useNavigate();

  const guardado = lerGuardado(localizacao.state, chave);
  const filtros = useMemo(() => ler(guardado), [ler, guardado]);
  const filtrosAtuais = useRef(filtros);
  filtrosAtuais.current = filtros;

  const mudarFiltros = useCallback(
    (mudanca: Partial<T>) => {
      const proximos = aplicar(filtrosAtuais.current, mudanca);
      filtrosAtuais.current = proximos;
      navegar(caminho, { replace: true, state: { [chave]: proximos } });
    },
    [navegar, caminho, chave, aplicar],
  );

  return { filtros, mudarFiltros };
}
