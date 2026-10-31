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

const DESENHO_DO_MENU: DesenhoMarca = {
  grade: 26,
  corpo: 'M12 2A12 12 0 1 0 24 14H19A7 7 0 1 1 12 7Z',
  fatia: 'M14 0A12 12 0 0 1 26 12H21A7 7 0 0 0 14 5Z',
};

const DESENHO_COMPACTO: DesenhoMarca = {
  grade: 24,
  corpo: 'M11 2A11 11 0 1 0 22 13H17A6 6 0 1 1 11 7Z',
  fatia: 'M13 0A11 11 0 0 1 24 11H19A6 6 0 0 0 13 5Z',
};

function escolherDesenho(tamanho: number): DesenhoMarca {
  if (tamanho >= DESENHO_PADRAO.grade) return DESENHO_PADRAO;
  return tamanho === DESENHO_DO_MENU.grade ? DESENHO_DO_MENU : DESENHO_COMPACTO;
}

export function MarcaOrynt({ tamanho = 32, animada = false, className }: MarcaOryntProps) {
  const desenho = escolherDesenho(tamanho);
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
