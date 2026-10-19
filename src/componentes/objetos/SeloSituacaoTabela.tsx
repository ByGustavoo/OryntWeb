import type { LucideIcon } from 'lucide-react';
import { ChartNoAxesColumn, Eraser, KeyRound, ScanLine, Snowflake } from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { SituacaoTabela } from '@/modelos/objetos';
import { rotuloSituacaoTabela, tomDaSituacao } from '@/regras/tabelas';

export const iconeDaSituacaoTabela: Record<SituacaoTabela, LucideIcon> = {
  IDADE_ALTA: Snowflake,
  PRECISA_VACUUM: Eraser,
  LIDA_INTEIRA: ScanLine,
  ESTATISTICAS_DESATUALIZADAS: ChartNoAxesColumn,
  SEM_CHAVE_PRIMARIA: KeyRound,
};

export function SeloSituacaoTabela({ situacao }: { situacao: SituacaoTabela }) {
  return (
    <Selo tom={tomDaSituacao(situacao)} icone={iconeDaSituacaoTabela[situacao]}>
      {rotuloSituacaoTabela[situacao]}
    </Selo>
  );
}
