import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FiltrosPermissoes } from '@/modelos/permissoes';
import { aplicarMudancaPermissoes, lerFiltrosPermissoes, lerIdDoObjetoPermissao, lerSujeito } from '@/regras/permissoes';

interface FiltrosDaTela {
  filtros: FiltrosPermissoes;
  mudarFiltros: (mudanca: Partial<FiltrosPermissoes>) => void;
}

function lerFiltrosGuardados(estado: unknown): unknown {
  if (!estado || typeof estado !== 'object') return null;
  return (estado as { permissoes?: unknown }).permissoes;
}

export function lerLinhaDaChegada(estado: unknown): string | null {
  if (!estado || typeof estado !== 'object') return null;
  const abrir = (estado as { abrir?: unknown }).abrir;
  return lerSujeito(abrir) ?? lerIdDoObjetoPermissao(abrir);
}

export function useFiltrosPermissoes(caminho: string): FiltrosDaTela {
  const localizacao = useLocation();
  const navegar = useNavigate();

  const guardado = lerFiltrosGuardados(localizacao.state);
  const filtros = useMemo(() => lerFiltrosPermissoes(guardado), [guardado]);
  const filtrosAtuais = useRef(filtros);
  filtrosAtuais.current = filtros;

  const mudarFiltros = useCallback(
    (mudanca: Partial<FiltrosPermissoes>) => {
      const proximos = aplicarMudancaPermissoes(filtrosAtuais.current, mudanca);
      filtrosAtuais.current = proximos;
      navegar(caminho, { replace: true, state: { permissoes: proximos } });
    },
    [navegar, caminho],
  );

  return { filtros, mudarFiltros };
}
