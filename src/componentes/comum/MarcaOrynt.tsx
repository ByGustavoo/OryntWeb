import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './MarcaOrynt.module.css';

interface MarcaOryntProps {
  tamanho?: number;
  animada?: boolean;
  className?: string;
}

interface DesenhoMarca {
  grade: number;
  corpo: string;
  fatia: string;
}

const DESENHO_PADRAO: DesenhoMarca = {
  grade: 32,
  corpo: 'M15 2A15 15 0 1 0 30 17H23A8 8 0 1 1 15 9Z',
  fatia: 'M17 0A15 15 0 0 1 32 15H25A8 8 0 0 0 17 7Z',
};

const DESENHO_COMPACTO: DesenhoMarca = {
  grade: 24,
  corpo: 'M11 2A11 11 0 1 0 22 13H17A6 6 0 1 1 11 7Z',
  fatia: 'M13 0A11 11 0 0 1 24 11H19A6 6 0 0 0 13 5Z',
};

export function MarcaOrynt({ tamanho = 32, animada = false, className }: MarcaOryntProps) {
  const desenho = tamanho < DESENHO_PADRAO.grade ? DESENHO_COMPACTO : DESENHO_PADRAO;
  return (
    <svg
      className={juntarClasses(estilos.marca, animada && estilos.animada, className)}
      width={tamanho}
      height={tamanho}
      viewBox={`0 0 ${desenho.grade} ${desenho.grade}`}
      aria-hidden="true"
      focusable="false"
    >
      <path className={estilos.corpo} d={desenho.corpo} />
      <path className={estilos.fatia} d={desenho.fatia} />
    </svg>
  );
}
