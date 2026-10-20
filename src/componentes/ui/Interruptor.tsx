import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './Interruptor.module.css';

interface InterruptorProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'children'> {
  ligado: boolean;
  aoMudar: (ligado: boolean) => void;
  children: ReactNode;
}

export function Interruptor({ ligado, aoMudar, children, className, ...resto }: InterruptorProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      className={juntarClasses(estilos.interruptor, className)}
      onClick={() => aoMudar(!ligado)}
      {...resto}
    >
      <span className={estilos.trilho} aria-hidden="true">
        <span className={estilos.botao} />
      </span>
      <span className={estilos.rotulo}>{children}</span>
    </button>
  );
}
