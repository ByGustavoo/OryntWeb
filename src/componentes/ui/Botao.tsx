import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { IndicadorGiratorio } from './IndicadorGiratorio';
import estilos from './Botao.module.css';

export type VarianteBotao = 'primario' | 'secundario' | 'terciario' | 'perigo';
export type TamanhoBotao = 'sm' | 'md' | 'lg';

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  icone?: LucideIcon;
  iconeDireita?: LucideIcon;
  carregando?: boolean;
  larguraTotal?: boolean;
  children?: ReactNode;
}

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  {
    variante = 'primario',
    tamanho = 'md',
    icone: Icone,
    iconeDireita: IconeDireita,
    carregando = false,
    larguraTotal = false,
    type = 'button',
    className,
    children,
    disabled,
    onClick,
    ...resto
  },
  ref,
) {
  const tamanhoIcone = tamanho === 'lg' ? 18 : 16;

  return (
    <button
      ref={ref}
      type={type}
      className={juntarClasses(
        estilos.botao,
        estilos[variante],
        estilos[tamanho],
        larguraTotal && estilos.larguraTotal,
        carregando && estilos.carregando,
        className,
      )}
      disabled={disabled}
      aria-disabled={carregando || undefined}
      aria-busy={carregando || undefined}
      onClick={(evento) => {
        if (carregando) {
          evento.preventDefault();
          return;
        }
        onClick?.(evento);
      }}
      {...resto}
    >
      {carregando ? (
        <IndicadorGiratorio tamanho={tamanhoIcone} />
      ) : Icone ? (
        <Icone size={tamanhoIcone} strokeWidth={2} aria-hidden="true" />
      ) : null}
      {children}
      {IconeDireita && !carregando ? <IconeDireita size={tamanhoIcone} strokeWidth={2} aria-hidden="true" /> : null}
    </button>
  );
});
