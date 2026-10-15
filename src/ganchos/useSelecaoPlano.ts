import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SelecaoPlano } from '@/modelos/planos';
import { lerSelecaoDoPlano } from '@/regras/planoExecucao';
import { caminhos } from '@/rotas/caminhos';

interface SelecaoDaTela {
  selecao: SelecaoPlano;
  mudarSelecao: (mudanca: Partial<SelecaoPlano>) => void;
}

function lerSelecaoGuardada(estado: unknown): unknown {
  if (!estado || typeof estado !== 'object') return null;
  return (estado as { plano?: unknown }).plano;
}

export function useSelecaoPlano(): SelecaoDaTela {
  const localizacao = useLocation();
  const navegar = useNavigate();

  const guardado = lerSelecaoGuardada(localizacao.state);
  const selecao = useMemo(() => lerSelecaoDoPlano(guardado), [guardado]);
  const selecaoAtual = useRef(selecao);
  selecaoAtual.current = selecao;

  const mudarSelecao = useCallback(
    (mudanca: Partial<SelecaoPlano>) => {
      const proxima = lerSelecaoDoPlano({ ...selecaoAtual.current, ...mudanca });
      selecaoAtual.current = proxima;
      navegar(caminhos.consultasPlanos, { replace: true, state: { plano: proxima } });
    },
    [navegar],
  );

  return { selecao, mudarSelecao };
}
