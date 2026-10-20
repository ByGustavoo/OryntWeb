import { Ban, CircleCheck, Clock, LockKeyhole, MailWarning } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { TomSelo } from '@/componentes/ui';
import type { SituacaoConta } from '@/modelos/administracao';
import { rotuloSituacaoConta } from '@/regras/contas';

const aparencia: Record<SituacaoConta, { tom: TomSelo; icone: LucideIcon; titulo: string }> = {
  ATIVA: { tom: 'sucesso', icone: CircleCheck, titulo: 'A pessoa entra no Orynt normalmente.' },
  CONVITE_PENDENTE: { tom: 'info', icone: Clock, titulo: 'A pessoa ainda não aceitou o convite nem definiu a senha.' },
  CONVITE_EXPIRADO: { tom: 'aviso', icone: MailWarning, titulo: 'O convite venceu sem ser aceito. Reenvie para a pessoa entrar.' },
  BLOQUEADA: { tom: 'erro', icone: LockKeyhole, titulo: 'O login está bloqueado por algumas tentativas erradas seguidas.' },
  DESATIVADA: { tom: 'neutro', icone: Ban, titulo: 'A pessoa não consegue entrar até a conta ser ativada de novo.' },
};

export function SeloSituacaoConta({ situacao }: { situacao: SituacaoConta }) {
  const { tom, icone, titulo } = aparencia[situacao];
  return (
    <Selo tom={tom} icone={icone} titulo={titulo}>
      {rotuloSituacaoConta[situacao]}
    </Selo>
  );
}
