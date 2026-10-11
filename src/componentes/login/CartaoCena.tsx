import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './CartaoCena.module.css';

interface CartaoCenaProps {
  destaque?: boolean;
  className?: string;
  children: ReactNode;
}

interface TituloCenaProps {
  icone: LucideIcon;
  children: ReactNode;
}

export function CartaoCena({ destaque = false, className, children }: CartaoCenaProps) {
  return <div className={juntarClasses(estilos.cartao, destaque && estilos.destaque, className)}>{children}</div>;
}

export function TituloCena({ icone: Icone, children }: TituloCenaProps) {
  return (
    <span className={estilos.titulo}>
      <Icone size={14} strokeWidth={2} aria-hidden="true" />
      {children}
    </span>
  );
}
