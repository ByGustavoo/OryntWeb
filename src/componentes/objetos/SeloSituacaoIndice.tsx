import type { LucideIcon } from 'lucide-react';
import { CopyMinus, CopyX, EyeOff, Hourglass, OctagonAlert } from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { TomSelo } from '@/componentes/ui/Selo';
import type { SituacaoIndice } from '@/modelos/objetos';
import { rotuloSituacaoIndice } from '@/regras/indices';

type SituacaoComSelo = Exclude<SituacaoIndice, 'EM_USO' | 'GARANTE_UNICIDADE'>;

const aparencia: Record<SituacaoComSelo, { tom: TomSelo; icone: LucideIcon }> = {
  INVALIDO: { tom: 'erro', icone: OctagonAlert },
  DUPLICADO: { tom: 'aviso', icone: CopyX },
  REDUNDANTE: { tom: 'aviso', icone: CopyMinus },
  SEM_USO: { tom: 'aviso', icone: EyeOff },
  EM_OBSERVACAO: { tom: 'info', icone: Hourglass },
};

export function temSelo(situacao: SituacaoIndice): situacao is SituacaoComSelo {
  return situacao !== 'EM_USO' && situacao !== 'GARANTE_UNICIDADE';
}

export function SeloSituacaoIndice({ situacao, titulo }: { situacao: SituacaoComSelo; titulo?: string }) {
  const { tom, icone } = aparencia[situacao];
  return (
    <Selo tom={tom} icone={icone} titulo={titulo}>
      {rotuloSituacaoIndice[situacao]}
    </Selo>
  );
}

export const iconeDaSituacao: Record<SituacaoComSelo, LucideIcon> = {
  INVALIDO: aparencia.INVALIDO.icone,
  DUPLICADO: aparencia.DUPLICADO.icone,
  REDUNDANTE: aparencia.REDUNDANTE.icone,
  SEM_USO: aparencia.SEM_USO.icone,
  EM_OBSERVACAO: aparencia.EM_OBSERVACAO.icone,
};
