import type { LucideIcon } from 'lucide-react';
import { CircleDot, CirclePause, Cog, Hourglass, Lock, LockKeyhole, Moon, Play, Timer, Undo2 } from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { TomSelo } from '@/componentes/ui';
import type { EstadoExibido, SituacaoSessao } from '@/modelos/sessoes';
import { descricaoEstadoExibido, rotuloEstadoExibido, rotuloSituacaoSessao, tomDaSituacaoSessao } from '@/regras/sessoes';

export const iconeDaSituacaoSessao: Record<SituacaoSessao, LucideIcon> = {
  BLOQUEANDO: LockKeyhole,
  ESPERANDO_BLOQUEIO: Hourglass,
  OCIOSA_EM_TRANSACAO: CirclePause,
  CONSULTA_LONGA: Timer,
  TRANSACAO_LONGA: Undo2,
};

export const iconeDoEstado: Record<EstadoExibido, LucideIcon> = {
  ATIVA: Play,
  ESPERANDO: Lock,
  OCIOSA_EM_TRANSACAO: CirclePause,
  OCIOSA: Moon,
  OUTRO: Cog,
};

const tomDoEstado: Record<EstadoExibido, TomSelo> = {
  ATIVA: 'sucesso',
  ESPERANDO: 'erro',
  OCIOSA_EM_TRANSACAO: 'aviso',
  OCIOSA: 'neutro',
  OUTRO: 'neutro',
};

export function SeloSituacaoSessao({ situacao }: { situacao: SituacaoSessao }) {
  return (
    <Selo tom={tomDaSituacaoSessao(situacao)} icone={iconeDaSituacaoSessao[situacao]}>
      {rotuloSituacaoSessao[situacao]}
    </Selo>
  );
}

export function SeloEstadoSessao({ estado }: { estado: EstadoExibido }) {
  return (
    <Selo tom={tomDoEstado[estado]} icone={iconeDoEstado[estado]} titulo={descricaoEstadoExibido[estado]}>
      {rotuloEstadoExibido[estado]}
    </Selo>
  );
}

export function SeloOrynt() {
  return (
    <Selo tom="destaque" icone={CircleDot} titulo="A sessão com que o Orynt tirou este retrato">
      Orynt
    </Selo>
  );
}
