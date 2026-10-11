import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './MarcaOrynt.module.css';

interface MarcaOryntProps {
  tamanho?: number;
  animada?: boolean;
  className?: string;
}

const CORPO = 'M47.5 33.8A17 17 0 1 1 30.2 16.5';
const FATIA = 'M35.52 13.03A17 17 0 0 1 50.97 28.48';

export function MarcaOrynt({ tamanho = 32, animada = false, className }: MarcaOryntProps) {
  return (
    <svg
      className={juntarClasses(estilos.marca, animada && estilos.animada, className)}
      width={tamanho}
      height={tamanho}
      viewBox="7 6.5 50.5 50.5"
      aria-hidden="true"
      focusable="false"
    >
      <path className={estilos.corpo} d={CORPO} />
      <path className={estilos.fatia} d={FATIA} />
    </svg>
  );
}
