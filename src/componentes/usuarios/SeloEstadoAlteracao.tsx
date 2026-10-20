import type { LucideIcon } from 'lucide-react';
import { Ban, Check, Undo2 } from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { TomSelo } from '@/componentes/ui';
import { rotuloEstadoDaAlteracao } from '@/regras/historicoAlteracoes';
import type { EstadoDaAlteracao } from '@/regras/historicoAlteracoes';

const tomDoEstado: Record<EstadoDaAlteracao, TomSelo> = {
  APLICADA: 'sucesso',
  DESFEITA: 'neutro',
  RECUSADA: 'erro',
};

export const iconeDoEstado: Record<EstadoDaAlteracao, LucideIcon> = {
  APLICADA: Check,
  DESFEITA: Undo2,
  RECUSADA: Ban,
};

const explicacaoDoEstado: Record<EstadoDaAlteracao, string> = {
  APLICADA: 'Os comandos rodaram no banco',
  DESFEITA: 'Os comandos inversos rodaram depois',
  RECUSADA: 'O banco recusou e nada foi mudado',
};

export function SeloEstadoAlteracao({ estado }: { estado: EstadoDaAlteracao }) {
  return (
    <Selo tom={tomDoEstado[estado]} icone={iconeDoEstado[estado]} titulo={explicacaoDoEstado[estado]}>
      {rotuloEstadoDaAlteracao[estado]}
    </Selo>
  );
}
