import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Info } from 'lucide-react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './Nota.module.css';

export type TomNota = 'neutro' | 'info' | 'aviso' | 'sucesso' | 'erro';

export interface NotaProps extends HTMLAttributes<HTMLDivElement> {
  tom?: TomNota;
  icone?: LucideIcon;
  titulo?: string;
  children: ReactNode;
}

export const Nota = forwardRef<HTMLDivElement, NotaProps>(function Nota(
  { tom = 'neutro', icone: Icone = Info, titulo, children, className, ...resto },
  ref,
) {
  return (
    <div ref={ref} className={juntarClasses(estilos.nota, estilos[tom], className)} {...resto}>
      <Icone size={16} strokeWidth={2} aria-hidden="true" className={estilos.icone} />
      <p className={estilos.texto}>
        {titulo ? <strong className={estilos.titulo}>{titulo} </strong> : null}
        {children}
      </p>
    </div>
  );
});
