import { useCallback, useMemo, useState } from 'react';
import type { EscolhaDePermissoes } from '@/componentes/administracao/EditorDePermissoes';
import type { CodigoPermissao, ContaDTO, PerfilConta } from '@/modelos/administracao';
import type { DiferencaDePermissoes } from '@/regras/permissoesConta';
import {
  CATALOGO_DE_PERMISSOES,
  diferencaDePermissoes,
  marcarPermissao,
  motivoDoBloqueioDaPermissao,
  normalizarPermissoes,
  permissoesAoTrocarDePerfil,
} from '@/regras/permissoesConta';

type Ator = { id: string; permissoes: readonly CodigoPermissao[] };

export interface EscolhaEmEdicao {
  escolha: EscolhaDePermissoes;
  mudou: boolean;
  diferenca: DiferencaDePermissoes;
  foraDoAlcance: CodigoPermissao[];
  bloqueio: (codigo: CodigoPermissao, marcada: boolean) => string | null;
  marcar: (codigo: CodigoPermissao, marcada: boolean) => void;
  trocarPerfil: (perfil: PerfilConta) => void;
  voltarAoPerfil: () => void;
  descartar: () => void;
}

export function useEscolhaDePermissoes(
  ator: Ator | null,
  alvo: ContaDTO | null,
  contas: readonly ContaDTO[],
  inicial: EscolhaDePermissoes,
): EscolhaEmEdicao {
  const [escolha, setEscolha] = useState<EscolhaDePermissoes>(inicial);
  const [foraDoAlcance, setForaDoAlcance] = useState<CodigoPermissao[]>([]);

  const bloqueio = useCallback(
    (codigo: CodigoPermissao, marcada: boolean) => (ator ? motivoDoBloqueioDaPermissao(ator, alvo, contas, codigo, marcada) : null),
    [ator, alvo, contas],
  );

  const travadas = useMemo(
    () => CATALOGO_DE_PERMISSOES.filter((codigo) => (alvo?.permissoes.includes(codigo) ?? false) && bloqueio(codigo, true) !== null),
    [alvo, bloqueio],
  );

  const marcar = useCallback(
    (codigo: CodigoPermissao, marcada: boolean) => {
      setEscolha((atual) => ({
        ...atual,
        permissoes: normalizarPermissoes([...marcarPermissao(atual.permissoes, codigo, marcada), ...travadas]),
      }));
    },
    [travadas],
  );

  const trocarPerfil = useCallback(
    (perfil: PerfilConta) => {
      const { permissoes, foraDoAlcance: fora } = permissoesAoTrocarDePerfil(ator ?? { permissoes: [] }, alvo, perfil);
      setEscolha({ perfil, permissoes: normalizarPermissoes([...permissoes, ...travadas]) });
      setForaDoAlcance(fora);
    },
    [ator, alvo, travadas],
  );

  const voltarAoPerfil = useCallback(() => trocarPerfil(escolha.perfil), [trocarPerfil, escolha.perfil]);

  const descartar = useCallback(() => {
    setEscolha(inicial);
    setForaDoAlcance([]);
  }, [inicial]);

  const diferenca = useMemo(() => diferencaDePermissoes(inicial.permissoes, escolha.permissoes), [inicial.permissoes, escolha.permissoes]);
  const mudou = escolha.perfil !== inicial.perfil || diferenca.concedidas.length > 0 || diferenca.revogadas.length > 0;

  return { escolha, mudou, diferenca, foraDoAlcance, bloqueio, marcar, trocarPerfil, voltarAoPerfil, descartar };
}
