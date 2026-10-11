import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './IndicadorGiratorio.module.css';

export interface IndicadorGiratorioProps {
  tamanho?: number;
  rotulo?: string;
  className?: string;
}

export function IndicadorGiratorio({ tamanho = 16, rotulo, className }: IndicadorGiratorioProps) {
  return (
    <span
      className={juntarClasses(estilos.indicador, className)}
      style={{ width: tamanho, height: tamanho }}
      role={rotulo ? 'status' : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
    >
      <svg viewBox="0 0 24 24" fill="none" width={tamanho} height={tamanho}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.22" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}
