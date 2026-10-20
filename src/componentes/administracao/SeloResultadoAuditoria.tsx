import { CircleCheck, OctagonX, ShieldBan } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { TomSelo } from '@/componentes/ui';
import type { ResultadoAuditoria } from '@/modelos/administracao';
import { rotuloResultadoAuditoria } from '@/regras/auditoria';

const aparencia: Record<ResultadoAuditoria, { tom: TomSelo; icone: LucideIcon; titulo: string }> = {
  SUCESSO: { tom: 'sucesso', icone: CircleCheck, titulo: 'A operação foi feita.' },
  FALHA: { tom: 'aviso', icone: OctagonX, titulo: 'A operação foi tentada e não deu certo.' },
  NEGADO: { tom: 'erro', icone: ShieldBan, titulo: 'A conta não tinha permissão, e o servidor recusou.' },
};

export function SeloResultadoAuditoria({ resultado }: { resultado: ResultadoAuditoria }) {
  const { tom, icone, titulo } = aparencia[resultado];
  return (
    <Selo tom={tom} icone={icone} titulo={titulo}>
      {rotuloResultadoAuditoria[resultado]}
    </Selo>
  );
}
