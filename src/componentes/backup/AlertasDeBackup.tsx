import { AlarmClock, OctagonX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PontosDeAtencao } from '@/componentes/objetos/PontosDeAtencao';
import type { ItemDeAtencao, VarianteDosPontos } from '@/componentes/objetos/PontosDeAtencao';
import type { AlertaBackupDTO } from '@/modelos/backup';
import { useBackupLocal } from '@/provedores/ProvedorBackupLocal';
import { textoDoAlerta, tituloDoAlerta } from '@/regras/backup';
import { caminhos } from '@/rotas/caminhos';

interface AlertasDeBackupProps {
  alertas: AlertaBackupDTO[];
  variante?: VarianteDosPontos;
}

export function AlertasDeBackup({ alertas, variante = 'painel' }: AlertasDeBackupProps) {
  const navegar = useNavigate();
  const { fazerAgendamento } = useBackupLocal();
  if (alertas.length === 0) return null;

  const seguir = (alerta: AlertaBackupDTO) => {
    if (alerta.execucaoId) {
      navegar(caminhos.backupHistorico, { state: { historico: { situacao: 'FALHOU' }, execucaoAberta: alerta.execucaoId } });
      return;
    }
    if (alerta.agendamentoId) void fazerAgendamento({ id: alerta.agendamentoId, nome: alerta.nome });
  };

  const itens = alertas.map((alerta): ItemDeAtencao => {
    const falhou = alerta.tipo === 'ULTIMO_BACKUP_FALHOU';
    return {
      chave: alerta.id,
      tom: falhou ? 'erro' : 'aviso',
      icone: falhou ? OctagonX : AlarmClock,
      objeto: null,
      titulo: tituloDoAlerta(alerta),
      texto: textoDoAlerta(alerta),
      acao: falhou ? 'Ver o backup' : 'Fazer agora',
      rotuloDaAcao: `${falhou ? 'Ver o backup' : 'Fazer agora o backup'} ${alerta.nome}`,
      aoSeguir: () => seguir(alerta),
    };
  });

  return <PontosDeAtencao descricao="Backups que pedem atenção, dos mais urgentes aos menos urgentes" itens={itens} variante={variante} />;
}
