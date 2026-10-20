import { useMemo, useState } from 'react';
import { indexarPermissoes } from '@/regras/permissoes';
import type { IndiceDasPermissoes } from '@/regras/permissoes';
import { servicoUsuarios } from '@/servicos';
import { useDadosAssincronos } from './useDadosAssincronos';

export interface PermissoesSobDemanda {
  indice: IndiceDasPermissoes | null;
  carregando: boolean;
  falhou: boolean;
  recarregar: () => void;
}

export function usePermissoesSobDemanda(pedidas: boolean): PermissoesSobDemanda {
  const [pedir, setPedir] = useState(false);
  if (pedidas && !pedir) setPedir(true);

  const resultado = useDadosAssincronos(
    (signal) => (pedir ? servicoUsuarios.listarPermissoes(signal) : Promise.resolve(null)),
    [pedir],
  );
  const indice = useMemo(() => (resultado.dados ? indexarPermissoes(resultado.dados) : null), [resultado.dados]);

  return {
    indice,
    carregando: indice === null && resultado.erro === null,
    falhou: resultado.erro !== null,
    recarregar: resultado.recarregar,
  };
}
