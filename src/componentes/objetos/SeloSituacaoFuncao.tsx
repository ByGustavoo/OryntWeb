import type { LucideIcon } from 'lucide-react';
import { CircleSlash2, Hourglass, ListChecks, ShieldAlert, SquareFunction, Zap } from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { SituacaoFuncao, TipoFuncao } from '@/modelos/objetos';
import { rotuloSituacaoFuncao, rotuloTipoFuncao, tomDaSituacaoFuncao } from '@/regras/funcoes';

export const iconeDaSituacaoFuncao: Record<SituacaoFuncao, LucideIcon> = {
  RISCO_DE_SEGURANCA: ShieldAlert,
  PESADA: Hourglass,
  SEM_CHAMADAS: CircleSlash2,
};

export const iconeDoTipoFuncao: Record<TipoFuncao, LucideIcon> = {
  FUNCAO: SquareFunction,
  PROCEDIMENTO: ListChecks,
  GATILHO: Zap,
};

export function SeloSituacaoFuncao({ situacao }: { situacao: SituacaoFuncao }) {
  return (
    <Selo tom={tomDaSituacaoFuncao(situacao)} icone={iconeDaSituacaoFuncao[situacao]}>
      {rotuloSituacaoFuncao[situacao]}
    </Selo>
  );
}

export function SeloTipoFuncao({ tipo }: { tipo: TipoFuncao }) {
  return (
    <Selo tom="neutro" icone={iconeDoTipoFuncao[tipo]}>
      {rotuloTipoFuncao[tipo]}
    </Selo>
  );
}
