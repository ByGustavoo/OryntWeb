import type { LucideIcon } from 'lucide-react';
import { CalendarClock, CircleDashed, CircleSlash2, Gauge, LockKeyholeOpen, ShieldAlert, UserRound, UsersRound } from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { PapelDTO, SituacaoPapel, TipoPapel } from '@/modelos/papeis';
import { rotuloDaSituacaoDoPapel, rotuloTipoPapel, tomDaSituacaoPapel } from '@/regras/papeis';
import type { ContextoDosPapeis } from '@/regras/papeis';

export const iconeDaSituacaoPapel: Record<SituacaoPapel, LucideIcon> = {
  SUPERUSUARIO: ShieldAlert,
  VALIDADE_DA_SENHA: CalendarClock,
  SENHA_MD5: LockKeyholeOpen,
  PERTO_DO_LIMITE: Gauge,
  SEM_USO: CircleSlash2,
  GRUPO_VAZIO: CircleDashed,
};

export const iconeDoTipoPapel: Record<TipoPapel, LucideIcon> = {
  USUARIO: UserRound,
  GRUPO: UsersRound,
};

interface SeloSituacaoPapelProps {
  situacao: SituacaoPapel;
  papel: PapelDTO;
  contexto: ContextoDosPapeis;
}

export function SeloSituacaoPapel({ situacao, papel, contexto }: SeloSituacaoPapelProps) {
  return (
    <Selo tom={tomDaSituacaoPapel(situacao, papel, contexto)} icone={iconeDaSituacaoPapel[situacao]}>
      {rotuloDaSituacaoDoPapel(situacao, papel, contexto)}
    </Selo>
  );
}

export function SeloTipoPapel({ tipo }: { tipo: TipoPapel }) {
  return (
    <Selo tom="neutro" icone={iconeDoTipoPapel[tipo]}>
      {rotuloTipoPapel[tipo]}
    </Selo>
  );
}
