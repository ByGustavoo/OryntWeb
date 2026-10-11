import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './MarcaOrynt.module.css';

interface MarcaOryntProps {
  tamanho?: number;
  animada?: boolean;
  className?: string;
}

const CORPO = 'M15 2A15 15 0 1 0 30 17H23A8 8 0 1 1 15 9Z';
const FATIA = 'M17 0A15 15 0 0 1 32 15H25A8 8 0 0 0 17 7Z';

export function MarcaOrynt({ tamanho = 32, animada = false, className }: MarcaOryntProps) {
  return (
    <svg
      className={juntarClasses(estilos.marca, animada && estilos.animada, className)}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <path className={estilos.corpo} d={CORPO} />
      <path className={estilos.fatia} d={FATIA} />
    </svg>
  );
}
