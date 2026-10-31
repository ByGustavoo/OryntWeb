import { AlarmClock, Ban, CircleCheck, CirclePause, CircleSlash2, LoaderCircle, OctagonX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { TomSelo } from '@/componentes/ui';
import type { SituacaoAgendamento, SituacaoExecucao } from '@/modelos/backup';
import { rotuloSituacaoAgendamento, rotuloSituacaoExecucao } from '@/regras/backup';

const aparenciaDaExecucao: Record<SituacaoExecucao, { tom: TomSelo; icone: LucideIcon }> = {
  CONCLUIDO: { tom: 'sucesso', icone: CircleCheck },
  FALHOU: { tom: 'erro', icone: OctagonX },
  CANCELADO: { tom: 'neutro', icone: Ban },
  EM_ANDAMENTO: { tom: 'info', icone: LoaderCircle },
};

const aparenciaDoAgendamento: Record<SituacaoAgendamento, { tom: TomSelo; icone: LucideIcon; titulo: string }> = {
  ATIVO: { tom: 'sucesso', icone: CircleCheck, titulo: 'Avisa na frequência configurada, com o Orynt aberto.' },
  INATIVO: { tom: 'neutro', icone: CirclePause, titulo: 'Desativado: não avisa até ser ativado de novo.' },
  ATRASADO: { tom: 'aviso', icone: AlarmClock, titulo: 'A hora passou e o backup não foi feito.' },
  SEM_CONEXAO: { tom: 'erro', icone: CircleSlash2, titulo: 'A conexão foi excluída. Edite o agendamento e escolha outra.' },
};

export function SeloSituacaoExecucao({ situacao, progresso }: { situacao: SituacaoExecucao; progresso?: number | null }) {
  const { tom, icone } = aparenciaDaExecucao[situacao];
  return (
    <Selo tom={tom} icone={icone}>
      {rotuloSituacaoExecucao[situacao]}
      {situacao === 'EM_ANDAMENTO' && progresso !== undefined && progresso !== null ? ` ${progresso}%` : ''}
    </Selo>
  );
}

export function SeloSituacaoAgendamento({ situacao }: { situacao: SituacaoAgendamento }) {
  const { tom, icone, titulo } = aparenciaDoAgendamento[situacao];
  return (
    <Selo tom={tom} icone={icone} titulo={titulo}>
      {rotuloSituacaoAgendamento[situacao]}
    </Selo>
  );
}
