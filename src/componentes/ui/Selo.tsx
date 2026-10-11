import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './Selo.module.css';

export type TomSelo = 'neutro' | 'destaque' | 'sucesso' | 'aviso' | 'erro' | 'info';

export interface SeloProps {
  tom?: TomSelo;
  corTexto?: string;
  corFundo?: string;
  icone?: LucideIcon;
  ponto?: boolean;
  tachado?: boolean;
  children: ReactNode;
  className?: string;
  titulo?: string;
}

export function Selo({
  tom = 'neutro',
  corTexto,
  corFundo,
  icone: Icone,
  ponto = false,
  tachado = false,
  children,
  className,
  titulo,
}: SeloProps) {
  const estiloPersonalizado =
    corTexto || corFundo
      ? ({ '--selo-texto': corTexto, '--selo-fundo': corFundo } as CSSProperties)
      : undefined;

  return (
    <span
      className={juntarClasses(estilos.selo, !estiloPersonalizado && estilos[tom], tachado && estilos.tachado, className)}
      style={estiloPersonalizado}
      title={titulo}
    >
      {Icone ? <Icone size={12} strokeWidth={2.5} aria-hidden="true" /> : null}
      {ponto && !Icone ? <span className={estilos.ponto} aria-hidden="true" /> : null}
      <span className={estilos.texto}>{children}</span>
    </span>
  );
}
