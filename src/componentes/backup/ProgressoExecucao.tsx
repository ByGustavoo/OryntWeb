import type { ExecucaoBackupDTO } from '@/modelos/backup';
import { descreverPasso } from '@/regras/acompanhamentoBackup';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './ProgressoExecucao.module.css';

export function ProgressoExecucao({ execucao, className }: { execucao: Pick<ExecucaoBackupDTO, 'nome' | 'progresso' | 'etapa'>; className?: string }) {
  const { progresso } = execucao;
  const medido = progresso !== null;
  return (
    <div
      className={juntarClasses(estilos.trilho, !medido && estilos.indeterminado, className)}
      role="progressbar"
      aria-label={`Progresso de ${execucao.nome}`}
      aria-valuemin={medido ? 0 : undefined}
      aria-valuemax={medido ? 100 : undefined}
      aria-valuenow={medido ? progresso : undefined}
      aria-valuetext={medido ? `${progresso}% concluído` : descreverPasso(execucao)}
    >
      <span className={estilos.preenchimento} style={medido ? { transform: `scaleX(${progresso / 100})` } : undefined} />
    </div>
  );
}
