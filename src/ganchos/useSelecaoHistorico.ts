import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SelecaoHistorico } from '@/modelos/consultas';
import { lerSelecao } from '@/regras/historicoConsulta';

interface SelecaoDaTela {
  selecao: SelecaoHistorico;
  mudarSelecao: (mudanca: Partial<SelecaoHistorico>) => void;
}

function lerSelecaoGuardada(estado: unknown): unknown {
  if (!estado || typeof estado !== 'object') return null;
  return (estado as { historico?: unknown }).historico;
}

export function useSelecaoHistorico(caminho: string): SelecaoDaTela {
  const localizacao = useLocation();
  const navegar = useNavigate();

  const guardado = lerSelecaoGuardada(localizacao.state);
  const selecao = useMemo(() => lerSelecao(guardado), [guardado]);
  const selecaoAtual = useRef(selecao);
  selecaoAtual.current = selecao;

  const mudarSelecao = useCallback(
    (mudanca: Partial<SelecaoHistorico>) => {
      const proxima = lerSelecao({ ...selecaoAtual.current, ...mudanca });
      selecaoAtual.current = proxima;
      navegar(caminho, { replace: true, state: { historico: proxima } });
    },
    [navegar, caminho],
  );

  return { selecao, mudarSelecao };
}
