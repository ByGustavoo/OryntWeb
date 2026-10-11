import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { IndicadorGiratorio } from './IndicadorGiratorio';
import estilos from './BotaoIcone.module.css';

export interface BotaoIconeProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icone: LucideIcon;
  rotulo: string;
  variante?: 'terciario' | 'secundario';
  tamanho?: 'sm' | 'md';
  carregando?: boolean;
  mostrarDica?: boolean;
}

export const BotaoIcone = forwardRef<HTMLButtonElement, BotaoIconeProps>(function BotaoIcone(
  {
    icone: Icone,
    rotulo,
    variante = 'terciario',
    tamanho = 'md',
    carregando = false,
    mostrarDica = true,
    type = 'button',
    className,
    disabled,
    ...resto
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={rotulo}
      title={mostrarDica ? rotulo : undefined}
      className={juntarClasses(estilos.botao, estilos[variante], estilos[tamanho], className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando ? <IndicadorGiratorio tamanho={16} /> : <Icone size={18} strokeWidth={2} aria-hidden="true" />}
    </button>
  );
});
