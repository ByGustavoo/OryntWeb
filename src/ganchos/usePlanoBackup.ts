import { useCallback, useState } from 'react';
import type { AgendamentoBackupDTO } from '@/modelos/backup';
import { useConexao } from '@/provedores/ProvedorConexao';
import { camposDoAgendamento, camposPlanoIniciais, nomeDaCopia } from '@/regras/backup';
import type { CamposPlano, QuandoExecutar } from '@/regras/backup';

export type ModoDoPlano = 'NOVO' | 'AGENDAR' | 'EDITAR' | 'DUPLICAR';

export interface PlanoAberto {
  vez: number;
  aberto: boolean;
  modo: ModoDoPlano;
  inicial: CamposPlano;
  agendamentoId: string | null;
}

export function usePlanoBackup() {
  const { conexao, salvas } = useConexao();
  const [plano, setPlano] = useState<PlanoAberto | null>(null);
  const conexaoInicial = conexao?.id ?? salvas[0]?.id ?? null;

  const abrir = useCallback((modo: ModoDoPlano, inicial: CamposPlano, agendamentoId: string | null = null) => {
    setPlano((atual) => ({ vez: (atual?.vez ?? 0) + 1, aberto: true, modo, inicial, agendamentoId }));
  }, []);

  const abrirNovo = useCallback(
    (quando: QuandoExecutar = 'AGORA') =>
      abrir(quando === 'AGORA' ? 'NOVO' : 'AGENDAR', { ...camposPlanoIniciais, conexaoId: conexaoInicial, quando }),
    [abrir, conexaoInicial],
  );

  const abrirEdicao = useCallback((agendamento: AgendamentoBackupDTO) => abrir('EDITAR', camposDoAgendamento(agendamento), agendamento.id), [abrir]);

  const abrirDuplicata = useCallback(
    (agendamento: AgendamentoBackupDTO) => abrir('DUPLICAR', camposDoAgendamento(agendamento, nomeDaCopia(agendamento.nome))),
    [abrir],
  );

  const fechar = useCallback(() => setPlano((atual) => (atual ? { ...atual, aberto: false } : atual)), []);

  return { plano, abrirNovo, abrirEdicao, abrirDuplicata, fechar };
}
